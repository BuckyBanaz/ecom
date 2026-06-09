import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../config/redis";
import { env } from "../config/env";

const limitMessage = {
  success: false,
  message: "Too many requests. Please slow down and try again later.",
};

const createStore = (prefix: string) => {
  if (env.ENABLE_REDIS !== "true" || !redis) return undefined;

  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => redis!.call(...args),
  });
};

const buildLimiter = (prefix: string, options: Partial<Options>) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: limitMessage,
    store: createStore(prefix),
    ...options,
  });

/** General API protection — 400 requests per 15 minutes per IP */
export const globalLimiter = buildLimiter("global", {
  windowMs: 15 * 60 * 1000,
  max: 400,
  skip: (req) =>
    req.path === "/health" ||
    req.path === "/api/v1/payments/webhook" ||
    req.originalUrl.startsWith("/uploads/"),
});

/** Login, register, OTP — 30 attempts per 15 minutes per IP */
export const authLimiter = buildLimiter("auth", {
  windowMs: 15 * 60 * 1000,
  max: 30,
});

/** Admin login — stricter */
export const adminAuthLimiter = buildLimiter("admin-auth", {
  windowMs: 15 * 60 * 1000,
  max: 15,
});

/** Checkout / payment initiation — 25 per hour per IP */
export const checkoutLimiter = buildLimiter("checkout", {
  windowMs: 60 * 60 * 1000,
  max: 25,
});

/** Password reset / OTP spam */
export const sensitiveAuthLimiter = buildLimiter("sensitive-auth", {
  windowMs: 60 * 60 * 1000,
  max: 10,
});
