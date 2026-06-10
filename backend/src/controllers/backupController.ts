import { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import { AppError } from "../middlewares/errorMiddleware";
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
