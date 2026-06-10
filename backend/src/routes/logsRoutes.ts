import { Router } from "express";
import { listLogs, logsStats, purgeLogs } from "../controllers/logsController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin Logs
 *   description: In-memory request and error logs for admin monitoring
 */

/**
 * @swagger
 * /api/v1/admin/logs:
 *   get:
 *     summary: List recent application logs
 *     description: Returns the latest in-memory request, error, and system logs captured by the backend. Stores up to 1000 entries until server restart.
 *     tags: [Admin Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 100
 *         description: Number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warn, error]
 *         description: Filter by log level
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [request, error, system]
 *         description: Filter by log type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in message, URL, method, or status code
 *     responses:
 *       200:
 *         description: Paginated log list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 42
 *                 limit:
 *                   type: integer
 *                   example: 100
 *                 offset:
 *                   type: integer
 *                   example: 0
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "1717954321-1"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       level:
 *                         type: string
 *                         enum: [info, warn, error]
 *                       type:
 *                         type: string
 *                         enum: [request, error, system]
 *                       message:
 *                         type: string
 *                         example: "GET /api/v1/categories - 200 - 8ms"
 *                       method:
 *                         type: string
 *                         example: GET
 *                       url:
 *                         type: string
 *                         example: /api/v1/categories
 *                       statusCode:
 *                         type: integer
 *                         example: 200
 *                       durationMs:
 *                         type: integer
 *                         example: 8
 *                       meta:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get("/", listLogs);

/**
 * @swagger
 * /api/v1/admin/logs/stats:
 *   get:
 *     summary: Get log statistics
 *     description: Returns summary metrics for stored logs, including counts from the last hour and the most recent log entry.
 *     tags: [Admin Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Log statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalStored:
 *                       type: integer
 *                       example: 120
 *                     maxStored:
 *                       type: integer
 *                       example: 1000
 *                     lastHour:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         errors:
 *                           type: integer
 *                         warnings:
 *                           type: integer
 *                         requests:
 *                           type: integer
 *                         avgDurationMs:
 *                           type: number
 *                     latest:
 *                       type: object
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get("/stats", logsStats);

/**
 * @swagger
 * /api/v1/admin/logs:
 *   delete:
 *     summary: Clear all stored logs
 *     description: Removes all in-memory logs. Only superadmin users can perform this action.
 *     tags: [Admin Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logs cleared successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only superadmin can clear logs
 */
router.delete("/", purgeLogs);

export default router;
