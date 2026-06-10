import express from "express";
import { getProductReviews, createReview, getAllReviews, deleteReview } from "../controllers/reviewController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product reviews management endpoints
 */

/**
 * @swagger
 * /api/v1/reviews/product/{id}:
 *   get:
 *     summary: Get reviews for a specific product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID or slug
 *     responses:
 *       200:
 *         description: List of product reviews
 *       404:
 *         description: Product not found
 */
router.get("/product/:id", getProductReviews);

/**
 * @swagger
 * /api/v1/reviews/product/{id}:
 *   post:
 *     summary: Create a new review for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID or slug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rating
 *               - title
 *               - text
 *             properties:
 *               name:
 *                 type: string
 *               rating:
 *                 type: number
 *               title:
 *                 type: string
 *               text:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Product not found
 */
router.post("/product/:id", createReview);

/**
 * @swagger
 * /api/v1/reviews:
 *   get:
 *     summary: Get all reviews (Admin)
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all reviews
 */
router.get("/", getAllReviews);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Delete a review (Admin)
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */
router.delete("/:id", deleteReview);

export default router;
