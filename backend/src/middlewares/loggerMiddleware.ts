import { Request, Response, NextFunction } from "express";
import { addLog } from "../services/logStore";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    let statusEmoji = "ℹ️";
    let level: "info" | "warn" | "error" = "info";
    if (statusCode >= 500) {
      statusEmoji = "🚨";
      level = "error";
    } else if (statusCode >= 400) {
      statusEmoji = "⚠️";
      level = "warn";
    } else if (statusCode >= 300) {
      statusEmoji = "🔄";
    } else if (statusCode >= 200) {
      statusEmoji = "✅";
    }

    const message = `${method} ${originalUrl} - ${statusCode} - ${duration}ms`;

    addLog({
      level,
      type: "request",
      message,
      method,
      url: originalUrl,
      statusCode,
      durationMs: duration,
    });

    console.log(
      `${statusEmoji} [${new Date().toISOString()}] ${message}`
    );

    // Detailed debug logs for development environment
    if (process.env.NODE_ENV === "development") {
      if (Object.keys(req.query).length > 0) {
        console.log(`   🔍 Query Params: ${JSON.stringify(req.query)}`);
      }
      if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        const sensitiveKeys = ["password", "token", "accessToken", "refreshToken", "clientSecret", "oldPassword", "newPassword"];
        
        sensitiveKeys.forEach((key) => {
          if (key in sanitizedBody) {
            sanitizedBody[key] = "******";
          }
        });

        const bodyStr = JSON.stringify(sanitizedBody);
        if (bodyStr.length > 500) {
          console.log(`   📦 Body Payload: ${bodyStr.substring(0, 500)}... (truncated)`);
        } else {
          console.log(`   📦 Body Payload: ${bodyStr}`);
        }
      }
    }
  });

  next();
};
