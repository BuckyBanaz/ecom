import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";
import { getStripeClient, isStripeConfigured } from "../utils/stripeClient";
import { notificationTriggerService } from "./notificationTriggerService";

const REFUND_ETA_DAYS = process.env.REFUND_ETA_DAYS || "5-7";

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function computeRefundExpectedAt(from: Date = new Date()): Date {
  const maxDays = parseInt(String(REFUND_ETA_DAYS).split("-").pop() || "7", 10);
  return addBusinessDays(from, maxDays);
}

const returnInclude = {
  order: { include: { items: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
};

type LockedReturnRow = {
  id: string;
  status: string;
  stripe_refund_id: string | null;
  refund_amount: number | null;
  item_received_at: Date | null;
  return_shipment_status: string | null;
  order_id: string;
};

type PrismaTx = Prisma.TransactionClient;

async function lockReturnRequestInTx(tx: PrismaTx, returnId: string): Promise<LockedReturnRow | null> {
  const rows = await tx.$queryRaw<LockedReturnRow[]>`
    SELECT
      id,
      status,
      stripe_refund_id,
      refund_amount,
      item_received_at,
      return_shipment_status,
      order_id
    FROM return_requests
    WHERE id = ${returnId}::uuid
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

/**
 * Process Stripe refund after the return parcel is received at the warehouse.
 * Idempotent when already refunded.
 * @param manual — admin override: allows refund on approved/awaiting_return without waiting for webhook
 */
export async function processReturnRefund(returnId: string, options?: { manual?: boolean }) {
  const manual = options?.manual === true;
  const allowedStatuses = manual
    ? ["approved", "awaiting_return", "return_received"]
    : ["awaiting_return", "return_received"];

  const locked = await prisma.$transaction(async (tx) => {
    const current = await lockReturnRequestInTx(tx, returnId);
    if (!current) {
      throw new AppError("Return request not found", 404);
    }

    if (current.status === "refunded" || current.stripe_refund_id) {
      return { alreadyDone: true as const };
    }

    if (!allowedStatuses.includes(current.status)) {
      throw new AppError(
        manual
          ? "Manual refund requires an approved return (create a label first unless overriding early)"
          : "Refund can only be processed after the return label is created and item is received",
        400,
      );
    }

    if (current.return_shipment_status === "refund_processing") {
      throw new AppError("Refund is already being processed for this return", 409);
    }

    await tx.returnRequest.update({
      where: { id: returnId },
      data: { returnShipmentStatus: "refund_processing" },
    });

    return { alreadyDone: false as const, current };
  });

  if (locked.alreadyDone) {
    const existing = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: returnInclude,
    });
    if (!existing) throw new AppError("Return request not found", 404);
    return existing;
  }

  const existing = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: { order: true },
  });
  if (!existing) {
    throw new AppError("Return request not found", 404);
  }

  const order = existing.order;
  const refundAmount = existing.refundAmount ?? order.total;
  const now = new Date();
  const refundExpectedAt = computeRefundExpectedAt(now);
  let stripeRefundId = existing.stripeRefundId;
  const previousShipmentStatus = existing.returnShipmentStatus;

  try {
    if (!stripeRefundId && order.stripePaymentId) {
      if (!isStripeConfigured()) {
        throw new AppError("Stripe is not configured — cannot process refund", 500);
      }
      const stripe = getStripeClient();
      const amountCents = Math.round(refundAmount * 100);

      const existingRefunds = await stripe.refunds.list({
        payment_intent: order.stripePaymentId,
        limit: 10,
      });
      const succeeded = existingRefunds.data.filter((r) => r.status === "succeeded" || r.status === "pending");
      const totalRefundedCents = succeeded.reduce((sum, r) => sum + (r.amount || 0), 0);

      if (totalRefundedCents >= amountCents && succeeded.length > 0) {
        stripeRefundId = succeeded[0].id;
        console.log(`[ProcessReturnRefund] Reusing existing Stripe refund ${stripeRefundId} for PI ${order.stripePaymentId}`);
      } else {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: order.stripePaymentId,
            amount: amountCents,
          });
          stripeRefundId = refund.id;
        } catch (err: any) {
          if (err?.code === "charge_already_refunded" && succeeded.length > 0) {
            stripeRefundId = succeeded[0].id;
            console.log(`[ProcessReturnRefund] Charge already refunded — linked ${stripeRefundId}`);
          } else {
            throw err;
          }
        }
      }
    } else if (!stripeRefundId && !order.stripePaymentId) {
      throw new AppError(
        "No Stripe payment on this order — process refund manually outside the platform or add stripePaymentId",
        400,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const current = await lockReturnRequestInTx(tx, returnId);
      if (!current || current.status === "refunded") {
        return tx.returnRequest.findUnique({ where: { id: returnId }, include: returnInclude });
      }

      const record = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: "refunded",
          refundAmount,
          stripeRefundId,
          refundProcessedAt: now,
          refundExpectedAt,
          itemReceivedAt: existing.itemReceivedAt ?? now,
          returnShipmentStatus:
            previousShipmentStatus && previousShipmentStatus !== "refund_processing"
              ? previousShipmentStatus
              : manual
                ? "Received at warehouse (manual)"
                : "Delivered — received at warehouse",
        },
        include: returnInclude,
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "returned", paymentStatus: "refunded" },
      });

      return record;
    });

    if (!updated) {
      throw new AppError("Return request not found after refund", 500);
    }

    notificationTriggerService.triggerReturnNotification(updated.id, "return_refund_processed").catch((err) => {
      console.error("[ProcessReturnRefund] Notification failed:", err.message);
    });

    return updated;
  } catch (error) {
    await prisma.returnRequest.updateMany({
      where: {
        id: returnId,
        status: { not: "refunded" },
        returnShipmentStatus: "refund_processing",
      },
      data: {
        returnShipmentStatus: previousShipmentStatus ?? null,
      },
    });
    throw error;
  }
}

/**
 * Resolve a return request from a Sendcloud return parcel order number (e.g. ORD-123-RET).
 */
export async function findReturnByRetOrderNumber(retOrderNumber: string) {
  if (!retOrderNumber.endsWith("-RET")) return null;
  const baseOrderNumber = retOrderNumber.replace(/-RET$/, "");
  const order = await prisma.order.findUnique({ where: { orderNumber: baseOrderNumber } });
  if (!order) return null;

  return prisma.returnRequest.findFirst({
    where: {
      orderId: order.id,
      status: { in: ["approved", "awaiting_return", "return_received"] },
    },
    orderBy: { createdAt: "desc" },
    include: { order: true },
  });
}

/**
 * Update return parcel tracking from Sendcloud webhook; auto-refund when delivered to warehouse.
 */
export async function handleReturnParcelWebhook(
  retOrderNumber: string,
  statusId: number,
  statusMessage: string,
) {
  const returnRequest = await findReturnByRetOrderNumber(retOrderNumber);
  if (!returnRequest) {
    console.warn(`[Sendcloud Webhook] Return parcel ${retOrderNumber} — no matching return request`);
    return { handled: false };
  }

  await prisma.returnRequest.update({
    where: { id: returnRequest.id },
    data: { returnShipmentStatus: statusMessage },
  });

  console.log(
    `[Sendcloud Webhook] Return ${returnRequest.id} shipment status: ${statusMessage} (ID ${statusId})`,
  );

  if (statusId === 11 && returnRequest.status === "awaiting_return") {
    await prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: { itemReceivedAt: new Date(), status: "return_received" },
    });
    await processReturnRefund(returnRequest.id);
    console.log(`[Sendcloud Webhook] Return ${returnRequest.id} delivered — refund processed`);
  }

  return { handled: true, returnId: returnRequest.id };
}