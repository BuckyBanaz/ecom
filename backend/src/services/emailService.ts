import nodemailer from "nodemailer";
import { prisma } from "../config/db";

interface EmailVariables {
  [key: string]: string;
}

/**
 * Replace all {{key}} placeholders in the text with corresponding values from variables object.
 */
function replaceVariables(text: string, variables: EmailVariables): string {
  if (!text) return "";
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value);
  }
  return result;
}

export const emailService = {
  /**
   * Send an email by fetching a template and wrapping it in the global layout.
   */
  sendTemplateEmail: async (to: string, templateName: string, variables: EmailVariables = {}) => {
    try {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const encryption = (process.env.SMTP_ENCRYPTION || "tls").toLowerCase();
      const fromName = process.env.SMTP_FROM_NAME || "Lampgigant";
      const fromEmail = process.env.SMTP_FROM_EMAIL || user;

      // Check if SMTP is configured
      if (!host || !user || !pass) {
        console.warn(
          `[EmailService] SMTP not configured. host=${host}, user=${user}. Skipping email to: ${to}`
        );
        return false;
      }

      // Determine secure: port 465 always uses SSL, otherwise check encryption field
      const secure = port === 465 || encryption === "ssl";

      console.log(
        `[EmailService] Sending via SMTP: host=${host}, port=${port}, secure=${secure}, from=${fromEmail}, to=${to}`
      );

      // Create transporter
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          // Allow self-signed certs on custom mail servers
          rejectUnauthorized: false,
        },
      });

      // Fetch the specific template
      const template = await prisma.emailTemplate.findUnique({
        where: { name: templateName },
      });

      if (!template) {
        console.error(`[EmailService] Template '${templateName}' not found in database.`);
        return false;
      }

      // Fetch the global layout
      const globalLayout = await prisma.emailTemplate.findUnique({
        where: { name: "global_layout" },
      });

      // Replace variables in subject and body
      const subject = replaceVariables(template.subject, variables);
      const bodyContent = replaceVariables(template.body, variables);

      // Inject body into global layout
      let finalHtml = bodyContent;
      if (globalLayout && globalLayout.body) {
        finalHtml = globalLayout.body.replace("{{content}}", bodyContent);
      }

      // Send the email
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: finalHtml,
      });

      console.log(`[EmailService] ✅ Email sent to ${to} | MessageId: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error("[EmailService] ❌ Failed to send email:", error?.message || error);
      throw error; // Re-throw so controller can handle it properly
    }
  },
};
