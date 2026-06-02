import { Router } from "express";
import { getCharges, createOrUpdateCharge, deleteCharge } from "../controllers/chargeController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Charges
 *   description: Store charges (taxes, shipping, extra fees) management APIs
 */

/**
 * @swagger
 * /api/v1/charges:
 *   get:
 *     summary: Retrieve active charges for shipping, tax, etc.
 *     tags: [Charges]
 *     responses:
 *       200:
 *         description: List of store charges
 */
router.get("/", authenticateJWT, getCharges);

// Admin-only write endpoints
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * @swagger
 * /api/v1/charges:
 *   post:
 *     summary: Create or update a store charge (Admin Only)
 *     tags: [Charges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - value
 *             properties:
 *               name:
 *                 type: string
 *                 example: GST
 *               type:
 *                 type: string
 *                 enum: [percentage, flat]
 *                 example: percentage
 *               value:
 *                 type: number
 *                 example: 18
 *               minFreeLimit:
 *                 type: number
 *                 example: 0
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Charge saved successfully
 */
router.post("/", createOrUpdateCharge);

/**
 * @swagger
 * /api/v1/charges/{id}:
 *   delete:
 *     summary: Delete a store charge (Admin Only)
 *     tags: [Charges]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Charge deleted successfully
 *       404:
 *         description: Charge not found
 */
router.delete("/:id", deleteCharge);

export default router;
