import { Router } from "express";
import { getSmtpSettings, updateSmtpSettings, testSmtpSettings, getPaymentSettings, updatePaymentSettings, getAuthSettings, updateAuthSettings, getRobotsTxt, updateRobotsTxt, generateSitemap, getSeoConfig, updateSeoConfig, getAnalyticsDashboardData } from "../controllers/adminSettingsController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

// Apply auth middleware for all routes in this file
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * @swagger
 * /api/v1/admin/settings/payments:
 *   get:
 *     summary: Get payment configuration settings
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment gateway configuration details
 */
router.get("/payments", getPaymentSettings);

/**
 * @swagger
 * /api/v1/admin/settings/payments:
 *   put:
 *     summary: Update payment configuration settings
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ideal:
 *                 type: boolean
 *               card:
 *                 type: boolean
 *               paypal:
 *                 type: boolean
 *               klarna:
 *                 type: boolean
 *               bancontact:
 *                 type: boolean
 *               stripePublishableKey:
 *                 type: string
 *               stripeSecretKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/payments", updatePaymentSettings);

/**
 * @swagger
 * /api/v1/admin/settings/smtp:
 *   get:
 *     summary: Get SMTP configuration
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SMTP Configuration details
 */
router.get("/smtp", getSmtpSettings);

/**
 * @swagger
 * /api/v1/admin/settings/smtp:
 *   put:
 *     summary: Update SMTP configuration
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               encryption:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               fromName:
 *                 type: string
 *               fromEmail:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/smtp", updateSmtpSettings);

/**
 * @swagger
 * /api/v1/admin/settings/smtp/test:
 *   post:
 *     summary: Send a test email using SMTP
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test email sent successfully
 */
router.post("/smtp/test", testSmtpSettings);

import { getSecuredShippingConfig, updateShippingConfig } from "../controllers/shippingController";

/**
 * @swagger
 * /api/v1/admin/settings/shipping/config:
 *   get:
 *     summary: Get secured shipping configuration
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Secured shipping configuration including Sendcloud
 */
router.get("/shipping/config", getSecuredShippingConfig);

/**
 * @swagger
 * /api/v1/admin/settings/shipping/config:
 *   put:
 *     summary: Update secured shipping configuration
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               freeShippingThreshold:
 *                 type: number
 *               standardShippingFee:
 *                 type: number
 *               expressShippingFee:
 *                 type: number
 *               sameDayDelivery:
 *                 type: boolean
 *               deliveryCutoffTime:
 *                 type: string
 *               sendcloudEnabled:
 *                 type: boolean
 *               sendcloudPublicKey:
 *                 type: string
 *               sendcloudSecretKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/shipping/config", updateShippingConfig);

  /**
 * @swagger
 * /api/v1/admin/settings/auth:
 *   get:
 *     summary: Get auth configuration settings
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auth configuration details
 */
router.get("/auth", getAuthSettings);

/**
 * @swagger
 * /api/v1/admin/settings/auth:
 *   put:
 *     summary: Update auth configuration settings
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailLogin:
 *                 type: boolean
 *               phoneLogin:
 *                 type: boolean
 *               smsProvider:
 *                 type: string
 *               twilioAccountSid:
 *                 type: string
 *               twilioAuthToken:
 *                 type: string
 *               twilioSenderNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/auth", updateAuthSettings);

/**
 * @swagger
 * /api/v1/admin/settings/seo/config:
 *   get:
 *     summary: Get SEO and Analytics configuration
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SEO configuration details
 */
router.get("/seo/config", getSeoConfig);

/**
 * @swagger
 * /api/v1/admin/settings/seo/config:
 *   put:
 *     summary: Update SEO and Analytics configuration
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/seo/config", updateSeoConfig);

/**
 * @swagger
 * /api/v1/admin/settings/seo/robots:
 *   get:
 *     summary: Get robots.txt content
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: robots.txt content
 */
router.get("/seo/robots", getRobotsTxt);

/**
 * @swagger
 * /api/v1/admin/settings/seo/robots:
 *   put:
 *     summary: Update robots.txt content
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               robots:
 *                 type: string
 *     responses:
 *       200:
 *         description: robots.txt updated successfully
 */
router.put("/seo/robots", updateRobotsTxt);

/**
 * @swagger
 * /api/v1/admin/settings/seo/sitemap:
 *   post:
 *     summary: Generate sitemap.xml
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sitemap generated successfully
 */
router.post("/seo/sitemap", generateSitemap);

/**
 * @swagger
 * /api/v1/admin/settings/analytics/data:
 *   get:
 *     summary: Get live Analytics data
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live Analytics data
 */
router.get("/analytics/data", getAnalyticsDashboardData);

export default router;
