import { prisma } from "../config/db";

const DEFAULT_TEMPLATES = [
  {
    name: "global_layout",
    subject: "Global Email Layout",
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background-color:#000000;padding:24px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:2px;">SCHIP & STER</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 36px;color:#333333;font-size:15px;line-height:1.7;">
              {{content}}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f8f8;padding:20px 30px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 4px;color:#888888;font-size:12px;">&copy; 2026 Schip & Ster. All rights reserved.</p>
              <p style="margin:0;color:#aaaaaa;font-size:11px;">This is an automated message, please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: "welcome_mail",
    subject: "Welcome to Schip & Ster!",
    body: `<h2>Hello {{name}},</h2>
<p>Welcome to Schip & Ster! We are thrilled to have you on board.</p>
<p>You can now explore our wide collection of premium lighting solutions tailored for your space.</p>
<br/>
<a href="{{login_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Login to your account</a>
<br/><br/>
<p>Best regards,<br/>The Schip & Ster Team</p>`,
    smsBody: `Hi {{name}}, welcome to Schip & Ster! Login to explore our collection: {{login_url}}`,
    whatsappBody: `Hello {{name}}! 🎉\n\nWelcome to *Schip & Ster*! We are thrilled to have you on board.\n\nLogin to your account here: {{login_url}}`,
  },
  {
    name: "email_verification",
    subject: "Verify Your Email Address",
    body: `<h2>Hello {{name}},</h2>
<p>Thank you for registering at Schip & Ster. Please verify your email address to complete your registration.</p>
<p>Your verification code is: <strong>{{otp}}</strong></p>
<p>Or click the link below:</p>
<a href="{{verification_link}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
<br/><br/>
<p>If you did not create this account, you can safely ignore this email.</p>`,
    smsBody: `Your Schip & Ster verification code is {{otp}}.`,
    whatsappBody: `Hello {{name}},\nYour Schip & Ster verification code is *{{otp}}*.`,
  },
  {
    name: "forgot_password",
    subject: "Password Reset Request",
    body: `<h2>Hello {{name}},</h2>
<p>We received a request to reset your password. If you didn't make this request, just ignore this email.</p>
<p>Your password reset OTP is: <strong style="font-size: 20px;">{{otp}}</strong></p>
<p>This code will expire in 10 minutes.</p>`,
    smsBody: `Your Schip & Ster password reset OTP is {{otp}}. Valid for 10 minutes.`,
    whatsappBody: `Hello {{name}},\n\nYour *Schip & Ster* password reset OTP is: *{{otp}}*\n\nThis code will expire in 10 minutes.`,
  },
  {
    name: "reset_password",
    subject: "Your Password Has Been Reset",
    body: `<h2>Hello {{name}},</h2>
<p>This is a confirmation that the password for your Schip & Ster account has just been successfully reset.</p>
<p>If you did not authorize this change, please contact our support team immediately.</p>`,
    smsBody: `Hi {{name}}, your Schip & Ster password has been reset.`,
    whatsappBody: `Hello {{name}},\n\nYour *Schip & Ster* password has been successfully reset. If this wasn't you, please contact support.`,
  },
  {
    name: "change_password",
    subject: "Your Password Has Been Changed",
    body: `<h2>Hello {{name}},</h2>
<p>We're writing to let you know that the password for your Schip & Ster account was recently changed from your account settings.</p>
<p>If this wasn't you, please secure your account immediately.</p>`,
    smsBody: `Hi {{name}}, your Schip & Ster password was recently changed.`,
    whatsappBody: `Hello {{name}},\n\nYour *Schip & Ster* password was recently changed from your account settings. If this wasn't you, please secure your account immediately.`,
  },
  {
    name: "order_status_update",
    subject: "Update on Your Order #{{order_id}}",
    body: `<h2>Hello {{name}},</h2>
<p>We wanted to let you know that the status of your order <strong>#{{order_id}}</strong> has been updated to: <strong style="text-transform: uppercase;">{{status}}</strong>.</p>
<p>You can track your order or view more details by logging into your account.</p>
<br/>
<a href="{{order_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Order</a>
<br/><br/>
<p>Thank you for shopping with us!</p>`,
    smsBody: `Hi {{name}}, your order #{{order_id}} is now {{status}}. Track it here: {{order_url}}`,
    whatsappBody: `Hello {{name}},\n\nYour order *#{{order_id}}* is now *{{status}}*.\n\nTrack it here: {{order_url}}`,
  },
  {
    name: "order_confirmed",
    subject: "Order Confirmed - #{{order_id}}",
    body: `<h2>Thank you for your order, {{name}}!</h2>
<p>Your order <strong>#{{order_id}}</strong> has been confirmed and is being processed.</p>
<h3>Order Summary</h3>
<table width="100%" cellpadding="5" style="border-collapse:collapse;margin:15px 0;">
  <thead>
    <tr style="background:#f4f4f5;text-align:left;">
      <th style="padding:8px;border-bottom:1px solid #ddd;">Product</th>
      <th style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">Qty</th>
      <th style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">Price</th>
    </tr>
  </thead>
  <tbody>
    {{order_items}}
  </tbody>
</table>
<div style="text-align:right;margin-top:10px;">
  <p><strong>Subtotal:</strong> €{{subtotal}}</p>
  <p><strong>Shipping:</strong> €{{shipping}}</p>
  <p><strong>Total:</strong> €{{total}}</p>
</div>
<br/>
<h3>Payment Summary</h3>
<table width="100%" cellpadding="5" style="border-collapse:collapse;margin:15px 0;">
  <tbody>
    {{payment_summary}}
  </tbody>
</table>
<br/>
<p>You can download your invoice using the link below:</p>
<a href="{{invoice_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Download Invoice</a>
<br/><br/>
<p>Best regards,<br/>The Schip & Ster Team</p>`,
    smsBody: `Hi {{name}}, your order #{{order_id}} is confirmed! Total: €{{total}}. Thank you for shopping with Schip & Ster.`,
    whatsappBody: `Hello {{name}}! 🎊\n\nThank you for your order! Your order *#{{order_id}}* has been confirmed.\n\n*Total:* €{{total}}\n\nYou can download your invoice here: {{invoice_url}}\n\nBest regards,\nThe Schip & Ster Team`,
  },
  {
    name: "payment_failed",
    subject: "Payment Failed for Order #{{order_id}}",
    body: `<h2>Hello {{name}},</h2>
<p>We were unable to process your payment for order <strong>#{{order_id}}</strong>.</p>
<p><strong>Transaction Details:</strong></p>
<ul>
  <li>Order Number: #{{order_id}}</li>
  <li>Total Amount: €{{total}}</li>
  <li>Payment Method: {{payment_method}}</li>
  <li>Reason: Card declined or transaction timed out.</li>
</ul>
<p>Please click the link below to retry your payment and complete your order:</p>
<a href="{{retry_url}}" style="display: inline-block; padding: 10px 20px; background-color: #f43f5e; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Retry Payment</a>
<br/><br/>
<p>If you have any questions, feel free to contact our support team.</p>`,
    smsBody: `Hi {{name}}, payment for order #{{order_id}} failed. Please retry: {{retry_url}}`,
    whatsappBody: `Hello {{name}} ⚠️\n\nWe were unable to process your payment for order *#{{order_id}}*.\n\nPlease retry your payment here: {{retry_url}}`,
  },
  {
    name: "order_shipped",
    subject: "Your Order #{{order_id}} Has Been Shipped!",
    body: `<h2>Great news, {{name}}!</h2>
<p>Your order <strong>#{{order_id}}</strong> has been shipped and is on its way to you.</p>
<p><strong>Shipment Details:</strong></p>
<ul>
  <li>Carrier: {{carrier}}</li>
  <li>Tracking Number: {{tracking_number}}</li>
</ul>
<br/>
<a href="{{tracking_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Track Shipment</a>
<br/><br/>
<p>Thank you for shopping with Schip & Ster!</p>`,
    smsBody: `Hi {{name}}, your order #{{order_id}} has been shipped via {{carrier}}. Track it: {{tracking_url}}`,
    whatsappBody: `Great news, {{name}}! 🎉\n\nYour order *#{{order_id}}* has been shipped via {{carrier}}.\n\nTrack it here: {{tracking_url}}`,
  },
  {
    name: "order_delivered",
    subject: "Your Order #{{order_id}} Has Been Delivered!",
    body: `<h2>Good news, {{name}}!</h2>
<p>Your order <strong>#{{order_id}}</strong> has been successfully delivered.</p>
<p>We hope you love your new purchase! Could you please take a moment to leave a review and share your experience?</p>
<br/>
<a href="{{review_url}}" style="display: inline-block; padding: 10px 20px; background-color: #f59e0b; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Write a Review</a>
<br/><br/>
<p>If you have any questions or feedback, we are always here to help.</p>
<p>Best regards,<br/>The Schip & Ster Team</p>`,
    smsBody: `Hi {{name}}, your order #{{order_id}} has been delivered! Share your review: {{review_url}}`,
    whatsappBody: `Good news, {{name}}! 📦\n\nYour order *#{{order_id}}* has been delivered.\n\nWe hope you love it! Please leave a review here: {{review_url}}`,
  },
  {
    name: "return_submitted",
    subject: "Return Request Received — Order #{{order_id}}",
    body: `<h2>Hello {{name}},</h2>
<p>We have received your return request for order <strong>#{{order_id}}</strong>.</p>
<p><strong>Reason:</strong> {{return_reason}}</p>
<p>Our team will review your request and photos within 1–2 business days. You will receive an email once a decision is made.</p>
<br/>
<a href="{{return_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Return Status</a>
<br/><br/>
<p>Thank you for your patience.</p>`,
    smsBody: `Hi {{name}}, we received your return request for order #{{order_id}}. Track status: {{return_url}}`,
    whatsappBody: `Hello {{name}},\n\nWe received your return request for order *#{{order_id}}*.\n\nReason: {{return_reason}}\n\nTrack status: {{return_url}}`,
  },
  {
    name: "return_approved",
    subject: "Return Approved — Order #{{order_id}}",
    body: `<h2>Hello {{name}},</h2>
<p>Good news! Your return request for order <strong>#{{order_id}}</strong> has been <strong style="color:#16a34a;">approved</strong>.</p>
<p><strong>Refund amount (after we receive your return):</strong> &euro;{{refund_amount}}</p>
<p>We will email you a return shipping label shortly. Please pack the item securely and drop it off at your nearest {{carrier}} service point once the label is ready.</p>
{{admin_note_block}}
<br/>
<a href="{{return_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Return Status</a>
<br/><br/>
<p>Thank you for shopping with Schip & Ster.</p>`,
    smsBody: `Hi {{name}}, return approved for order #{{order_id}}. We will send your return label soon. {{return_url}}`,
    whatsappBody: `Hello {{name}},\n\nYour return for order *#{{order_id}}* is *approved*.\n\nRefund of €{{refund_amount}} will be processed after we receive your item.\n\nTrack: {{return_url}}`,
  },
  {
    name: "return_rejected",
    subject: "Return Request Update — Order #{{order_id}}",
    body: `<h2>Hello {{name}},</h2>
<p>We have reviewed your return request for order <strong>#{{order_id}}</strong>.</p>
<p>Unfortunately, we are unable to approve this return at this time.</p>
<p><strong>Reason:</strong> {{rejection_reason}}</p>
<p>If you believe this is an error, please contact our support team.</p>
<br/>
<a href="{{return_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Order</a>`,
    smsBody: `Hi {{name}}, your return for order #{{order_id}} was not approved. Reason: {{rejection_reason}}`,
    whatsappBody: `Hello {{name}},\n\nYour return for order *#{{order_id}}* was not approved.\n\nReason: {{rejection_reason}}`,
  },
  {
    name: "return_label_created",
    subject: "Return Shipping Label Ready — Order #{{order_id}}",
    body: `<h2>Hello {{name}},</h2>
<p>Your return shipping label for order <strong>#{{order_id}}</strong> is ready.</p>
<p><strong>Carrier:</strong> {{carrier}}</p>
<p><strong>Tracking number:</strong> {{tracking_number}}</p>
<p><strong>How to return (Netherlands):</strong></p>
<ol>
<li>Download and print the return label from your account</li>
<li>Pack the item securely in the original box if possible</li>
<li>Attach the label to the outside of the package</li>
<li>Drop off at your nearest PostNL or {{carrier}} service point</li>
</ol>
<p>There is no home pickup — you drop off the parcel yourself at a service point.</p>
<br/>
<a href="{{label_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; margin-right:8px;">Download Label</a>
<a href="{{tracking_url}}" style="display: inline-block; padding: 10px 20px; background-color: #f4f4f5; color: #000; text-decoration: none; border-radius: 5px;">Track Return</a>
<br/><br/>
<p><strong>Refund:</strong> €{{refund_amount}} will be processed within {{refund_eta_days}} business days after we receive and inspect your return.</p>`,
    smsBody: `Hi {{name}}, return label ready for order #{{order_id}} via {{carrier}}. Drop at service point. Track: {{tracking_url}}`,
    whatsappBody: `Hello {{name}},\n\nReturn label ready for order *#{{order_id}}*.\n\n1. Print label\n2. Pack item\n3. Drop at {{carrier}} service point\n\nTrack: {{tracking_url}}`,
  },
  {
    name: "return_refund_processed",
    subject: "Refund Processed — Order #{{order_id}}",
    body: `<h2>Hello {{name}},</h2>
<p>We have received your return for order <strong>#{{order_id}}</strong> and processed your refund.</p>
<p><strong>Refund amount:</strong> &euro;{{refund_amount}}</p>
<p><strong>Estimated arrival:</strong> {{refund_eta_days}} business days (by {{refund_expected_date}})</p>
<p>Refunds are sent to your original payment method. Bank processing times may vary.</p>
<br/>
<a href="{{return_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Order</a>
<br/><br/>
<p>Thank you for shopping with Schip & Ster.</p>`,
    smsBody: `Hi {{name}}, refund of €{{refund_amount}} processed for order #{{order_id}}. ETA {{refund_eta_days}} business days.`,
    whatsappBody: `Hello {{name}},\n\nRefund of €{{refund_amount}} for order *#{{order_id}}* has been processed.\n\nExpected within {{refund_eta_days}} business days.`,
  },
];

export const seedTemplates = async () => {
  try {
    for (const tpl of DEFAULT_TEMPLATES) {
      const existing = await prisma.emailTemplate.findUnique({ where: { name: tpl.name } });
      if (!existing) {
        await prisma.emailTemplate.create({
          data: {
            name: tpl.name,
            subject: tpl.subject,
            body: tpl.body,
            smsBody: (tpl as any).smsBody || null,
            whatsappBody: (tpl as any).whatsappBody || null,
          }
        });
        console.log(`[Seed] Created email template: ${tpl.name}`);
      } else if (!existing.smsBody && (tpl as any).smsBody) {
        // Update existing ones with smsBody and whatsappBody if they are null
        await prisma.emailTemplate.update({
          where: { name: tpl.name },
          data: {
            smsBody: (tpl as any).smsBody || null,
            whatsappBody: (tpl as any).whatsappBody || null,
          }
        });
        console.log(`[Seed] Updated ${tpl.name} template with smsBody & whatsappBody`);
      } else if (tpl.name === "order_confirmed" && !existing.body.includes("payment_summary")) {
        await prisma.emailTemplate.update({
          where: { name: tpl.name },
          data: {
            body: tpl.body
          }
        });
        console.log(`[Seed] Updated order_confirmed template to include payment_summary`);
      }
    }
  } catch (error) {
    console.error("[Seed] Error seeding templates:", error);
  }
};
