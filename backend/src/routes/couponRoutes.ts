import { Router } from "express";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from "../controllers/couponController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon and discount offer management APIs
 */

/**
 * @swagger
 * /api/v1/coupons/validate:
 *   post:
 *     summary: Validate a coupon code for discount
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - orderValue
 *             properties:
 *               code:
 *                 type: string
 *                 example: EXTRA20
 *               orderValue:
 *                 type: number
 *                 example: 1000
 *     responses:
 *       200:
 *         description: Coupon validated successfully
 *       400:
 *         description: Coupon invalid or expired
 */
router.post("/validate", authenticateJWT, validateCoupon);

// Admin-only CRUD operations
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * @swagger
 * /api/v1/coupons:
 *   get:
 *     summary: Get all coupons (Admin Only)
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: List of all coupon codes
 */
router.get("/", getCoupons);

/**
 * @swagger
 * /api/v1/coupons:
 *   post:
 *     summary: Create a new coupon code (Admin Only)
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - value
 *             properties:
 *               code:
 *                 type: string
 *                 example: FLAT50
 *               discountType:
 *                 type: string
 *                 enum: [percentage, flat]
 *                 example: flat
 *               value:
 *                 type: number
 *                 example: 50
 *               minOrderValue:
 *                 type: number
 *                 example: 499
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-12-31T23:59:59.000Z"
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */
router.post("/", createCoupon);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   put:
 *     summary: Update an existing coupon (Admin Only)
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [percentage, flat]
 *               value:
 *                 type: number
 *               minOrderValue:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       404:
 *         description: Coupon not found
 */
router.put("/:id", updateCoupon);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   delete:
 *     summary: Delete a coupon (Admin Only)
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 *       404:
 *         description: Coupon not found
 */
router.delete("/:id", deleteCoupon);

export default router;
