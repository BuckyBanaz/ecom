import { Router } from "express";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import {
  getMegaMenus,
  getMegaMenuById,
  createMegaMenu,
  updateMegaMenu,
  deleteMegaMenu,
  syncMegaMenus
} from "../controllers/megaMenuController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Mega Menu CMS
 *   description: Dynamic navigation mapping and CMS structure endpoints
 */

/**
 * @swagger
 * /api/v1/megamenus:
 *   get:
 *     summary: Get all mega menus
 *     tags: [Mega Menu CMS]
 *     responses:
 *       200:
 *         description: Array of mega menus
 */
router.get("/", getMegaMenus);

/**
 * @swagger
 * /api/v1/megamenus/sync:
 *   post:
 *     summary: Synchronize the entire mega menu hierarchy
 *     description: Deletes all existing mega menus and recreates them from the provided array to maintain order.
 *     tags: [Mega Menu CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               menus:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     sections:
 *                       type: array
 *                     pageTitle:
 *                       type: string
 *                     pageBlocks:
 *                       type: array
 *                     seoTitle:
 *                       type: string
 *                     seoDescription:
 *                       type: string
 *                     seoKeywords:
 *                       type: string
 *                     seoImage:
 *                       type: string
 *     responses:
 *       200:
 *         description: Sync successful
 */
router.post("/sync", authenticateJWT, requireAdmin, syncMegaMenus);

/**
 * @swagger
 * /api/v1/megamenus/{id}:
 *   get:
 *     summary: Get a mega menu by ID
 *     tags: [Mega Menu CMS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mega menu object
 *       404:
 *         description: Mega menu not found
 */
router.get("/:id", getMegaMenuById);

/**
 * @swagger
 * /api/v1/megamenus:
 *   post:
 *     summary: Create a new mega menu node
 *     tags: [Mega Menu CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menu
 *               - slug
 *             properties:
 *               menu:
 *                 type: string
 *               slug:
 *                 type: string
 *               sections:
 *                 type: array
 *               pageTitle:
 *                 type: string
 *               pageBlocks:
 *                 type: array
 *               seoTitle:
 *                 type: string
 *               seoDescription:
 *                 type: string
 *               seoKeywords:
 *                 type: string
 *               seoImage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mega menu created successfully
 */
router.post("/", authenticateJWT, requireAdmin, createMegaMenu);

/**
 * @swagger
 * /api/v1/megamenus/{id}:
 *   put:
 *     summary: Update a mega menu node
 *     tags: [Mega Menu CMS]
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
 *               menu:
 *                 type: string
 *               slug:
 *                 type: string
 *               sections:
 *                 type: array
 *               pageTitle:
 *                 type: string
 *               pageBlocks:
 *                 type: array
 *               seoTitle:
 *                 type: string
 *               seoDescription:
 *                 type: string
 *               seoKeywords:
 *                 type: string
 *               seoImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mega menu updated successfully
 */
router.put("/:id", authenticateJWT, requireAdmin, updateMegaMenu);

/**
 * @swagger
 * /api/v1/megamenus/{id}:
 *   delete:
 *     summary: Delete a mega menu node
 *     tags: [Mega Menu CMS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mega menu deleted successfully
 */
router.delete("/:id", authenticateJWT, requireAdmin, deleteMegaMenu);

export default router;
