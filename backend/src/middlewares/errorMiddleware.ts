import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { addLog } from "../services/logStore";

/**
 * Custom operational API Error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express Global Error Handling Middleware
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Something went wrong on the server";

  addLog({
    level: statusCode >= 500 ? "error" : "warn",
    type: "error",
    message,
    statusCode,
    meta: {
      name: err.name,
      ...(env.NODE_ENV === "development" && err.stack ? { stack: err.stack } : {}),
    },
  });

  if (statusCode >= 500) {
    console.error("[Global Error Handler]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
