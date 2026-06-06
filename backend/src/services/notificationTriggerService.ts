import { prisma } from "../config/db";
import { emailService } from "./emailService";
import { twilioService } from "./twilioService";
import { firebaseService } from "./firebaseService";
import jwt from "jsonwebtoken";

// Helper to format Order Items into an HTML table for order_confirmed template
const formatOrderItemsHtml = (items: any[]): string => {
  if (!items || items.length === 0) return "";
  return items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #333333;">
        ${item.productName} ${item.variant ? `(${item.variant})` : ""}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #333333; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #333333; text-align: right;">
        &euro;${(item.price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join("");
};

// Helper to format Payment Summary into an HTML table for order_confirmed template
const formatPaymentSummaryHtml = (order: any): string => {
  const method = order.paymentMethod ? order.paymentMethod.toUpperCase() : "STRIPE";
  const status = order.paymentStatus ? order.paymentStatus.toUpperCase() : (order.status === "pending" ? "PENDING" : "PAID");
  const statusColor = status === "PAID" || status === "SUCCESS" || status === "COMPLETED" ? "#16a34a" : "#ca8a04";
  
  let html = `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #666666;">Payment Method</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #333333; text-align: right; font-weight: bold;">${method}</td>
    </tr>
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #666666;">Status</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: ${statusColor}; text-align: right; font-weight: bold;">${status}</td>
    </tr>
  `;

  if (order.stripePaymentId) {
    html += `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #666666;">Transaction ID</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 12px; color: #333333; text-align: right; font-family: monospace;">${order.stripePaymentId}</td>
      </tr>
    `;
    const utr = `UTR-${order.stripePaymentId.replace("pi_", "").replace("ch_", "").substring(0, 12).toUpperCase()}`;
    html += `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #666666;">Reference (UTR)</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 12px; color: #333333; text-align: right; font-family: monospace;">${utr}</td>
      </tr>
    `;
  } else {
    const utr = `UTR-${order.id.replace(/-/g, "").substring(0, 12).toUpperCase()}`;
    html += `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px; color: #666666;">Reference (UTR)</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 12px; color: #333333; text-align: right; font-family: monospace;">${utr}</td>
      </tr>
    `;
  }

  return html;
};

export const notificationTriggerService = {
  /**
   * Dispatch notification across enabled channels (Email, WhatsApp, SMS, Push)
   * @param recipientEmail Customer Email
   * @param recipientPhone Customer Phone
   * @param templateName The name of the trigger template (e.g. "order_confirmed")
   * @param variables Key-value template variables for interpolation
   * @param deviceToken Optional firebase device token for push notification
   */
  dispatch: async (
    recipientEmail: string,
    recipientPhone: string | null,
    templateName: string,
    variables: Record<string, string>,
    deviceToken?: string
  ) => {
    try {
      console.log(`[NotificationTrigger] Triggering template: ${templateName} for ${recipientEmail}`);

      // 1. Fetch channels config
      const config = await prisma.cmsConfig.findUnique({
        where: { key: "notification_channels_config" }
      });

      const channelsConfig = config ? (config.value as any) : {
        global: { email: true, whatsapp: false, sms: false, site_notification: false },
        templates: {}
      };

      const globalConfig = channelsConfig.global || {};
      const templateChannels: string[] = channelsConfig.templates[templateName] || ["email"];

      // 2. Fetch specific template to extract subject/content for SMS/WhatsApp/Push
      const template = await prisma.emailTemplate.findUnique({
        where: { name: templateName }
      });

      if (!template) {
        console.error(`[NotificationTrigger] Template '${templateName}' not found in database.`);
        return;
      }

      // Interpolate text for SMS/WhatsApp/Push
      const interpolateText = (text: string, vars: Record<string, string>) => {
        let res = text;
        Object.entries(vars).forEach(([key, val]) => {
          res = res.replace(new RegExp(`{{${key}}}`, "g"), val);
        });
        // Remove HTML tags for clean text messages
        return res.replace(/<[^>]*>/g, '').trim();
      };

      const plainTextBody = interpolateText(template.body, variables);
      const subjectText = interpolateText(template.subject, variables);

      // 3. Dispatch Email
      if (globalConfig.email && templateChannels.includes("email") && recipientEmail) {
        await emailService.sendTemplateEmail(recipientEmail, templateName, variables).catch(err => {
          console.error("[NotificationTrigger] Email send failed:", err.message);
        });
      }

      // 4. Dispatch WhatsApp
      if (globalConfig.whatsapp && templateChannels.includes("whatsapp") && recipientPhone) {
        await twilioService.sendWhatsApp(recipientPhone, `${subjectText}\n\n${plainTextBody}`).catch(err => {
          console.error("[NotificationTrigger] WhatsApp send failed:", err.message);
        });
      }

      // 5. Dispatch SMS
      if (globalConfig.sms && templateChannels.includes("sms") && recipientPhone) {
        await twilioService.sendSMS(recipientPhone, `${subjectText}: ${plainTextBody}`).catch(err => {
          console.error("[NotificationTrigger] SMS send failed:", err.message);
        });
      }

      // 6. Dispatch Push Notification (Firebase)
      if (globalConfig.site_notification && templateChannels.includes("site_notification")) {
        if (deviceToken) {
          await firebaseService.sendPushNotification(deviceToken, subjectText, plainTextBody).catch(err => {
            console.error("[NotificationTrigger] Firebase Push failed:", err.message);
          });
        } else {
          // Fallback to sending to a global or user-specific topic
          const topic = `user_notifications_${recipientEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
          await firebaseService.sendToTopic(topic, subjectText, plainTextBody).catch(err => {
            console.error("[NotificationTrigger] Firebase Topic Push failed:", err.message);
          });
        }
      }

    } catch (err: any) {
      console.error("[NotificationTrigger] Error during dispatch:", err.message);
    }
  },

  /**
   * Helper to trigger order-related notifications
   * @param orderId Order Database ID
   * @param templateName Template Code ("order_confirmed", "order_shipped", "payment_failed", "order_status_update")
   */
  triggerOrderNotification: async (orderId: string, templateName: string) => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, user: true }
      });

      if (!order) {
        console.error(`[NotificationTrigger] Order ${orderId} not found.`);
        return;
      }

      // Skip status update emails for ready_to_ship / ready to ship
      if (templateName === "order_status_update" && 
          (order.status?.toLowerCase() === "ready_to_ship" || order.status?.toLowerCase() === "ready to ship")) {
        console.log(`[NotificationTrigger] Skipping status update notification for ready_to_ship status`);
        return;
      }

      // Extract metadata (tax, discount, address info)
      let addressData: any = {};
      try {
        addressData = JSON.parse(order.shippingAddress);
      } catch (e) {
        addressData = {};
      }

      // Format template variables
      const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";
      const invoiceToken = jwt.sign(
        { orderId: order.id },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "30d" }
      );

      const variables: Record<string, string> = {
        name: order.customerName || "Customer",
        order_id: order.orderNumber,
        order_items: formatOrderItemsHtml(order.items),
        payment_summary: formatPaymentSummaryHtml(order),
        subtotal: order.subtotal.toFixed(2),
        shipping: order.shipping === 0 ? "Free" : order.shipping.toFixed(2),
        total: order.total.toFixed(2),
        status: order.status.toUpperCase(),
        payment_method: order.paymentMethod.toUpperCase(),
        carrier: order.carrier || "Sendcloud",
        tracking_number: order.trackingNumber || "",
        tracking_url: order.trackingUrl || "",
        invoice_url: `${clientUrl}/invoice?token=${invoiceToken}`,
        retry_url: `${clientUrl}/checkout/retry/${order.id}`,
        order_url: `${clientUrl}/dashboard`,
        review_url: `${clientUrl}/dashboard?tab=orders&orderId=${order.orderNumber}`
      };

      const phone = addressData.phone || order.user?.phone || null;

      await notificationTriggerService.dispatch(
        order.customerEmail,
        phone,
        templateName,
        variables
      );

    } catch (err: any) {
      console.error("[NotificationTrigger] Error triggering order notification:", err.message);
    }
  }
};
