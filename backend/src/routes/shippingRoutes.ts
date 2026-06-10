import { Router } from "express";
import { getPublicShippingConfig } from "../controllers/shippingController";

const router = Router();

/**
 * @swagger
 * /api/v1/shipping/config:
 *   get:
 *     summary: Get public shipping configuration
 *     tags: [Shipping]
 *     responses:
 *       200:
 *         description: Public shipping settings (fees, thresholds)
 */
router.get("/config", getPublicShippingConfig);

export default router;
