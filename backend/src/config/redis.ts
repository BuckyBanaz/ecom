import Redis from "ioredis";
import { env } from "./env";

export let redis: Redis | null = null;
/**
 * Separate connection for the rate limiter, which runs on EVERY request: it gives up fast (500 ms, one
 * retry) so a slow or reconnecting Redis cannot stall the whole site. OTP/caching keep the patient client.
 */
export let rateLimitRedis: Redis | null = null;

if (env.ENABLE_REDIS === "true") {
  // Initialize the Redis Client instance
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 3000,
    lazyConnect: false,
    reconnectOnError: (err) => {
      console.warn("⚠️ Redis reconnecting due to error:", err.message);
      return true;
    },
  });

  rateLimitRedis = redis.duplicate({ commandTimeout: 500, maxRetriesPerRequest: 1 });
  rateLimitRedis.on("error", (error) => {
    console.error("❌ Redis (rate limiter) error:", error.message);
  });

  // Redis connection event listeners
  redis.on("connect", () => {
    console.log("⚡ Redis client connected successfully!");
  });

  redis.on("error", (error) => {
    console.error("❌ Redis connection failed:", error.message);
  });

  // Support graceful shutdown of Redis client during server shutdown
  process.on("beforeExit", async () => {
    if (redis) {
      await redis.quit();
    }
    if (rateLimitRedis) {
      await rateLimitRedis.quit();
    }
  });
} else {
  console.log("ℹ️ Redis client is disabled. Set ENABLE_REDIS=true to enable caching.");
}

export default redis;
