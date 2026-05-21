import { Request, Response, NextFunction } from "express";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    let statusEmoji = "ℹ️";
    if (statusCode >= 500) {
      statusEmoji = "🚨";
    } else if (statusCode >= 400) {
      statusEmoji = "⚠️";
    } else if (statusCode >= 300) {
      statusEmoji = "🔄";
    } else if (statusCode >= 200) {
      statusEmoji = "✅";
    }

    console.log(
      `${statusEmoji} [${new Date().toISOString()}] ${method} ${originalUrl} - Status: ${statusCode} - ${duration}ms`
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
