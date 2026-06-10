import { Router } from "express";
import {
  getHomepage,
  updateHomepage,
  getReliefPage,
  updateReliefPage,
  getStoreFeatures,
  updateStoreFeatures,
  getAllPages,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  getHeaderFooter,
  updateHeaderFooter
} from "../controllers/cmsController";
import { getPublicSeoConfig, getMaintenanceStatus } from "../controllers/adminSettingsController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: CMS
 *   description: API for managing CMS Homepage and Dynamic Pages
 */

/**
 * @swagger
 * /api/v1/cms/homepage:
 *   get:
 *     summary: Get homepage configuration
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: Homepage configuration data
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
router.get("/homepage", getHomepage);

/**
 * @swagger
 * /api/v1/cms/seo-config:
 *   get:
 *     summary: Get public SEO & Analytics config
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: SEO Configuration data
 */
router.get("/seo-config", getPublicSeoConfig);

/**
 * @swagger
 * /api/v1/cms/maintenance-status:
 *   get:
 *     summary: Get current maintenance mode status (public)
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: Maintenance status
 */
router.get("/maintenance-status", getMaintenanceStatus);


/**
 * @swagger
 * /api/v1/cms/homepage:
 *   put:
 *     summary: Update homepage configuration
 *     tags: [CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The entire JSON configuration for the homepage
 *     responses:
 *       200:
 *         description: Homepage configuration successfully updated
 *       500:
 *         description: Server error
 */
router.put("/homepage", updateHomepage);

/**
 * @swagger
 * /api/v1/cms/relief:
 *   get:
 *     summary: Get relief page configuration
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: Relief page configuration data
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
router.get("/relief", getReliefPage);

/**
 * @swagger
 * /api/v1/cms/relief:
 *   put:
 *     summary: Update relief page configuration
 *     tags: [CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The entire JSON configuration for the relief page
 *     responses:
 *       200:
 *         description: Relief page configuration successfully updated
 *       500:
 *         description: Server error
 */
router.put("/relief", updateReliefPage);

/**
 * @swagger
 * /api/v1/cms/features:
 *   get:
 *     summary: Get store features configuration
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: Store features data
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
router.get("/features", getStoreFeatures);

/**
 * @swagger
 * /api/v1/cms/features:
 *   put:
 *     summary: Update store features configuration
 *     tags: [CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 icon:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *     responses:
 *       200:
 *         description: Store features successfully updated
 *       500:
 *         description: Server error
 */
router.put("/features", updateStoreFeatures);

/**
 * @swagger
 * /api/v1/cms/pages:
 *   get:
 *     summary: Get all dynamic pages
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: List of dynamic pages
 *       500:
 *         description: Server error
 */
router.get("/pages", getAllPages);

/**
 * @swagger
 * /api/v1/cms/pages:
 *   post:
 *     summary: Create a new dynamic page
 *     tags: [CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               body:
 *                 type: string
 *               published:
 *                 type: boolean
 *               seoTitle:
 *                 type: string
 *               seoDesc:
 *                 type: string
 *               seoKeywords:
 *                 type: string
 *               seoImage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Page created successfully
 *       400:
 *         description: Page with slug already exists
 *       500:
 *         description: Server error
 */
router.post("/pages", createPage);

/**
 * @swagger
 * /api/v1/cms/header-footer:
 *   get:
 *     summary: Get header and footer configuration
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: Header & Footer configuration data
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
router.get("/header-footer", getHeaderFooter);

/**
 * @swagger
 * /api/v1/cms/header-footer:
 *   put:
 *     summary: Update header and footer configuration
 *     tags: [CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The entire JSON configuration for header and footer
 *     responses:
 *       200:
 *         description: Header & Footer configuration successfully updated
 *       500:
 *         description: Server error
 */
router.put("/header-footer", updateHeaderFooter);

/**
 * @swagger
 * /api/v1/cms/{slug}:
 *   get:
 *     summary: Get a dynamic page by its slug
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The page slug
 *     responses:
 *       200:
 *         description: Page details
 *       404:
 *         description: Page not found
 *       500:
 *         description: Server error
 */
router.get("/:slug", getPageBySlug);

/**
 * @swagger
 * /api/v1/cms/{slug}:
 *   put:
 *     summary: Update a dynamic page by slug
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The page slug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               newSlug:
 *                 type: string
 *               body:
 *                 type: string
 *               published:
 *                 type: boolean
 *               seoTitle:
 *                 type: string
 *               seoDesc:
 *                 type: string
 *               seoKeywords:
 *                 type: string
 *               seoImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Page updated successfully
 *       404:
 *         description: Page not found
 *       500:
 *         description: Server error
 */
router.put("/:slug", updatePage);

/**
 * @swagger
 * /api/v1/cms/{slug}:
 *   delete:
 *     summary: Delete a dynamic page by slug
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The page slug
 *     responses:
 *       200:
 *         description: Page deleted successfully
 *       500:
 *         description: Server error
 */
router.delete("/:slug", deletePage);

export default router;
