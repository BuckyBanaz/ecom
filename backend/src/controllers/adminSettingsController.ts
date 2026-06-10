import { Request, Response, NextFunction } from "express";
import { getGA4Data } from "../services/analyticsService";
import { AppError } from "../middlewares/errorMiddleware";
import {
  saveSettings,
  getRobotsTxtContent,
  saveRobotsTxtContent,
  saveSitemapXmlContent,
} from "../services/settingsStore";

import { prisma } from "../config/db";

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
    const settings = {
      emailLogin: process.env.AUTH_ENABLE_EMAIL !== "false", // default to true
      phoneLogin: process.env.AUTH_ENABLE_PHONE === "true",
      registerMethod: process.env.AUTH_REGISTER_METHOD || "both", // "both", "email_only", "phone_only"
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
// GET GENERAL SETTINGS (Store info + Maintenance Mode)
// ----------------------------------------------------
export const getGeneralSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = {
      storeName: process.env.STORE_NAME || "SCHIP & STER",
      storeUrl: process.env.STORE_URL || "https://schipandster.nl",
      supportEmail: process.env.SUPPORT_EMAIL || "support@schipandster.nl",
      currency: process.env.STORE_CURRENCY || "EUR",
      maintenanceMode: process.env.MAINTENANCE_MODE === "true",
      maintenanceMessage: process.env.MAINTENANCE_MESSAGE || "We're currently performing maintenance. We'll be back shortly!",
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
    const { storeName, storeUrl, supportEmail, currency, maintenanceMode, maintenanceMessage } = req.body;

    const updates: Record<string, string> = {};
    if (storeName !== undefined) updates.STORE_NAME = storeName;
    if (storeUrl !== undefined) updates.STORE_URL = storeUrl;
    if (supportEmail !== undefined) updates.SUPPORT_EMAIL = supportEmail;
    if (currency !== undefined) updates.STORE_CURRENCY = currency;
    if (maintenanceMode !== undefined) updates.MAINTENANCE_MODE = maintenanceMode ? "true" : "false";
    if (maintenanceMessage !== undefined) updates.MAINTENANCE_MESSAGE = maintenanceMessage;

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
      canonical: process.env.SEO_CANONICAL_URL || "https://schip-ster.example.com",
      twitterHandle: process.env.SEO_TWITTER_HANDLE || "@schipster",
      ogImage: process.env.SEO_OG_IMAGE || "",
      indexable: process.env.SEO_INDEXABLE !== "false", // default true
      ga4: process.env.ANALYTICS_GA4 || "",
      gtm: process.env.ANALYTICS_GTM || "",
      metaPixel: process.env.ANALYTICS_META_PIXEL || "",
      tiktokPixel: process.env.ANALYTICS_TIKTOK_PIXEL || "",
      ga4PropertyId: process.env.GA4_PROPERTY_ID || "",
      ga4ClientEmail: process.env.GA4_CLIENT_EMAIL || "",
      ga4PrivateKey: process.env.GA4_PRIVATE_KEY ? "••••••••••••••••••••" : "",
    };

    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    next(error);
  }
};

export const getPublicSeoConfig = async (
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
      canonical: process.env.SEO_CANONICAL_URL || "https://schip-ster.example.com",
      twitterHandle: process.env.SEO_TWITTER_HANDLE || "@schipster",
      ogImage: process.env.SEO_OG_IMAGE || "",
      indexable: process.env.SEO_INDEXABLE !== "false", // default true
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
      ga4PropertyId, ga4ClientEmail, ga4PrivateKey
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
    if (ga4PropertyId !== undefined) updates.GA4_PROPERTY_ID = ga4PropertyId;
    if (ga4ClientEmail !== undefined) updates.GA4_CLIENT_EMAIL = ga4ClientEmail;
    
    if (ga4PrivateKey !== undefined && ga4PrivateKey !== "" && !ga4PrivateKey.includes("••")) {
      updates.GA4_PRIVATE_KEY = ga4PrivateKey;
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
    const ga4Data = await getGA4Data();
    res.status(200).json({ success: true, ga4Data });
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
    await saveRobotsTxtContent(robots || "");
    res.status(200).json({ success: true, message: "robots.txt updated successfully" });
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
    const baseUrl = process.env.CLIENT_URL || process.env.STORE_URL || "http://localhost:8080";

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
    addUrl("/shop", new Date(), "daily", "0.9");
    addUrl("/brands", new Date(), "weekly", "0.8");
    addUrl("/blogs", new Date(), "weekly", "0.8");
    addUrl("/account", undefined, "monthly", "0.5");
    addUrl("/relief", undefined, "monthly", "0.6");

    // Products
    products.forEach(p => addUrl(`/product/${p.slug}`, p.updatedAt, "daily", "0.9"));
    // Categories
    categories.forEach(c => addUrl(`/category/${c.slug}`, undefined, "weekly", "0.8"));
    // Brands
    brands.forEach(b => addUrl(`/brand/${b.id}`, undefined, "weekly", "0.8"));
    // Blogs
    blogs.forEach(b => addUrl(`/blog/${b.slug}`, b.updatedAt, "monthly", "0.7"));
    // Dynamic CMS Pages
    cmsPages.forEach(p => addUrl(`/${p.slug}`, p.updatedAt, "monthly", "0.6"));

    xml += `</urlset>`;

    await saveSitemapXmlContent(xml);

    res.status(200).json({ success: true, message: "sitemap.xml generated successfully" });
  } catch (error: any) {
    next(error);
  }
};
