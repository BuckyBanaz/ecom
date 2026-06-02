import { Router } from "express";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/emailTemplateController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

// Apply auth middleware for all routes in this file
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailTemplateInput:
 *       type: object
 *       required:
 *         - name
 *         - subject
 *         - body
 *       properties:
 *         name:
 *           type: string
 *           description: Unique name of the template
 *         subject:
 *           type: string
 *         body:
 *           type: string
 *           description: HTML or text body of the email
 */

/**
 * @swagger
 * /api/v1/admin/email-templates:
 *   get:
 *     summary: Get all email templates
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of email templates
 */
router.get("/", getAllTemplates);

/**
 * @swagger
 * /api/v1/admin/email-templates/{id}:
 *   get:
 *     summary: Get email template by ID
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email template details
 */
router.get("/:id", getTemplateById);

/**
 * @swagger
 * /api/v1/admin/email-templates:
 *   post:
 *     summary: Create a new email template
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailTemplateInput'
 *     responses:
 *       201:
 *         description: Created email template
 */
router.post("/", createTemplate);

/**
 * @swagger
 * /api/v1/admin/email-templates/{id}:
 *   put:
 *     summary: Update an email template
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/EmailTemplateInput'
 *     responses:
 *       200:
 *         description: Updated email template
 */
router.put("/:id", updateTemplate);

/**
 * @swagger
 * /api/v1/admin/email-templates/{id}:
 *   delete:
 *     summary: Delete an email template
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted
 */
router.delete("/:id", deleteTemplate);

export default router;
