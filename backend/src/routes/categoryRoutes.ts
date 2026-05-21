import { Router } from "express";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category catalog management and parent-child tree mapping
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Retrieve all categories
 *     description: Gets flat array of all categories and structured hierarchical category trees.
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Array of categories and tree
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                 tree:
 *                   type: array
 */
router.get("/", getCategories);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: Retrieve a single category with populated parent and children.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   type: object
 *       404:
 *         description: Category not found
 */
router.get("/:id", getCategoryById);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               image:
 *                 type: string
 *               group:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post("/", authenticateJWT, requireAdmin, createCategory);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update an existing category
 *     tags: [Categories]
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
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               image:
 *                 type: string
 *               group:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
router.put("/:id", authenticateJWT, requireAdmin, updateCategory);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 */
router.delete("/:id", authenticateJWT, requireAdmin, deleteCategory);

export default router;
