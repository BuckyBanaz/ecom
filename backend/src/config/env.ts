import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

// Production: load host-mounted .env.production (not ephemeral /app/.env)
function loadEnvFile(): void {
  if (process.env.NODE_ENV === "production") {
    if (process.env.SETTINGS_ENV_FILE) {
      const prodPath = path.resolve(process.env.SETTINGS_ENV_FILE);
      if (fs.existsSync(prodPath)) {
        dotenv.config({ path: prodPath });
        return;
      }
    } else {
      const inApp = path.resolve(process.cwd(), ".env.production");
      const atRepoRoot = path.resolve(process.cwd(), "../.env.production");
      
      if (fs.existsSync(inApp)) {
        dotenv.config({ path: inApp });
        return;
      } else if (fs.existsSync(atRepoRoot)) {
        dotenv.config({ path: atRepoRoot });
        return;
      }
    }
  }
  dotenv.config();
}

loadEnvFile();

const deriveApiUrl = (clientUrl: string, port: number): string => {
  try {
    const client = new URL(clientUrl);
    const host = client.hostname.replace(/^www\./, "");
    if (host === "localhost" || host === "127.0.0.1") {
      return `http://localhost:${port}`;
    }
    return `${client.protocol}//api.${host}`;
  } catch {
    return `http://localhost:${port}`;
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
  API_URL: config.API_URL ?? deriveApiUrl(config.CLIENT_URL, config.PORT),
};

const RUNTIME_ENV_KEYS = [
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

/** Sync admin-saved .env.production values into the cached env object. */
export function refreshEnvFromProcess(): void {
  const mutable = env as Record<string, string | number | undefined>;
  for (const key of RUNTIME_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      mutable[key] = value;
    }
  }
}

export type EnvType = typeof env;
