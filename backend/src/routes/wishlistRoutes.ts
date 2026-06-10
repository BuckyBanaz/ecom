import express from "express";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlistController";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WishlistInput:
 *       type: object
 *       required:
 *         - productId
 *       properties:
 *         productId:
 *           type: string
 *           description: The ID of the product
 */

router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/wishlists:
 *   get:
 *     summary: Get user's wishlist
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorited products
 */
router.get("/", getWishlist);

/**
 * @swagger
 * /api/v1/wishlists:
 *   post:
 *     summary: Add a product to wishlist
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WishlistInput'
 *     responses:
 *       201:
 *         description: Product added to wishlist
 */
router.post("/", addToWishlist);

/**
 * @swagger
 * /api/v1/wishlists/{productId}:
 *   delete:
 *     summary: Remove a product from wishlist
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product removed from wishlist
 */
router.delete("/:productId", removeFromWishlist);

export default router;
