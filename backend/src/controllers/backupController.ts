import { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../middlewares/errorMiddleware";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import {
  BackupType,
  createBackup,
  deleteBackup,
  getBackupPath,
  listBackups,
} from "../services/backupService";

const VALID_TYPES: BackupType[] = ["database", "uploads", "full"];

export const listBackupsHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backups = await listBackups();
    res.status(200).json({ success: true, backups });
  } catch (error) {
    next(error);
  }
};

export const createBackupHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = req.body?.type as BackupType;
    if (!VALID_TYPES.includes(type)) {
      return next(new AppError("Invalid backup type. Use database, uploads, or full.", 400));
    }

    const backup = await createBackup(type);
    res.status(201).json({ success: true, backup, message: `${type} backup created successfully` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    if (message.includes("pg_dump") || message.includes("Docker")) {
      return next(new AppError(message, 503));
    }
    next(error);
  }
};

const DOWNLOAD_LINK_PURPOSE = "backup-download";

/**
 * Short-lived link (2 min, one file) so the browser can download natively — streamed to disk with
 * its own progress bar instead of buffering the whole archive in memory via fetch().
 */
export const createDownloadLinkHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = path.basename(req.params.id);
    try {
      await fs.access(getBackupPath(id));
    } catch {
      return next(new AppError("Backup not found", 404));
    }

    const token = jwt.sign({ purpose: DOWNLOAD_LINK_PURPOSE, backupId: id }, env.JWT_SECRET, { expiresIn: "2m" });
    res.status(200).json({ success: true, token });
  } catch (error) {
    next(error);
  }
};

/** Download accepts either a link token (?dl=) for this exact file, or a normal admin session. */
export const authorizeBackupDownload = (req: Request, res: Response, next: NextFunction): void => {
  const linkToken = req.query.dl;
  if (typeof linkToken !== "string") {
    authenticateJWT(req as any, res, (err?: unknown) => (err ? next(err) : requireAdmin(req as any, res, next)));
    return;
  }

  try {
    const payload = jwt.verify(linkToken, env.JWT_SECRET) as { purpose?: string; backupId?: string };
    if (payload.purpose === DOWNLOAD_LINK_PURPOSE && payload.backupId === path.basename(req.params.id)) {
      next();
      return;
    }
  } catch {
    // fall through
  }
  next(new AppError("Download link is invalid or has expired. Click download again.", 401));
};

export const downloadBackupHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const filePath = getBackupPath(id);

    try {
      await fs.access(filePath);
    } catch {
      return next(new AppError("Backup not found", 404));
    }

    res.download(filePath, id);
  } catch (error) {
    next(error);
  }
};

export const deleteBackupHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const filePath = getBackupPath(id);

    try {
      await fs.access(filePath);
    } catch {
      return next(new AppError("Backup not found", 404));
    }

    await deleteBackup(id);
    res.status(200).json({ success: true, message: "Backup deleted" });
  } catch (error) {
    next(error);
  }
};
