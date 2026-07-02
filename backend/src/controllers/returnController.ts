import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";
import { saveCompressedImageToDir } from "../utils/imageOptimize";
import { aiService } from "../services/aiService";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { notificationTriggerService } from "../services/notificationTriggerService";
import { sendcloudApi } from "../services/sendcloud/api";
import { getSendcloudAuthHeaders } from "../services/sendcloud/api";
import { processReturnRefund } from "../services/returnRefundService";

const RETURN_WINDOW_DAYS = 30;
const ACTIVE_STATUSES = ["pending_review", "approved", "awaiting_return", "return_received"];
const REFUND_ETA_DAYS = process.env.REFUND_ETA_DAYS || "5-7";

const VALID_REASONS = [
  "damaged",
  "wrong_item",
  "defective",
  "not_as_described",
  "changed_mind",
  "other",
] as const;

function getReturnWindowStart(order: { deliveredAt: Date | null; updatedAt: Date; status: string; createdAt: Date }): Date {
  if (order.deliveredAt) return order.deliveredAt;
  if (order.status === "delivered") return order.updatedAt;
  return order.createdAt;
}

function isWithinReturnWindow(order: { deliveredAt: Date | null; updatedAt: Date; status: string; createdAt: Date }): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETURN_WINDOW_DAYS);
  return getReturnWindowStart(order) >= cutoff;
}

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

function formatReturn(record: any) {
  return {
    ...record,
    photos: Array.isArray(record.photos) ? record.photos : [],
    refundEtaDays: REFUND_ETA_DAYS,
  };
}

const returnInclude = {
  order: { include: { items: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
};

export const createReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return next(new AppError("Not authenticated", 401));

    const { orderId, reason, customerNote } = req.body;
    if (!orderId || !reason) {
      return next(new AppError("Order ID and return reason are required", 400));
    }
    if (!VALID_REASONS.includes(reason)) {
      return next(new AppError("Invalid return reason", 400));
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, returnRequests: true },
    });
    if (!order) return next(new AppError("Order not found", 404));
    if (order.status !== "delivered") {
      return next(new AppError("Only delivered orders can be returned", 400));
    }
    if (!isWithinReturnWindow(order)) {
      return next(new AppError(`Return window is ${RETURN_WINDOW_DAYS} days from delivery date`, 400));
    }

    const activeReturn = order.returnRequests.find((r) => ACTIVE_STATUSES.includes(r.status));
    if (activeReturn) {
      return next(new AppError("This order already has an active return request", 400));
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return next(new AppError("Please upload at least one photo of the product", 400));
    }

    const returnsDir = path.join(__dirname, "../../public/uploads/returns");
    const urlPrefix = "/uploads/returns";
    if (!fs.existsSync(returnsDir)) fs.mkdirSync(returnsDir, { recursive: true });

    const photoUrls: string[] = [];
    for (const file of files.slice(0, 5)) {
      const saved = await saveCompressedImageToDir(
        file.buffer,
        returnsDir,
        urlPrefix,
        `return-${order.orderNumber}`,
      );
      photoUrls.push(saved.publicPath);
    }

    let aiResult = {
      aiFraudScore: null as number | null,
      aiSummary: "AI analysis skipped — configure GOOGLE_API_KEY for automatic triage.",
      aiRecommendation: "needs_review",
    };

    try {
      aiResult = await aiService.analyzeReturn({
        reason,
        customerNote: customerNote || "",
        orderItems: order.items.map((i) => ({
          productName: i.productName,
          productImage: i.productImage,
          quantity: i.quantity,
        })),
        customerPhotos: files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype })),
      });
    } catch (err: any) {
      console.warn("Return AI triage failed:", err.message);
      aiResult.aiSummary = "AI analysis unavailable — manual review required.";
    }

    const returnRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          userId,
          reason,
          customerNote: customerNote?.trim() || null,
          photos: photoUrls,
          status: "pending_review",
          aiFraudScore: aiResult.aiFraudScore,
          aiSummary: aiResult.aiSummary,
          aiRecommendation: aiResult.aiRecommendation,
        },
        include: returnInclude,
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "return_requested" },
      });

      return created;
    });

    notificationTriggerService.triggerReturnNotification(returnRequest.id, "return_submitted").catch((err) => {
      console.error("[CreateReturn] Notification failed:", err.message);
    });

    res.status(201).json({ success: true, data: formatReturn(returnRequest) });
  } catch (error) {
    next(error);
  }
};

export const getMyReturns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return next(new AppError("Not authenticated", 401));

    const returns = await prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: { select: { id: true, orderNumber: true, total: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, data: returns.map(formatReturn) });
  } catch (error) {
    next(error);
  }
};

export const cancelReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return next(new AppError("Not authenticated", 401));

    const { id } = req.params;
    const existing = await prisma.returnRequest.findFirst({
      where: { id, userId },
      include: { order: true },
    });
    if (!existing) return next(new AppError("Return request not found", 404));
    if (existing.status !== "pending_review") {
      return next(new AppError("Only pending return requests can be cancelled", 400));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.returnRequest.update({
        where: { id },
        data: { status: "cancelled" },
        include: { order: { select: { id: true, orderNumber: true, total: true, status: true } } },
      });
      await tx.order.update({
        where: { id: existing.orderId },
        data: { status: "delivered" },
      });
      return record;
    });

    res.status(200).json({ success: true, data: formatReturn(updated) });
  } catch (error) {
    next(error);
  }
};

export const listReturns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && typeof status === "string" && status !== "all") {
      where.status = status;
    }

    const returns = await prisma.returnRequest.findMany({
      where,
      include: returnInclude,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, data: returns.map(formatReturn) });
  } catch (error) {
    next(error);
  }
};

export const listRefunds = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [processed, pending] = await Promise.all([
      prisma.returnRequest.findMany({
        where: {
          status: "refunded",
          OR: [
            { stripeRefundId: { not: null } },
            { refundProcessedAt: { not: null } },
          ],
        },
        include: returnInclude,
        orderBy: { refundProcessedAt: "desc" },
      }),
      prisma.returnRequest.findMany({
        where: {
          status: { in: ["approved", "awaiting_return", "return_received"] },
          stripeRefundId: null,
        },
        include: returnInclude,
        orderBy: { reviewedAt: "desc" },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: processed.map(formatReturn),
      pending: pending.map(formatReturn),
    });
  } catch (error) {
    next(error);
  }
};

export const getReturnById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const record = await prisma.returnRequest.findUnique({
      where: { id },
      include: returnInclude,
    });
    if (!record) return next(new AppError("Return request not found", 404));
    res.status(200).json({ success: true, data: formatReturn(record) });
  } catch (error) {
    next(error);
  }
};

export const approveReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body || {};

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!existing) return next(new AppError("Return request not found", 404));
    if (existing.status !== "pending_review") {
      return next(new AppError("Return request is not pending review", 400));
    }

    const order = existing.order;
    const refundAmount = order.total;
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.returnRequest.update({
        where: { id },
        data: {
          status: "approved",
          adminNote: adminNote?.trim() || null,
          refundAmount,
          reviewedAt: now,
        },
        include: returnInclude,
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "return_requested" },
      });

      return record;
    });

    notificationTriggerService.triggerReturnNotification(updated.id, "return_approved").catch((err) => {
      console.error("[ApproveReturn] Notification failed:", err.message);
    });

    res.status(200).json({ success: true, data: formatReturn(updated) });
  } catch (error: any) {
    next(error);
  }
};

export const markReturnReceived = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.returnRequest.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Return request not found", 404));
    if (existing.status !== "awaiting_return") {
      return next(new AppError("Only returns awaiting shipment can be marked as received", 400));
    }

    await prisma.returnRequest.update({
      where: { id },
      data: { itemReceivedAt: new Date(), status: "return_received" },
    });

    const updated = await processReturnRefund(id);
    res.status(200).json({ success: true, data: formatReturn(updated) });
  } catch (error: any) {
    if (error?.type === "StripeInvalidRequestError") {
      return next(new AppError(`Stripe refund failed: ${error.message}`, 400));
    }
    next(error);
  }
};

/** Admin: manually trigger Stripe refund (without waiting for Sendcloud webhook). */
export const manualProcessRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.returnRequest.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Return request not found", 404));
    if (existing.status === "refunded") {
      return next(new AppError("This return has already been refunded", 400));
    }
    if (!["approved", "awaiting_return", "return_received"].includes(existing.status)) {
      return next(new AppError("Return must be approved before a manual refund can be processed", 400));
    }

    const updated = await processReturnRefund(id, { manual: true });
    res.status(200).json({ success: true, data: formatReturn(updated) });
  } catch (error: any) {
    if (error?.type === "StripeInvalidRequestError") {
      return next(new AppError(`Stripe refund failed: ${error.message}`, 400));
    }
    next(error);
  }
};

export const rejectReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body || {};

    if (!adminNote?.trim()) {
      return next(new AppError("Please provide a reason for rejecting the return", 400));
    }

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
    });
    if (!existing) return next(new AppError("Return request not found", 404));
    if (existing.status !== "pending_review") {
      return next(new AppError("Return request is not pending review", 400));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.returnRequest.update({
        where: { id },
        data: {
          status: "rejected",
          adminNote: adminNote.trim(),
          reviewedAt: new Date(),
        },
        include: returnInclude,
      });

      await tx.order.update({
        where: { id: existing.orderId },
        data: { status: "delivered" },
      });

      return record;
    });

    notificationTriggerService.triggerReturnNotification(updated.id, "return_rejected").catch((err) => {
      console.error("[RejectReturn] Notification failed:", err.message);
    });

    res.status(200).json({ success: true, data: formatReturn(updated) });
  } catch (error) {
    next(error);
  }
};

export const createReturnShipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { shippingMethodId, weight } = req.body;

    if (!shippingMethodId) {
      return next(new AppError("Shipping method is required", 400));
    }

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!existing) return next(new AppError("Return request not found", 404));
    if (existing.status !== "approved") {
      return next(new AppError("Return label can only be created for approved returns", 400));
    }

    const order = existing.order;
    let addressData: any = {};
    try {
      addressData = JSON.parse(order.shippingAddress);
    } catch {
      addressData = {};
    }

    const fullName = `${addressData.firstName || ""} ${addressData.lastName || ""}`.trim() || order.customerName;
    const countryMap: Record<string, string> = {
      netherlands: "NL", nederland: "NL", nl: "NL",
      germany: "DE", de: "DE", belgium: "BE", be: "BE",
      france: "FR", fr: "FR", india: "IN", in: "IN",
    };
    const rawCountry = (addressData.country || "NL").toLowerCase().trim();
    const country = countryMap[rawCountry] || (addressData.country || "NL").toUpperCase().substring(0, 2);

    const parcelData: any = {
      name: fullName,
      company_name: "",
      address: addressData.street || "",
      house_number: addressData.houseNumber || "",
      city: addressData.city || "",
      postal_code: addressData.pincode || addressData.postalCode || "",
      country,
      telephone: addressData.phone || "",
      email: addressData.email || order.customerEmail,
      request_label: true,
      shipment: { id: shippingMethodId },
      weight: parseFloat(String(weight || "1")).toFixed(3),
      order_number: `${order.orderNumber}-RET`,
    };

    const result = await sendcloudApi.createParcel(parcelData);
    const trackingNumber = result.parcel?.tracking_number || "";
    const trackingUrl = result.parcel?.tracking_url || "";
    let labelUrl = "";
    if (result.parcel?.documents?.length) {
      labelUrl = result.parcel.documents[0].link;
    }
    const carrier = result.parcel?.carrier || "Sendcloud";
    const parcelId = result.parcel?.id != null ? String(result.parcel.id) : null;

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        returnCarrier: carrier,
        returnTrackingNumber: trackingNumber,
        returnTrackingUrl: trackingUrl,
        returnLabelUrl: labelUrl,
        returnShipMethodId: String(shippingMethodId),
        returnParcelId: parcelId,
        status: "awaiting_return",
      },
      include: returnInclude,
    });

    notificationTriggerService.triggerReturnNotification(updated.id, "return_label_created").catch((err) => {
      console.error("[CreateReturnShipment] Notification failed:", err.message);
    });

    res.status(200).json({ success: true, data: formatReturn(updated) });
  } catch (error) {
    next(error);
  }
};

function resolveReturnParcelId(record: {
  returnLabelUrl: string | null;
  returnParcelId: string | null;
}): string | null {
  if (record.returnParcelId) return record.returnParcelId;
  if (!record.returnLabelUrl) return null;
  const match = record.returnLabelUrl.match(/\/parcels\/(\d+)/);
  return match?.[1] ?? null;
}

async function proxyReturnLabelPdf(
  record: { returnLabelUrl: string | null; returnParcelId: string | null; order?: { orderNumber: string } | null },
  res: Response,
  next: NextFunction,
) {
  const parcelId = resolveReturnParcelId(record);
  if (!record.returnLabelUrl && !parcelId) {
    return next(new AppError("Return label not available yet", 404));
  }

  const filename = `return-label-${record.order?.orderNumber || "order"}.pdf`;

  try {
    if (parcelId) {
      const buffer = await sendcloudApi.getLabel(parcelId);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      return res.send(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
    }

    const authHeaders = getSendcloudAuthHeaders();
    const response = await fetch(record.returnLabelUrl!, {
      method: "GET",
      headers: { Authorization: authHeaders.Authorization },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return next(new AppError(`Failed to fetch label from Sendcloud: ${errorText}`, response.status));
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
}

export const downloadMyReturnLabel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return next(new AppError("Not authenticated", 401));

    const { id } = req.params;
    const record = await prisma.returnRequest.findFirst({
      where: { id, userId },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!record) return next(new AppError("Return request not found", 404));

    await proxyReturnLabelPdf(record, res, next);
  } catch (error) {
    next(error);
  }
};

export const downloadReturnLabel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const record = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!record) return next(new AppError("Return request not found", 404));

    await proxyReturnLabelPdf(record, res, next);
  } catch (error) {
    next(error);
  }
};
