import { Router } from "express";
import { 
  initiateCheckout, 
  verifyCheckoutSession, 
  getAllOrders, 
  getOrderById, 
  updateOrderStatus,
  getMyOrders,
  getMyOrderById,
  retryPayment,
  getInvoiceByToken,
  getSendcloudMethods,
  createSendcloudShipment,
  downloadSendcloudLabel
} from "../controllers/orderController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import { checkoutLimiter } from "../middlewares/rateLimitMiddleware";

const router = Router();

router.get("/debug-orders", async (req, res) => {
  const { prisma } = require("../config/db");
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  res.json({ message: "All orders cleared" });
});

// Public / Guest / User Checkout routes
/**
 * @swagger
 * /api/v1/orders/initiate:
 *   post:
 *     summary: Initiate checkout session
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Checkout session initiated
 */
router.post("/initiate", checkoutLimiter, initiateCheckout);
/**
 * @swagger
 * /api/v1/orders/verify/{sessionId}:
 *   get:
 *     summary: Verify a checkout session
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checkout session verified
 */
router.get("/verify/:sessionId", verifyCheckoutSession);

// Invoice via Token
/**
 * @swagger
 * /api/v1/orders/invoice/{token}:
 *   get:
 *     summary: Get invoice by secure token
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice data
 */
router.get("/invoice/:token", getInvoiceByToken);

// Customer Routes
/**
 * @swagger
 * /api/v1/orders/my:
 *   get:
 *     summary: Get all orders for the logged-in user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's orders
 */
router.get("/my", authenticateJWT, getMyOrders);
/**
 * @swagger
 * /api/v1/orders/my/{id}:
 *   get:
 *     summary: Get a specific order details for the logged-in user
 *     tags: [Orders]
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
 *         description: Order details
 */
router.get("/my/:id", authenticateJWT, getMyOrderById);
/**
 * @swagger
 * /api/v1/orders/my/{id}/pay:
 *   post:
 *     summary: Retry payment for a pending order
 *     tags: [Orders]
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
 *         description: Payment URL generated
 */
router.post("/my/:id/pay", authenticateJWT, retryPayment);

// Admin Routes
/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get("/", authenticateJWT, requireAdmin, getAllOrders);
/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order details by ID (Admin only)
 *     tags: [Orders]
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
 *         description: Order details
 */
router.get("/:id", authenticateJWT, requireAdmin, getOrderById);
/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
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
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.patch("/:id/status", authenticateJWT, requireAdmin, updateOrderStatus);

/**
 * @swagger
 * /api/v1/orders/sendcloud/methods:
 *   get:
 *     summary: Get available Sendcloud shipping methods (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available shipping methods
 */
router.get("/sendcloud/methods", authenticateJWT, requireAdmin, getSendcloudMethods);

/**
 * @swagger
 * /api/v1/orders/{id}/sendcloud/shipment:
 *   post:
 *     summary: Create Sendcloud shipment (Admin only)
 *     tags: [Orders]
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
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *               shippingMethodId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Shipment created
 */
router.post("/:id/sendcloud/shipment", authenticateJWT, requireAdmin, createSendcloudShipment);

/**
 * @swagger
 * /api/v1/orders/{id}/sendcloud/label:
 *   get:
 *     summary: Download Sendcloud shipment label (Admin only)
 *     tags: [Orders]
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
 *         description: PDF file stream
 */
router.get("/:id/sendcloud/label", authenticateJWT, requireAdmin, downloadSendcloudLabel);

export default router;
