import { Router } from "express";
import {
  authorizeBackupDownload,
  createBackupHandler,
  createDownloadLinkHandler,
  deleteBackupHandler,
  downloadBackupHandler,
  listBackupsHandler,
} from "../controllers/backupController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

// Before the router-wide auth: the browser follows this link natively, without an Authorization header
router.get("/:id/download", authorizeBackupDownload, downloadBackupHandler);

router.use(authenticateJWT);
router.use(requireAdmin);

router.get("/", listBackupsHandler);
router.post("/", createBackupHandler);
router.post("/:id/download-link", createDownloadLinkHandler);
router.delete("/:id", deleteBackupHandler);

export default router;
