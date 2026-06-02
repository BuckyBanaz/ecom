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
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:2px;">LAMPGIGANT</h1>
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
              <p style="margin:0 0 4px;color:#888888;font-size:12px;">&copy; 2026 Lampgigant. All rights reserved.</p>
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
    subject: "Welcome to Lampgigant!",
    body: `<h2>Hello {{name}},</h2>
<p>Welcome to Lampgigant! We are thrilled to have you on board.</p>
<p>You can now explore our wide collection of premium lighting solutions tailored for your space.</p>
<br/>
<a href="{{login_url}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Login to your account</a>
<br/><br/>
<p>Best regards,<br/>The Lampgigant Team</p>`,
  },
  {
    name: "email_verification",
    subject: "Verify Your Email Address",
    body: `<h2>Hello {{name}},</h2>
<p>Thank you for registering at Lampgigant. Please verify your email address to complete your registration.</p>
<p>Your verification code is: <strong>{{otp}}</strong></p>
<p>Or click the link below:</p>
<a href="{{verification_link}}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
<br/><br/>
<p>If you did not create this account, you can safely ignore this email.</p>`,
  },
  {
    name: "forgot_password",
    subject: "Password Reset Request",
    body: `<h2>Hello {{name}},</h2>
<p>We received a request to reset your password. If you didn't make this request, just ignore this email.</p>
<p>Your password reset OTP is: <strong style="font-size: 20px;">{{otp}}</strong></p>
<p>This code will expire in 10 minutes.</p>`,
  },
  {
    name: "reset_password",
    subject: "Your Password Has Been Reset",
    body: `<h2>Hello {{name}},</h2>
<p>This is a confirmation that the password for your Lampgigant account has just been successfully reset.</p>
<p>If you did not authorize this change, please contact our support team immediately.</p>`,
  },
  {
    name: "change_password",
    subject: "Your Password Has Been Changed",
    body: `<h2>Hello {{name}},</h2>
<p>We're writing to let you know that the password for your Lampgigant account was recently changed from your account settings.</p>
<p>If this wasn't you, please secure your account immediately.</p>`,
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
  }
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
          }
        });
        console.log(`[Seed] Created email template: ${tpl.name}`);
      }
    }
  } catch (error) {
    console.error("[Seed] Error seeding templates:", error);
  }
};
