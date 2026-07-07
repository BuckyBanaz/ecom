import app from "./app";
import { env } from "./config/env";
import { addLog } from "./services/logStore";
import { loadPersistedSettings } from "./services/settingsStore";
import { execSync } from "child_process";
import path from "path";

// Programmatic DB schema sync and Prisma generation to avoid sandboxed CLI limitations
try {
  console.log("🔄 Syncing database schema and generating Prisma client...");
  const rootDir = path.resolve(__dirname, "..");
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", cwd: rootDir });
  console.log("✅ Database synced and Prisma client generated successfully!");
  
  // Programmatically copy hello folder images to parent uploads folder if they exist
  const fsExtra = require("fs");
  const helloDir = path.join(rootDir, "public/uploads/hello");
  const destDir = path.join(rootDir, "public/uploads");
  if (fsExtra.existsSync(helloDir)) {
    const files = fsExtra.readdirSync(helloDir);
    for (const file of files) {
      const srcFile = path.join(helloDir, file);
      const destFile = path.join(destDir, file);
      if (fsExtra.statSync(srcFile).isFile()) {
        fsExtra.copyFileSync(srcFile, destFile);
      }
    }
    console.log("✅ Programmatically copied hello folder images to parent uploads folder!");
  }
} catch (err: any) {
  console.error("⚠️ Programmatic startup operations failed:", err.message);
}

async function startServer() {
  await loadPersistedSettings();
  
  try {
    const { seedTemplates } = await import("./utils/seedTemplates");
    await seedTemplates();
    console.log("✅ Templates seeded on boot!");
  } catch (err: any) {
    console.warn("Template seeding failed:", err?.message || err);
  }


  try {
    const { recoverSeoJobOnBoot } = await import("./services/seoJobQueueService");
    await recoverSeoJobOnBoot();
  } catch (err: any) {
    console.warn("SEO job recovery skipped:", err?.message || err);
  }

  const server = app.listen(env.PORT, () => {
    const bootMessage = `Server booted on port ${env.PORT} in ${env.NODE_ENV} mode`;
    addLog({ level: "info", type: "system", message: bootMessage });
    console.log(`🚀 ${bootMessage}`);
  });

  // Hourly SEO autopilot check (weekly blog + auto optimize when enabled)
  if (env.NODE_ENV !== "test") {
    setInterval(async () => {
      try {
        const { getSeoAutopilotConfig } = await import("./services/seoAutopilotService");
        const { enqueueAutopilotRun } = await import("./services/seoJobQueueService");
        const cfg = await getSeoAutopilotConfig();
        if (!cfg.enabled) return;
        await enqueueAutopilotRun(false);
      } catch (err: any) {
        console.warn("SEO autopilot tick skipped:", err?.message || err);
      }
    }, 60 * 60 * 1000);
  }

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
}

startServer().catch((err) => {
  console.error("🚨 Failed to start server:", err);
  process.exit(1);
});
