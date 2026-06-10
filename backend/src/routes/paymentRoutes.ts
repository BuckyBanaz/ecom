import { Router } from "express";
import { getPaymentConfig, createPaymentIntent } from "../controllers/paymentController";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Settings
 *   description: Administrator and environment settings configuration
 */

/**
 * @swagger
 * /api/v1/payments/config:
 *   get:
 *     summary: Retrieve public Stripe Publishable Key
 *     tags: [Admin Settings]
 *     responses:
 *       200:
 *         description: Stripe publishable key configuration object
 */
router.get("/config", authenticateJWT, getPaymentConfig);

/**
 * @swagger
 * /api/v1/payments/create-payment-intent:
 *   post:
 *     summary: Create a Stripe Payment Intent
 *     tags: [Admin Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount in Euros/Dollars (e.g. 99.95)
 *                 example: 99.95
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g. eur, usd)
 *                 example: eur
 *     responses:
 *       200:
 *         description: Payment intent details containing client secret
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Stripe is not configured
 */
router.post("/create-payment-intent", authenticateJWT, createPaymentIntent);

export default router;
