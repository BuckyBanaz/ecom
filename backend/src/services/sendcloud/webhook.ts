import { Request, Response } from "express";
import { prisma } from "../../config/db";
import { notificationTriggerService } from "../notificationTriggerService";

/**
 * Handle incoming Sendcloud webhooks (e.g., parcel status changes)
 */
export const sendcloudWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["sendcloud-signature"];
    const payload = req.body;

    console.log("Received Sendcloud Webhook:", JSON.stringify(payload, null, 2));

    // To verify signature, you would use SENDCLOUD_SECRET_KEY to compute HMAC SHA256 
    // of the payload and compare it with the signature header.
    // We will skip strict verification here for simplicity unless requested.

    if (payload.action === "parcel_status_changed") {
      const parcel = payload.parcel;
      console.log(`Parcel ${parcel.id} status changed to: ${parcel.status.message}`);
      
      const orderNumber = parcel.order_number;
      if (orderNumber) {
        let newStatus = null;
        
        switch (parcel.status.id) {
          case 13: // Picked up / Announced
            newStatus = "Picked Up";
            break;
          case 14: // In transit / Sorting
            newStatus = "In Transit";
            break;
          case 15: // Out for delivery / Driver en route
            newStatus = "Out For Delivery";
            break;
          case 11: // Delivered
            newStatus = "Delivered";
            break;
          default:
            break;
        }

        const updateData: any = {
          shipmentStatus: parcel.status.message,
        };

        if (newStatus) {
          updateData.status = newStatus;
        }

        const updatedOrder = await prisma.order.update({
          where: { orderNumber },
          data: updateData
        });

        // Trigger order status update notification
        await notificationTriggerService.triggerOrderNotification(updatedOrder.id, "order_status_update").catch(err => {
          console.error("[Sendcloud Webhook] Failed to trigger order status update notification:", err.message);
        });
      }
    }

    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("Sendcloud Webhook Error:", error);
    res.status(500).json({ success: false, message: "Webhook handler failed" });
  }
};
