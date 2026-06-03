import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./config/env";
import { errorHandler, AppError } from "./middlewares/errorMiddleware";
import { setupSwagger } from "./config/swagger";
import { requestLogger } from "./middlewares/loggerMiddleware";
import "./config/redis";
import { seedTemplates } from "./utils/seedTemplates";

// Run seed script on startup
seedTemplates();

const app = express();

// Register HTTP request logger middleware
app.use(requestLogger);

// Configure Cross-Origin Resource Sharing matching our React client URL
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Standard HTTP middleware parsers (increased limits for base64 image uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve uploaded media statically
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Serve Swagger API Interactive documentation UI
setupSwagger(app);

// Health probe endpoint for monitoring
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
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
app.use("/api/v1/admin/settings", adminSettingsRoutes);
app.use("/api/v1/admin/email-templates", emailTemplateRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/charges", chargeRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/shipping", shippingRoutes);

// Catch-all route for 404 undefined paths
app.all("*", (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global exception formatter
app.use(errorHandler);

export default app;
