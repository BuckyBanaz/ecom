import { Router } from "express";
import { sendcloudWebhookHandler } from "../services/sendcloud/webhook";

const router = Router();

/**
 * @swagger
 * /api/v1/webhooks/sendcloud:
 *   post:
 *     summary: Handle Sendcloud Webhooks
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhook received successfully
 */
router.post("/sendcloud", sendcloudWebhookHandler);

export default router;
