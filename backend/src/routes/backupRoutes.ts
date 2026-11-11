import { Router } from "express";
import {
  authorizeBackupDownload,
  createBackupHandler,
  createDownloadLinkHandler,
  deleteBackupHandler,
  downloadBackupHandler,
  listBackupsHandler,
} from "../controllers/backupController";
import {
  disconnectDriveHandler,
  driveCallbackHandler,
  getBackupScheduleHandler,
  getDriveAuthUrlHandler,
  runBackupNowHandler,
  saveDriveCredentialsHandler,
  updateBackupScheduleHandler,
} from "../controllers/driveBackupController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

// Before the router-wide auth: the browser follows these links natively, without an Authorization header
router.get("/google/callback", driveCallbackHandler);
router.get("/:id/download", authorizeBackupDownload, downloadBackupHandler);

router.use(authenticateJWT);
router.use(requireAdmin);

// Scheduled backups to Google Drive
router.get("/schedule", getBackupScheduleHandler);
router.put("/schedule", updateBackupScheduleHandler);
router.post("/schedule/run", runBackupNowHandler);
router.put("/google/credentials", saveDriveCredentialsHandler);
router.get("/google/auth-url", getDriveAuthUrlHandler);
router.post("/google/disconnect", disconnectDriveHandler);

router.get("/", listBackupsHandler);
router.post("/", createBackupHandler);
router.post("/:id/download-link", createDownloadLinkHandler);
router.delete("/:id", deleteBackupHandler);

export default router;
