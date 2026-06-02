import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { AppError } from "../middlewares/errorMiddleware";

// Helper function to read, parse, update and save .env file
const updateEnvFile = (updates: Record<string, string>) => {
  const envPath = path.resolve(process.cwd(), ".env");
  
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const lines = envContent.split("\n");
  const envMap: Record<string, string> = {};

  // Parse existing
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    
    const splitIndex = trimmed.indexOf("=");
    if (splitIndex !== -1) {
      const key = trimmed.substring(0, splitIndex).trim();
      envMap[key] = line; // Store the whole line to replace it later
    }
  });

  // Apply updates
  let updatedContent = envContent;
  
  for (const [key, value] of Object.entries(updates)) {
    // Update process.env so it's instantly available without restart
    process.env[key] = value;

    const newLine = `${key}="${value}"`;

    if (envMap[key] !== undefined) {
      // Replace existing line
      updatedContent = updatedContent.replace(envMap[key], newLine);
      envMap[key] = newLine; // Update map so we don't append it
    } else {
      // Append if it doesn't exist
      updatedContent += `\n${newLine}`;
    }
  }

  // Ensure file ends with newline
  if (!updatedContent.endsWith("\n")) {
    updatedContent += "\n";
  }

  fs.writeFileSync(envPath, updatedContent, "utf-8");
};

// ----------------------------------------------------
// 1. GET SMTP SETTINGS
// ----------------------------------------------------
export const getSmtpSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = {
      host: process.env.SMTP_HOST || "",
      port: process.env.SMTP_PORT || "",
      encryption: process.env.SMTP_ENCRYPTION || "TLS",
      username: process.env.SMTP_USER || "",
      // Mask the password so the plain text is never exposed in the browser
      password: process.env.SMTP_PASS ? "••••••••" : "",
      fromName: process.env.SMTP_FROM_NAME || "",
      fromEmail: process.env.SMTP_FROM_EMAIL || "",
      enabled: process.env.SMTP_ENABLE === "true" || process.env.SMTP_ENABLE === "1",
    };

    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 2. UPDATE SMTP SETTINGS
// ----------------------------------------------------
export const updateSmtpSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { host, port, encryption, username, password, fromName, fromEmail, enabled } = req.body;

    const updates: Record<string, string> = {};
    if (host !== undefined) updates.SMTP_HOST = host;
    if (port !== undefined) updates.SMTP_PORT = port.toString();
    if (encryption !== undefined) updates.SMTP_ENCRYPTION = encryption;
    if (username !== undefined) updates.SMTP_USER = username;
    
    // Only update password if it's provided and not the masked placeholder
    if (password !== undefined && password !== "" && password !== "••••••••") {
      updates.SMTP_PASS = password;
    }
    
    if (fromName !== undefined) updates.SMTP_FROM_NAME = fromName;
    if (fromEmail !== undefined) updates.SMTP_FROM_EMAIL = fromEmail;
    if (enabled !== undefined) updates.SMTP_ENABLE = enabled ? "true" : "false";

    // Write to .env file and process.env
    updateEnvFile(updates);

    res.status(200).json({ success: true, message: "SMTP Settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 3. SEND TEST EMAIL
// ----------------------------------------------------
import { emailService } from "../services/emailService";
import { prisma } from "../config/db";

export const testSmtpSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { to } = req.body;
    if (!to) {
      return next(new AppError("Recipient email address is required", 400));
    }

    // Ensure test_email template exists
    let testTemplate = await prisma.emailTemplate.findUnique({ where: { name: "test_email" } });
    if (!testTemplate) {
      testTemplate = await prisma.emailTemplate.create({
        data: {
          name: "test_email",
          subject: "Test Email from Lampgigant",
          body: "<h2>Hello!</h2><p>If you are seeing this, your SMTP configuration is working perfectly.</p>",
        }
      });
    }

    const success = await emailService.sendTemplateEmail(to, "test_email");
    if (success) {
      res.status(200).json({ success: true, message: `Test email sent successfully to ${to}` });
    } else {
      res.status(500).json({ success: false, message: "Failed to send test email. Check server logs and SMTP credentials." });
    }
  } catch (error: any) {
    const msg = error?.message || "Unknown error";
    console.error("[TestSMTP] Error:", msg);
    res.status(500).json({ success: false, message: `SMTP Error: ${msg}` });
  }
};

// ----------------------------------------------------
// 4. GET PAYMENT SETTINGS
// ----------------------------------------------------
export const getPaymentSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = {
      ideal: process.env.PAYMENT_ENABLE_IDEAL !== "false", // default to true
      card: process.env.PAYMENT_ENABLE_CARD !== "false",   // default to true
      paypal: process.env.PAYMENT_ENABLE_PAYPAL === "true",
      klarna: process.env.PAYMENT_ENABLE_KLARNA === "true",
      bancontact: process.env.PAYMENT_ENABLE_BANCONTACT === "true",
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      stripeSecretKey: process.env.STRIPE_SECRET_KEY ? "••••••••••••••••••••" : "",
    };

    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 5. UPDATE PAYMENT SETTINGS
// ----------------------------------------------------
export const updatePaymentSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ideal, card, paypal, klarna, bancontact, stripePublishableKey, stripeSecretKey } = req.body;

    const updates: Record<string, string> = {};
    if (ideal !== undefined) updates.PAYMENT_ENABLE_IDEAL = ideal ? "true" : "false";
    if (card !== undefined) updates.PAYMENT_ENABLE_CARD = card ? "true" : "false";
    if (paypal !== undefined) updates.PAYMENT_ENABLE_PAYPAL = paypal ? "true" : "false";
    if (klarna !== undefined) updates.PAYMENT_ENABLE_KLARNA = klarna ? "true" : "false";
    if (bancontact !== undefined) updates.PAYMENT_ENABLE_BANCONTACT = bancontact ? "true" : "false";
    if (stripePublishableKey !== undefined) updates.STRIPE_PUBLISHABLE_KEY = stripePublishableKey;
    
    // Only update Stripe Secret Key if it's not the masked placeholder
    if (stripeSecretKey !== undefined && stripeSecretKey !== "" && !stripeSecretKey.includes("••")) {
      updates.STRIPE_SECRET_KEY = stripeSecretKey;
    }

    // Write to .env file and process.env
    updateEnvFile(updates);

    res.status(200).json({ success: true, message: "Payment Settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};
