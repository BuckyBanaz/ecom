import { Request, Response, NextFunction } from "express";
import { getGA4Data } from "../services/analyticsService";
import { getGoogleIntegrationStatus } from "../utils/googleCredentials";
import { AppError } from "../middlewares/errorMiddleware";
import {
  saveSettings,
  getRobotsTxtContent,
  saveRobotsTxtContent,
  saveSitemapXmlContent,
  getLlmsTxtContent,
  saveLlmsTxtContent,
} from "../services/settingsStore";
import { sanitizeRobotsTxt, getRobotsTxtValidationError, normalizeRobotsTxtFromAi } from "../utils/robotsTxt";
import { prisma } from "../config/db";
import { getInvoiceVendorSettings, isApiDocsEnabled } from "../utils/generalSettings";
import { clampAiBulkLimit, clampAiImageCount } from "../utils/aiLimits";
import { getAiOutputLanguage, getAiOutputLanguageLabel } from "../utils/aiLanguage";

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

    await saveSettings(updates);

    res.status(200).json({ success: true, message: "SMTP Settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 3. SEND TEST EMAIL
// ----------------------------------------------------
import { emailService } from "../services/emailService";

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

    await saveSettings(updates);

    res.status(200).json({ success: true, message: "Payment Settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 6. GET AUTH SETTINGS
// ----------------------------------------------------
export const getAuthSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawMethod = process.env.AUTH_REGISTER_METHOD || "both";
    const registerMethod = rawMethod === "email" ? "email_only" : (rawMethod === "phone" ? "phone_only" : rawMethod);
    const settings = {
      emailLogin: process.env.AUTH_ENABLE_EMAIL !== "false", // default to true
      phoneLogin: process.env.AUTH_ENABLE_PHONE === "true",
      registerMethod: registerMethod, // "both", "email_only", "phone_only"
      smsProvider: process.env.AUTH_SMS_PROVIDER || "twilio",
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? "••••••••••••••••••••" : "",
      twilioSenderNumber: process.env.TWILIO_PHONE_NUMBER || "",
    };

    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 7. UPDATE AUTH SETTINGS
// ----------------------------------------------------
export const updateAuthSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailLogin, phoneLogin, registerMethod, smsProvider, twilioAccountSid, twilioAuthToken, twilioSenderNumber } = req.body;

    const updates: Record<string, string> = {};
    if (emailLogin !== undefined) updates.AUTH_ENABLE_EMAIL = emailLogin ? "true" : "false";
    if (phoneLogin !== undefined) updates.AUTH_ENABLE_PHONE = phoneLogin ? "true" : "false";
    if (registerMethod !== undefined) updates.AUTH_REGISTER_METHOD = registerMethod;
    if (smsProvider !== undefined) updates.AUTH_SMS_PROVIDER = smsProvider;
    if (twilioAccountSid !== undefined) updates.TWILIO_ACCOUNT_SID = twilioAccountSid;
    if (twilioSenderNumber !== undefined) updates.TWILIO_PHONE_NUMBER = twilioSenderNumber;

    if (twilioAuthToken !== undefined && twilioAuthToken !== "" && !twilioAuthToken.includes("••")) {
      updates.TWILIO_AUTH_TOKEN = twilioAuthToken;
    }

    await saveSettings(updates);

    res.status(200).json({ success: true, message: "Auth Settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 7.5 GET AI SETTINGS
// ----------------------------------------------------
export const getAiSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const settings = {
      enabled: process.env.AI_ENABLED === "true",
      googleApiKey: apiKey ? "••••••••••••••••••••" : "",
      systemPrompt: process.env.AI_SYSTEM_PROMPT || "",
      model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
      imageGenerationCount: clampAiImageCount(parseInt(process.env.AI_IMAGE_COUNT || "1", 10)),
      bulkProductLimit: clampAiBulkLimit(parseInt(process.env.AI_BULK_LIMIT || "5", 10)),
      defaultImagePrompt: process.env.AI_IMAGE_PROMPT || "in a modern interior setting",
      outputLanguage: getAiOutputLanguage(),
      outputLanguageLabel: getAiOutputLanguageLabel(),
    };

    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 7.6 UPDATE AI SETTINGS
// ----------------------------------------------------
export const updateAiSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { enabled, googleApiKey, systemPrompt, model, imageGenerationCount, bulkProductLimit, defaultImagePrompt, outputLanguage } = req.body;

    const updates: Record<string, string> = {};
    if (enabled !== undefined) updates.AI_ENABLED = enabled ? "true" : "false";

    if (googleApiKey !== undefined && googleApiKey !== "" && !googleApiKey.includes("••")) {
      updates.GOOGLE_API_KEY = googleApiKey.replace(/[\s\u2022•]/g, "");
    }

    if (systemPrompt !== undefined) {
      updates.AI_SYSTEM_PROMPT = systemPrompt;
    }

    if (model !== undefined) {
      updates.AI_MODEL = model;
    }

    if (imageGenerationCount !== undefined) {
      updates.AI_IMAGE_COUNT = String(clampAiImageCount(Number(imageGenerationCount)));
    }

    if (bulkProductLimit !== undefined) {
      updates.AI_BULK_LIMIT = String(clampAiBulkLimit(Number(bulkProductLimit)));
    }

    if (defaultImagePrompt !== undefined) {
      updates.AI_IMAGE_PROMPT = defaultImagePrompt;
    }

    if (outputLanguage !== undefined) {
      updates.AI_OUTPUT_LANGUAGE = outputLanguage;
    }

    await saveSettings(updates);

    res.status(200).json({ success: true, message: "AI Settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 7.7 GET AI MODELS (Gemini)
// ----------------------------------------------------
export const getAiModels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ success: false, error: "Google Gemini API Key not configured." });
      return;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch models from Gemini API: ${response.statusText}`);
    }

    const result = await response.json();

    // Filter for gemini models
    const models = (result.models || [])
      .filter((m: any) => m.name.includes("gemini"))
      .map((m: any) => ({
        id: m.name.replace("models/", ""), // 'gemini-1.5-flash'
        displayName: `${m.displayName} (${m.version || 'latest'})`,
        description: m.description
      }));

    res.status(200).json({ success: true, data: models });
  } catch (error: any) {
    console.error("Error fetching AI models:", error);
    next(error);
  }
};

// ----------------------------------------------------
// GET GENERAL SETTINGS (Store info + Maintenance Mode)
// ----------------------------------------------------
export const getGeneralSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = getInvoiceVendorSettings();
    const settings = {
      storeName: process.env.STORE_NAME || "SCHIP & STER",
      storeUrl: process.env.STORE_URL || "https://schipandster.com",
      supportEmail: process.env.SUPPORT_EMAIL || "support@schipandster.com",
      currency: process.env.STORE_CURRENCY || "EUR",
      maintenanceMode: process.env.MAINTENANCE_MODE === "true",
      maintenanceMessage: process.env.MAINTENANCE_MESSAGE || "We're currently performing maintenance. We'll be back shortly!",
      apiDocsEnabled: isApiDocsEnabled(),
      invoiceVendorName: invoice.vendorName,
      invoiceVendorAddress: invoice.vendorAddress,
      invoiceVendorEmail: invoice.vendorEmail,
      returnWindowDays: parseInt(process.env.RETURN_WINDOW_DAYS || "30", 10),
      returnsSystemEnabled: process.env.RETURNS_SYSTEM_ENABLED !== "false",
      refundsSystemEnabled: process.env.REFUNDS_SYSTEM_ENABLED !== "false",
    };

    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// UPDATE GENERAL SETTINGS
// ----------------------------------------------------
export const updateGeneralSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      storeName,
      storeUrl,
      supportEmail,
      currency,
      maintenanceMode,
      maintenanceMessage,
      apiDocsEnabled,
      invoiceVendorName,
      invoiceVendorAddress,
      invoiceVendorEmail,
      returnWindowDays,
      returnsSystemEnabled,
      refundsSystemEnabled,
    } = req.body;

    const updates: Record<string, string> = {};
    if (storeName !== undefined) updates.STORE_NAME = storeName;
    if (storeUrl !== undefined) updates.STORE_URL = storeUrl;
    if (supportEmail !== undefined) updates.SUPPORT_EMAIL = supportEmail;
    if (currency !== undefined) updates.STORE_CURRENCY = currency;
    if (maintenanceMode !== undefined) updates.MAINTENANCE_MODE = maintenanceMode ? "true" : "false";
    if (maintenanceMessage !== undefined) updates.MAINTENANCE_MESSAGE = maintenanceMessage;
    if (apiDocsEnabled !== undefined) updates.API_DOCS_ENABLED = apiDocsEnabled ? "true" : "false";
    if (invoiceVendorName !== undefined) updates.INVOICE_VENDOR_NAME = String(invoiceVendorName).trim();
    if (invoiceVendorAddress !== undefined) updates.INVOICE_VENDOR_ADDRESS = String(invoiceVendorAddress).trim();
    if (invoiceVendorEmail !== undefined) updates.INVOICE_VENDOR_EMAIL = String(invoiceVendorEmail).trim();
    if (returnWindowDays !== undefined) updates.RETURN_WINDOW_DAYS = String(returnWindowDays);
    if (returnsSystemEnabled !== undefined) updates.RETURNS_SYSTEM_ENABLED = returnsSystemEnabled ? "true" : "false";
    if (refundsSystemEnabled !== undefined) updates.REFUNDS_SYSTEM_ENABLED = refundsSystemEnabled ? "true" : "false";

    await saveSettings(updates);

    res.status(200).json({ success: true, message: "General Settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// PUBLIC: GET MAINTENANCE STATUS (no auth required)
// ----------------------------------------------------
export const getMaintenanceStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        maintenanceMode: process.env.MAINTENANCE_MODE === "true",
        maintenanceMessage: process.env.MAINTENANCE_MESSAGE || "We're currently performing maintenance. We'll be back shortly!",
        storeName: process.env.STORE_NAME || "SCHIP & STER",
        returnWindowDays: parseInt(process.env.RETURN_WINDOW_DAYS || "30", 10),
        returnsSystemEnabled: process.env.RETURNS_SYSTEM_ENABLED !== "false",
        refundsSystemEnabled: process.env.REFUNDS_SYSTEM_ENABLED !== "false",
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 8. GET SEO CONFIG
// ----------------------------------------------------
export const getSeoConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = {
      siteName: process.env.SEO_SITE_NAME || "Schip & Ster",
      titleTemplate: process.env.SEO_TITLE_TEMPLATE || "%s | Schip & Ster",
      defaultTitle: process.env.SEO_DEFAULT_TITLE || "Schip & Ster — Your Store",
      defaultDescription: process.env.SEO_DEFAULT_DESCRIPTION || "Discover thousands of products at the best prices.",
      defaultKeywords: process.env.SEO_DEFAULT_KEYWORDS || "ecommerce, shop, online",
      canonical: process.env.SEO_CANONICAL_URL || "https://schipenster.com",
      twitterHandle: process.env.SEO_TWITTER_HANDLE || "@schipster",
      ogImage: process.env.SEO_OG_IMAGE || "https://schipenster.com/og-image.png",
      indexable: process.env.SEO_INDEXABLE !== "false", // default true
      ga4: process.env.ANALYTICS_GA4 || "",
      gtm: process.env.ANALYTICS_GTM || "",
      metaPixel: process.env.ANALYTICS_META_PIXEL || "",
      tiktokPixel: process.env.ANALYTICS_TIKTOK_PIXEL || "",
      ga4PropertyId: process.env.GA4_PROPERTY_ID || "",
      ga4ClientEmail: (process.env.GA4_CLIENT_EMAIL || "").trim(),
      ga4PrivateKey: process.env.GA4_PRIVATE_KEY ? "••••••••••••••••••••" : "",
      hasGa4PrivateKey: Boolean(process.env.GA4_PRIVATE_KEY?.trim()),
      gscSiteUrl: process.env.GSC_SITE_URL || "",
      googleIntegration: getGoogleIntegrationStatus(),
    };

    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    next(error);
  }
};

import { getSeoPlaybook } from "../services/seoPlaybookService";

export const getPublicSeoConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playbook = await getSeoPlaybook();
    const config = {
      siteName: playbook.siteName,
      titleTemplate: playbook.titleTemplate,
      defaultTitle: process.env.SEO_DEFAULT_TITLE || "Schip & Ster — Your Store",
      defaultDescription: process.env.SEO_DEFAULT_DESCRIPTION || "Discover thousands of products at the best prices.",
      defaultKeywords: playbook.globalKeywords,
      globalKeywords: playbook.globalKeywords,
      descriptionCta: playbook.descriptionCta,
      mergeGlobalKeywords: playbook.mergeGlobalKeywords,
      brandVoice: playbook.brandVoice,
      geoFocus: playbook.geoFocus,
      canonical: process.env.SEO_CANONICAL_URL || "https://schipenster.com",
      twitterHandle: process.env.SEO_TWITTER_HANDLE || "@schipster",
      ogImage: process.env.SEO_OG_IMAGE || "https://schipenster.com/og-image.png",
      indexable: process.env.SEO_INDEXABLE !== "false",
      ga4: process.env.ANALYTICS_GA4 || "",
      gtm: process.env.ANALYTICS_GTM || "",
      metaPixel: process.env.ANALYTICS_META_PIXEL || "",
      tiktokPixel: process.env.ANALYTICS_TIKTOK_PIXEL || "",
    };

    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 9. UPDATE SEO CONFIG
// ----------------------------------------------------
export const updateSeoConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      siteName, titleTemplate, defaultTitle, defaultDescription, defaultKeywords,
      canonical, twitterHandle, ogImage, indexable,
      ga4, gtm, metaPixel, tiktokPixel,
      ga4PropertyId, ga4ClientEmail, ga4PrivateKey, gscSiteUrl
    } = req.body;

    const updates: Record<string, string> = {};
    if (siteName !== undefined) updates.SEO_SITE_NAME = siteName;
    if (titleTemplate !== undefined) updates.SEO_TITLE_TEMPLATE = titleTemplate;
    if (defaultTitle !== undefined) updates.SEO_DEFAULT_TITLE = defaultTitle;
    if (defaultDescription !== undefined) updates.SEO_DEFAULT_DESCRIPTION = defaultDescription;
    if (defaultKeywords !== undefined) updates.SEO_DEFAULT_KEYWORDS = defaultKeywords;
    if (canonical !== undefined) updates.SEO_CANONICAL_URL = canonical;
    if (twitterHandle !== undefined) updates.SEO_TWITTER_HANDLE = twitterHandle;
    if (ogImage !== undefined) updates.SEO_OG_IMAGE = ogImage;
    if (indexable !== undefined) updates.SEO_INDEXABLE = indexable ? "true" : "false";
    if (ga4 !== undefined) updates.ANALYTICS_GA4 = ga4;
    if (gtm !== undefined) updates.ANALYTICS_GTM = gtm;
    if (metaPixel !== undefined) updates.ANALYTICS_META_PIXEL = metaPixel;
    if (tiktokPixel !== undefined) updates.ANALYTICS_TIKTOK_PIXEL = tiktokPixel;
    if (ga4PropertyId !== undefined) updates.GA4_PROPERTY_ID = String(ga4PropertyId).trim();
    if (ga4ClientEmail !== undefined) updates.GA4_CLIENT_EMAIL = String(ga4ClientEmail).trim();

    if (ga4PrivateKey !== undefined && ga4PrivateKey !== "" && !ga4PrivateKey.includes("••")) {
      updates.GA4_PRIVATE_KEY = ga4PrivateKey;
    }
    if (gscSiteUrl !== undefined) {
      const trimmed = String(gscSiteUrl).trim();
      updates.GSC_SITE_URL = trimmed;
    }

    await saveSettings(updates);

    res.status(200).json({ success: true, message: "SEO configuration updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 10. GET ANALYTICS DATA
// ----------------------------------------------------
export const getAnalyticsDashboardData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const integration = getGoogleIntegrationStatus();
    if (!integration.ga4Ready) {
      res.status(200).json({
        success: true,
        ga4Data: null,
        integration,
        connected: false,
        error: "Add GA4 Property ID, service account email, and private key in CMS → SEO → Site & Analytics (or Analytics → Configure).",
      });
      return;
    }

    try {
      const ga4Data = await getGA4Data();
      res.status(200).json({
        success: true,
        ga4Data,
        integration,
        connected: true,
        error: ga4Data?.traffic?.length ? null : "GA4 connected — no traffic in the last 7 days yet.",
      });
    } catch (error: any) {
      res.status(200).json({
        success: true,
        ga4Data: null,
        integration,
        connected: false,
        error: error?.message || "Failed to fetch GA4 data",
      });
    }
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 11. GET ROBOTS.TXT
// ----------------------------------------------------
export const getRobotsTxt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const content = await getRobotsTxtContent();
    res.status(200).json({ success: true, robots: content });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 9. UPDATE ROBOTS.TXT
// ----------------------------------------------------
export const updateRobotsTxt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { robots } = req.body;
    const raw = typeof robots === "string" ? robots : "";
    const sanitized = normalizeRobotsTxtFromAi(raw);
    const validationError = getRobotsTxtValidationError(sanitized);
    await saveRobotsTxtContent(sanitized);
    res.status(200).json({
      success: true,
      robots: sanitized,
      message: validationError
        ? `robots.txt saved. Fixed invalid line(s): ${validationError}`
        : "robots.txt updated successfully",
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 11b. GET LLMS.TXT
// ----------------------------------------------------
export const getLlmsTxt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const content = await getLlmsTxtContent();
    res.status(200).json({ success: true, llms: content });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 11c. UPDATE LLMS.TXT
// ----------------------------------------------------
export const updateLlmsTxt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { llms } = req.body;
    const content = typeof llms === "string" ? llms.trim() : "";
    if (!content) {
      res.status(400).json({ success: false, error: "llms content is required." });
      return;
    }
    await saveLlmsTxtContent(content);
    res.status(200).json({ success: true, llms: content, message: "llms.txt updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 10. GENERATE SITEMAP
// ----------------------------------------------------
export const generateSitemap = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const baseUrl = (
      process.env.SEO_CANONICAL_URL ||
      process.env.CLIENT_URL ||
      process.env.STORE_URL ||
      "http://localhost:8080"
    ).replace(/\/$/, "");

    // Fetch dynamic content
    const products = await prisma.product.findMany({
      select: {
        slug: true,
        updatedAt: true
      }
    });
    const categories = await prisma.category.findMany({ select: { slug: true } });
    const brands = await prisma.brand.findMany({ select: { id: true } });
    const blogs = await prisma.blog.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
    const cmsPages = await prisma.cmsPage.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const addUrl = (loc: string, lastmod?: Date, changefreq = "weekly", priority = "0.8") => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${loc}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>${changefreq}</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += `  </url>\n`;
    };

    // Static Pages
    addUrl("/", new Date(), "daily", "1.0");
    addUrl("/categories", new Date(), "daily", "0.9");
    addUrl("/faqs", new Date(), "weekly", "0.8");
    addUrl("/blogs", new Date(), "weekly", "0.8");
    addUrl("/relief", undefined, "monthly", "0.6");

    // Products
    products.forEach(p => addUrl(`/product/${p.slug}`, p.updatedAt, "daily", "0.9"));
    // Categories
    categories.forEach(c => addUrl(`/category/${c.slug}`, undefined, "weekly", "0.8"));
    // Blogs
    blogs.forEach(b => addUrl(`/blogs/${b.slug}`, b.updatedAt, "monthly", "0.7"));
    // Dynamic CMS Pages
    cmsPages.forEach(p => addUrl(`/${p.slug}`, p.updatedAt, "monthly", "0.6"));

    xml += `</urlset>`;

    await saveSitemapXmlContent(xml);

    res.status(200).json({ success: true, message: "sitemap.xml generated successfully" });
  } catch (error: any) {
    next(error);
  }
};
