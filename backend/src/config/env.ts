import dotenv from "dotenv";
import { z } from "zod";

// Load active environment variables
dotenv.config();

const deriveApiUrl = (clientUrl: string): string => {
  try {
    const client = new URL(clientUrl);
    const host = client.hostname.replace(/^www\./, "");
    return `${client.protocol}//api.${host}`;
  } catch {
    return "http://localhost:5000";
  }
};

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  ENABLE_REDIS: z.enum(["true", "false"]).default("false"),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

const config = parsed.data;

export const env = {
  ...config,
  API_URL: config.API_URL ?? deriveApiUrl(config.CLIENT_URL),
};

export type EnvType = typeof env;
