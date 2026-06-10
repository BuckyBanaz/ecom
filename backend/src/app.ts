import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./config/env";
import { errorHandler, AppError } from "./middlewares/errorMiddleware";
import { setupSwagger } from "./config/swagger";
import { requestLogger } from "./middlewares/loggerMiddleware";
import { globalLimiter } from "./middlewares/rateLimitMiddleware";
import redis from "./config/redis";
import { seedTemplates } from "./utils/seedTemplates";

// Run seed script on startup
seedTemplates();

const app = express();

// Behind Caddy reverse proxy in production (fixes express-rate-limit X-Forwarded-For warning)
app.set("trust proxy", 1);

// Register HTTP request logger middleware
app.use(requestLogger);

// Rate limiting — protects against brute-force and abuse
app.use(globalLimiter);

const allowedOrigins = new Set(
  [
    env.CLIENT_URL,
    env.API_URL,
    "https://schipenster.com",
    "https://www.schipenster.com",
    "https://api.schipenster.com",
    "https://jenkins.schipenster.com",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:5000",
  ].filter(Boolean)
);

// Configure Cross-Origin Resource Sharing matching our React client URL
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, same-server) or known frontends
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Webhook needs raw body to verify Stripe signature
import { handleStripeWebhook } from "./controllers/paymentController";
app.post("/api/v1/payments/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

// Standard HTTP middleware parsers (increased limits for base64 image uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve uploaded media statically
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Serve Swagger API Interactive documentation UI
setupSwagger(app);

// Health probe endpoint for monitoring
app.get("/health", async (_req, res) => {
  let redisStatus: "connected" | "disabled" | "error" = "disabled";

  if (env.ENABLE_REDIS === "true") {
    if (!redis) {
      redisStatus = "error";
    } else {
      try {
        const pong = await redis.ping();
        redisStatus = pong === "PONG" ? "connected" : "error";
      } catch {
        redisStatus = "error";
      }
    }
  }

  const healthy = redisStatus !== "error";

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? "healthy" : "degraded",
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});


import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import brandRoutes from "./routes/brandRoutes";
import seriesRoutes from "./routes/seriesRoutes";
import attributeRoutes from "./routes/attributeRoutes";
import megaMenuRoutes from "./routes/megaMenuRoutes";
import blogRoutes from "./routes/blogRoutes";
import cmsRoutes from "./routes/cmsRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import addressRoutes from "./routes/addressRoutes";
import wishlistRoutes from "./routes/wishlistRoutes";
import adminSettingsRoutes from "./routes/adminSettingsRoutes";
import emailTemplateRoutes from "./routes/emailTemplateRoutes";
import couponRoutes from "./routes/couponRoutes";
import chargeRoutes from "./routes/chargeRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import shippingRoutes from "./routes/shippingRoutes";
import orderRoutes from "./routes/orderRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import configRoutes from "./routes/configRoutes";
import logsRoutes from "./routes/logsRoutes";
import backupRoutes from "./routes/backupRoutes";
import { getRobotsTxtContent, getSitemapXmlContent } from "./services/settingsStore";

app.get("/robots.txt", async (_req, res, next) => {
  try {
    const content = await getRobotsTxtContent();
    res.type("text/plain").send(content);
  } catch (error) {
    next(error);
  }
});

app.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const content = await getSitemapXmlContent();
    if (!content) {
      res.status(404).type("text/plain").send("Sitemap not generated yet. Generate it from Admin → CMS → SEO.");
      return;
    }
    res.type("application/xml").send(content);
  } catch (error) {
    next(error);
  }
});

// Aggregate API Routers will be registered here under /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/wishlists", wishlistRoutes);
app.use("/api/v1/series", seriesRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/attributes", attributeRoutes);
app.use("/api/v1/megamenus", megaMenuRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/cms", cmsRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/config", configRoutes);
app.use("/api/v1/admin/settings", adminSettingsRoutes);
app.use("/api/v1/admin/logs", logsRoutes);
app.use("/api/v1/admin/backups", backupRoutes);
app.use("/api/v1/admin/email-templates", emailTemplateRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/charges", chargeRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/shipping", shippingRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// Catch-all route for 404 undefined paths
app.all("*", (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global exception formatter
app.use(errorHandler);

export default app;
