import Redis from "ioredis";
import { env } from "./env";

export let redis: Redis | null = null;

if (env.ENABLE_REDIS === "true") {
  // Initialize the Redis Client instance
  redis = new Redis(env.REDIS_URL, {
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
    if (redis) {
      await redis.quit();
    }
  });
} else {
  console.log("ℹ️ Redis client is disabled. Set ENABLE_REDIS=true to enable caching.");
}

export default redis;
