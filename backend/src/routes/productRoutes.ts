import { Router } from "express";
import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: E-Commerce Product and Variant Catalog Management API
 */

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Retrieve list of products with filters, search and facets
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug to filter products by
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Comma-separated list of brand names
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Keyword search for product name and description
 *       - in: query
 *         name: isNewArrival
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter for products flagged as new arrivals
 *       - in: query
 *         name: isBestSelling
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter for products flagged as best sellers
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, price-asc, price-desc, rating]
 *         description: Sorting criteria
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Pagination page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Success response with products, facets, priceRange, pagination details
 *       500:
 *         description: Internal server error
 */
router.get("/", getProducts);

/**
 * @swagger
 * /api/v1/products/{slug}:
 *   get:
 *     summary: Retrieve single product by its slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique slug identifying the product
 *     responses:
 *       200:
 *         description: Product fetched successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.get("/:slug", getProductBySlug);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - categoryId
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nordic Style Chandelier
 *               slug:
 *                 type: string
 *                 example: nordic-style-chandelier
 *               brandId:
 *                 type: string
 *                 example: b-4
 *               categoryId:
 *                 type: string
 *                 example: indoor-lighting
 *               price:
 *                 type: number
 *                 example: 189.99
 *               oldPrice:
 *                 type: number
 *                 nullable: true
 *                 example: 249.99
 *               image:
 *                 type: string
 *                 example: /assets/cat-chandelier.jpg
 *               inStock:
 *                 type: boolean
 *                 default: true
 *               isNewArrival:
 *                 type: boolean
 *                 default: false
 *               isBestSelling:
 *                 type: boolean
 *                 default: false
 *               description:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               specs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *               attributes:
 *                 type: object
 *                 description: EAV dynamic attributes mapping
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Product created successfully
 *       500:
 *         description: Internal server error
 */
router.post("/", createProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update an existing product (Admin only)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the product to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               brandId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               price:
 *                 type: number
 *               oldPrice:
 *                 type: number
 *               image:
 *                 type: string
 *               inStock:
 *                 type: boolean
 *               isNewArrival:
 *                 type: boolean
 *               isBestSelling:
 *                 type: boolean
 *               description:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               specs:
 *                 type: array
 *               attributes:
 *                 type: object
 *               variants:
 *                 type: array
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", updateProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the product to delete
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", deleteProduct);

export default router;
