import { Router } from "express";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blogController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Blogs
 *   description: Blog content management API
 */

/**
 * @swagger
 * /api/v1/blogs:
 *   get:
 *     summary: Retrieve all blogs
 *     tags: [Blogs]
 *     parameters:
 *       - in: query
 *         name: published
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by published status
 *     responses:
 *       200:
 *         description: List of blogs
 */
router.get("/", getBlogs);

/**
 * @swagger
 * /api/v1/blogs/{id}:
 *   get:
 *     summary: Retrieve a blog by ID
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog details
 *       404:
 *         description: Blog not found
 */
router.get("/:id", getBlogById);

/**
 * @swagger
 * /api/v1/blogs:
 *   post:
 *     summary: Create a new blog
 *     tags: [Blogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               body:
 *                 type: string
 *               cover:
 *                 type: string
 *                 nullable: true
 *               author:
 *                 type: string
 *               published:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Blog created
 */
router.post("/", authenticateJWT, requireAdmin, createBlog);

/**
 * @swagger
 * /api/v1/blogs/{id}:
 *   put:
 *     summary: Update a blog
 *     tags: [Blogs]
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
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               body:
 *                 type: string
 *               cover:
 *                 type: string
 *                 nullable: true
 *               author:
 *                 type: string
 *               published:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Blog updated
 *       404:
 *         description: Blog not found
 */
router.put("/:id", authenticateJWT, requireAdmin, updateBlog);

/**
 * @swagger
 * /api/v1/blogs/{id}:
 *   delete:
 *     summary: Delete a blog
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog deleted
 *       404:
 *         description: Blog not found
 */
router.delete("/:id", authenticateJWT, requireAdmin, deleteBlog);

export default router;
