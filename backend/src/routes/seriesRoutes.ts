import { Router } from "express";
import {
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
} from "../controllers/seriesController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Series
 *   description: Series and Collections management APIs
 */

/**
 * @swagger
 * /api/v1/series:
 *   get:
 *     summary: Get all series collections
 *     tags: [Series]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filter series by associated brand ID
 *     responses:
 *       200:
 *         description: List of series collections
 */
router.get("/", getSeries);

/**
 * @swagger
 * /api/v1/series/{id}:
 *   get:
 *     summary: Get series by ID
 *     tags: [Series]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Series details object
 *       404:
 *         description: Series not found
 */
router.get("/:id", getSeriesById);

/**
 * @swagger
 * /api/v1/series:
 *   post:
 *     summary: Create a new series collection
 *     tags: [Series]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - brandId
 *             properties:
 *               name:
 *                 type: string
 *               brandId:
 *                 type: string
 *               logo:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Series created successfully
 */
router.post("/", createSeries);

/**
 * @swagger
 * /api/v1/series/{id}:
 *   put:
 *     summary: Update an existing series
 *     tags: [Series]
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
 *               brandId:
 *                 type: string
 *               logo:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Series updated successfully
 *       404:
 *         description: Series not found
 */
router.put("/:id", updateSeries);

/**
 * @swagger
 * /api/v1/series/{id}:
 *   delete:
 *     summary: Delete a series collection
 *     tags: [Series]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Series deleted successfully
 *       404:
 *         description: Series not found
 */
router.delete("/:id", deleteSeries);

export default router;
