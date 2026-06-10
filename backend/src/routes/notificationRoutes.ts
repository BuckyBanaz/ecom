import { Router } from "express";
import { getNotifications, createNotification } from "../controllers/notificationController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get all admin notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter notifications by category (e.g. 'orders')
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get("/", authenticateJWT, requireAdmin, getNotifications);

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Create an admin notification manually
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               category:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Notification created
 */
router.post("/", authenticateJWT, requireAdmin, createNotification);

export default router;
