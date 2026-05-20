import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler, AppError } from "./middlewares/errorMiddleware";
import { setupSwagger } from "./config/swagger";
import "./config/redis";

const app = express();

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

// Aggregate API Routers will be registered here under /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/series", seriesRoutes);
app.use("/api/v1/attributes", attributeRoutes);
app.use("/api/v1/megamenus", megaMenuRoutes);

// Catch-all route for 404 undefined paths
app.all("*", (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global exception formatter
app.use(errorHandler);

export default app;
