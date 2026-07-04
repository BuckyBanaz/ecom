import express from "express";
import multer from "multer";
import {
  createReturn,
  getMyReturns,
  cancelReturn,
  listReturns,
  listRefunds,
  getReturnById,
  approveReturn,
  rejectReturn,
  createReturnShipment,
  markReturnReceived,
  manualProcessRefund,
  downloadMyReturnLabel,
  downloadReturnLabel,
  createReplacementOrder,
} from "../controllers/returnController";
import {
  authenticateJWT,
  validateUserExists,
  requireAdmin,
} from "../middlewares/authMiddleware";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

router.post("/", authenticateJWT, validateUserExists, upload.array("photos", 5), createReturn);
router.get("/my", authenticateJWT, getMyReturns);
router.get("/my/:id/label", authenticateJWT, downloadMyReturnLabel);
router.delete("/:id", authenticateJWT, cancelReturn);

router.get("/", authenticateJWT, requireAdmin, listReturns);
router.get("/refunds", authenticateJWT, requireAdmin, listRefunds);
router.get("/:id/label", authenticateJWT, requireAdmin, downloadReturnLabel);
router.get("/:id", authenticateJWT, requireAdmin, getReturnById);
router.patch("/:id/approve", authenticateJWT, requireAdmin, approveReturn);
router.patch("/:id/reject", authenticateJWT, requireAdmin, rejectReturn);
router.patch("/:id/receive", authenticateJWT, requireAdmin, markReturnReceived);
router.patch("/:id/refund", authenticateJWT, requireAdmin, manualProcessRefund);
router.post("/:id/return-shipment", authenticateJWT, requireAdmin, createReturnShipment);
router.post("/:id/replacement-order", authenticateJWT, requireAdmin, createReplacementOrder);

export default router;
