import { Router } from "express";
import {
  createBackupHandler,
  deleteBackupHandler,
  downloadBackupHandler,
  listBackupsHandler,
} from "../controllers/backupController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticateJWT);
router.use(requireAdmin);

router.get("/", listBackupsHandler);
router.post("/", createBackupHandler);
router.get("/:id/download", downloadBackupHandler);
router.delete("/:id", deleteBackupHandler);

export default router;
