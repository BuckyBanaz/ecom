import { redis } from "../config/redis";
import { AppError } from "../middlewares/errorMiddleware";

export const redisService = {
  async setCache(key: string, data: any, ttlSeconds: number = 86400) {
    if (!redis) {
      console.warn("Redis is disabled, skipping cache write for", key);
      return;
    }
    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
  },

  async getCache<T>(key: string): Promise<T | null> {
    if (!redis) {
      console.warn("Redis is disabled, skipping cache read for", key);
      return null;
    }
    const data = await redis.get(key);
    return data ? JSON.parse(data) as T : null;
  },

  async delCache(key: string) {
    if (!redis) return;
    await redis.del(key);
  }
};
