import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  completeConnection,
  disconnectDrive,
  getAuthUrl,
  getDriveStatus,
  getScheduleSettings,
  getScheduleState,
  isBackupRunning,
  runBackupToDrive,
  saveDriveCredentials,
  saveScheduleSettings,
  validateScheduleSettings,
  verifyState,
} from "../services/driveBackupService";

/** Where the admin may be sent back to after Google: the configured shop / admin URLs or localhost */
function allowedReturnOrigin(origin: unknown): string {
  const fallback = (process.env.CLIENT_URL || env.CLIENT_URL || process.env.STORE_URL || "").replace(/\/+$/, "");
  const value = String(origin || "").replace(/\/+$/, "");
  if (!value) return fallback;
  try {
    const url = new URL(value);
    const allowed = [process.env.CLIENT_URL, process.env.STORE_URL, env.CLIENT_URL]
      .filter(Boolean)
      .map((u) => new URL(String(u)).origin);
    if (allowed.includes(url.origin) || url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
  } catch {
    /* fall through */
  }
  return fallback;
}

export const getBackupScheduleHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [settings, state] = await Promise.all([getScheduleSettings(), getScheduleState()]);
    res.json({ success: true, settings, state: { ...state, running: isBackupRunning() }, drive: getDriveStatus() });
  } catch (error) {
    next(error);
  }
};

export const updateBackupScheduleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { settings, error } = validateScheduleSettings(req.body);
    if (!settings) {
      res.status(400).json({ success: false, message: error });
      return;
    }
    res.json({ success: true, settings: await saveScheduleSettings(settings) });
  } catch (error) {
    next(error);
  }
};

export const runBackupNowHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (isBackupRunning()) {
      res.status(409).json({ success: false, message: "A backup is already running" });
      return;
    }
    // Large backups take minutes: answer now, the page polls the schedule state
    void runBackupToDrive("manual");
    res.status(202).json({ success: true, message: "Backup started" });
  } catch (error) {
    next(error);
  }
};

export const saveDriveCredentialsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = String(req.body?.clientId || "").trim();
    const clientSecret = String(req.body?.clientSecret || "").trim();
    if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
      res.status(400).json({ success: false, message: "Client ID should end with .apps.googleusercontent.com" });
      return;
    }
    if (!clientSecret && !process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
      res.status(400).json({ success: false, message: "Client secret is required" });
      return;
    }
    await saveDriveCredentials(clientId, clientSecret);
    res.json({ success: true, drive: getDriveStatus() });
  } catch (error) {
    next(error);
  }
};

export const getDriveAuthUrlHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!getDriveStatus().configured) {
      res.status(400).json({ success: false, message: "Save the Google client ID and secret first" });
      return;
    }
    const url = getAuthUrl((req as AuthenticatedRequest).user?.id || "", allowedReturnOrigin(req.query.origin));
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
};

/** Public: Google redirects the browser here. Trust comes from the signed `state`. */
export const driveCallbackHandler = async (req: Request, res: Response): Promise<void> => {
  let origin = allowedReturnOrigin(undefined);
  const back = (params: Record<string, string>) =>
    res.redirect(`${origin}/admin/backups?${new URLSearchParams(params).toString()}`);
  try {
    const { returnOrigin } = verifyState(String(req.query.state || ""));
    origin = allowedReturnOrigin(returnOrigin);
    if (req.query.error) {
      back({ drive: "error", message: String(req.query.error) });
      return;
    }
    const { email } = await completeConnection(String(req.query.code || ""));
    back({ drive: "connected", email });
  } catch (err: any) {
    console.error("[DriveBackup] Connect failed:", err?.message || err);
    back({ drive: "error", message: err?.message || "Connection failed" });
  }
};

export const disconnectDriveHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await disconnectDrive();
    res.json({ success: true, drive: getDriveStatus() });
  } catch (error) {
    next(error);
  }
};
