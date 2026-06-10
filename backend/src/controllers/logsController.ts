import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { AppError } from "../middlewares/errorMiddleware";
import { clearLogs, getLogs, getLogStats, LogLevel, LogType } from "../services/logStore";

export const listLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const level = req.query.level as LogLevel | undefined;
    const type = req.query.type as LogType | undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const result = getLogs({ limit, offset, level, type, search });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const logsStats = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ success: true, stats: getLogStats() });
  } catch (error) {
    next(error);
  }
};

export const purgeLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== "superadmin") {
      throw new AppError("Only superadmin can clear logs", 403);
    }

    clearLogs();
    res.status(200).json({ success: true, message: "Logs cleared successfully" });
  } catch (error) {
    next(error);
  }
};
