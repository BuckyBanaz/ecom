import Redis from "ioredis";
import { env } from "./env";

// Initialize the Redis Client instance
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  reconnectOnError: (err) => {
    console.warn("⚠️ Redis reconnecting due to error:", err.message);
    return true;
  },
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
  await redis.quit();
});

export default redis;
