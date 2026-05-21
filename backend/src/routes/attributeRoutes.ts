import { Router } from "express";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import {
  getAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  createAttributeValue,
  deleteAttributeValue,
} from "../controllers/attributeController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Attributes
 *   description: Attribute management APIs (EAV Schema)
 */

/**
 * @swagger
 * /api/v1/attributes:
 *   get:
 *     summary: Get all attributes
 *     tags: [Attributes]
 *     responses:
 *       200:
 *         description: List of attributes with their values
 */
router.get("/", getAttributes);

/**
 * @swagger
 * /api/v1/attributes/{id}:
 *   get:
 *     summary: Get attribute by ID
 *     tags: [Attributes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attribute details
 *       404:
 *         description: Attribute not found
 */
router.get("/:id", getAttributeById);

/**
 * @swagger
 * /api/v1/attributes:
 *   post:
 *     summary: Create a new attribute
 *     tags: [Attributes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [select, multi_select, range, boolean]
 *               visibility:
 *                 type: string
 *                 enum: [admin, filter, both]
 *               values:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - value
 *                   properties:
 *                     value:
 *                       type: string
 *                     colorCode:
 *                       type: string
 *     responses:
 *       201:
 *         description: Attribute created successfully
 */
router.post("/", authenticateJWT, requireAdmin, createAttribute);

/**
 * @swagger
 * /api/v1/attributes/{id}:
 *   put:
 *     summary: Update an existing attribute
 *     tags: [Attributes]
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
 *               type:
 *                 type: string
 *               visibility:
 *                 type: string
 *               values:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     value:
 *                       type: string
 *                     colorCode:
 *                       type: string
 *     responses:
 *       200:
 *         description: Attribute updated successfully
 *       404:
 *         description: Attribute not found
 */
router.put("/:id", authenticateJWT, requireAdmin, updateAttribute);

/**
 * @swagger
 * /api/v1/attributes/{id}:
 *   delete:
 *     summary: Delete an attribute
 *     tags: [Attributes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attribute deleted successfully
 *       404:
 *         description: Attribute not found
 */
router.delete("/:id", authenticateJWT, requireAdmin, deleteAttribute);

// Attribute values subroutes

/**
 * @swagger
 * /api/v1/attributes/{attributeId}/values:
 *   post:
 *     summary: Add a new value to an attribute
 *     tags: [Attributes]
 *     parameters:
 *       - in: path
 *         name: attributeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: string
 *               colorCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attribute value added successfully
 */
router.post("/:attributeId/values", authenticateJWT, requireAdmin, createAttributeValue);

/**
 * @swagger
 * /api/v1/attributes/values/{id}:
 *   delete:
 *     summary: Delete an attribute value
 *     tags: [Attributes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attribute value deleted successfully
 */
router.delete("/values/:id", authenticateJWT, requireAdmin, deleteAttributeValue);

export default router;
