import app from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  console.log(
    `🚀 Server successfully booted on http://localhost:${env.PORT} in [${env.NODE_ENV}] mode`
  );
});

// Centralized handlers for unhandled errors
process.on("unhandledRejection", (reason: Error) => {
  console.error("🚨 UNHANDLED REJECTION! Shutting down gracefully...");
  console.error(reason.stack || reason.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (error: Error) => {
  console.error("🚨 UNCAUGHT EXCEPTION! Shutting down immediately...");
  console.error(error.stack || error.message);
  process.exit(1);
});
