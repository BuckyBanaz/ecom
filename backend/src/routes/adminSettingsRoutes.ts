import { Router } from "express";
import { getSmtpSettings, updateSmtpSettings, testSmtpSettings, getPaymentSettings, updatePaymentSettings } from "../controllers/adminSettingsController";
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

export default router;
