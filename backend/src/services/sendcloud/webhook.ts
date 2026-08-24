import { Request, Response } from "express";
import { prisma } from "../../config/db";
import { notificationTriggerService } from "../notificationTriggerService";
import { handleReturnParcelWebhook } from "../returnRefundService";

/**
 * Handle incoming Sendcloud webhooks (e.g., parcel status changes)
 */
export const sendcloudWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["sendcloud-signature"] as string;
    const rawBody =
      Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body ?? {});
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid JSON body" });
    }

    // Sendcloud signs webhooks with HMAC-SHA256 using your API Secret Key (not a separate webhook secret).
    const webhookSecret =
      process.env.SENDCLOUD_WEBHOOK_SECRET ||
      process.env.SENDCLOUD_SECRET_KEY ||
      "";
    if (webhookSecret) {
      if (!signature) {
        console.warn("[Sendcloud Webhook] Missing Sendcloud-Signature header — rejecting request");
        return res.status(401).json({ success: false, message: "Missing webhook signature" });
      }
      const crypto = await import("crypto");
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSig) {
        console.warn("[Sendcloud Webhook] Invalid signature — possible spoofed request!");
        return res.status(401).json({ success: false, message: "Invalid webhook signature" });
      }
    } else {
      console.warn(
        "[Sendcloud Webhook] No SENDCLOUD_SECRET_KEY configured — accepting unsigned requests (set API keys in Admin → Settings → Shipping)",
      );
    }

    console.log("[Sendcloud Webhook] Received event:", payload.action, "| Parcel:", payload.parcel?.id);

    if (payload.action === "parcel_status_changed") {
      const parcel = payload.parcel;
      const statusId = parcel?.status?.id;
      const orderNumber = parcel?.order_number;

      console.log(`[Sendcloud Webhook] Parcel ${parcel.id} | Status ID: ${statusId} | Message: ${parcel.status?.message} | Order: ${orderNumber}`);

      if (!orderNumber) {
        console.warn("[Sendcloud Webhook] No order_number in parcel payload — skipping DB update");
        return res.status(200).json({ success: true, message: "No order number, skipped" });
      }

      // Return parcels use order_number suffix -RET — handle separately
      if (String(orderNumber).endsWith("-RET")) {
        const result = await handleReturnParcelWebhook(String(orderNumber), statusId, parcel.status?.message || "");
        return res.status(200).json({
          success: true,
          message: result.handled ? "Return parcel webhook processed" : "Return request not found, skipped",
        });
      }

      // ── Sendcloud Status ID → Our Order Status Mapping ───────────────────
      // Reference: https://support.sendcloud.com/hc/en-us/articles/360024967012
      let newStatus: string | null = null;

      switch (statusId) {
        // ── Pickup / Handoff phase ──
        case 1:   // Announced (label created, not yet at carrier)
        case 2:   // En route to sorting center
        case 3:   // Received at sorting center
        case 13:  // Parcel picked up / Handed to carrier
          newStatus = "picked_up";
          break;

        // ── Transit phase ──
        case 4:   // In transit
        case 5:   // Sorting center arrived
        case 14:  // At sorting center / In transit
          newStatus = "in_transit";
          break;

        // ── Out for Delivery phase ──
        case 6:   // Driver en route
        case 15:  // Out for delivery
          newStatus = "out_for_delivery";
          break;

        // ── Delivered ──
        case 11:  // Delivered at address (universal across carriers)
          newStatus = "delivered";
          break;

        // ── Delivery Attempted / Hold ──
        case 12:  // Awaiting customer pickup (post office / locker)
        case 17:  // Unable to deliver — delivery attempted
        case 80:  // Failed delivery attempt
          newStatus = "out_for_delivery"; // Keep as out_for_delivery, shipmentStatus will explain
          break;

        // ── Cancelled / Failed ──
        case 22:  // Return shipping initiated
        case 93:  // Cancelled by carrier
        case 1000: // Unknown / Error
          // Don't change main status — just update shipmentStatus message
          break;

        default:
          // Unknown status ID — just update shipmentStatus message for admin visibility
          console.log(`[Sendcloud Webhook] Unhandled status ID ${statusId}, only updating shipmentStatus`);
          break;
      }

      const updateData: any = {
        shipmentStatus: parcel.status.message, // Always update human-readable status for admin
      };

      if (newStatus) {
        updateData.status = newStatus;
        if (newStatus === "delivered") {
          updateData.deliveredAt = new Date();
        }
      }

      // Find order — might not exist if order number doesn't match
      const existingOrder = await prisma.order.findUnique({ where: { orderNumber } });
      if (!existingOrder) {
        console.warn(`[Sendcloud Webhook] Order with orderNumber "${orderNumber}" not found in DB — skipping`);
        return res.status(200).json({ success: true, message: "Order not found, skipped" });
      }

      const updatedOrder = await prisma.order.update({
        where: { orderNumber },
        data: updateData
      });

      console.log(`[Sendcloud Webhook] ✅ Order ${orderNumber} updated → status: ${newStatus || "unchanged"} | shipmentStatus: ${parcel.status.message}`);

      // Use order_delivered template (with review link) for delivery, else generic status update
      // Only send notification if status actually changed
      if (newStatus || statusId === 12 || statusId === 17 || statusId === 80) {
        const notifTemplate = newStatus === "delivered" ? "order_delivered" : "order_status_update";
        await notificationTriggerService.triggerOrderNotification(updatedOrder.id, notifTemplate).catch(err => {
          console.error("[Sendcloud Webhook] Failed to trigger notification:", err.message);
        });
      }
    }

    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("[Sendcloud Webhook] Error:", error);
    res.status(500).json({ success: false, message: "Webhook handler failed" });
  }
};
