import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/** Production always writes to the host-mounted .env.production — never ephemeral /app/.env */
function getEnvFilePath(): string {
  if (process.env.SETTINGS_ENV_FILE) {
    return path.resolve(process.env.SETTINGS_ENV_FILE);
  }

  if (process.env.NODE_ENV === "production") {
    const inApp = path.resolve(process.cwd(), ".env.production");
    const atRepoRoot = path.resolve(process.cwd(), "../.env.production");
    if (fs.existsSync(inApp)) return inApp;
    if (fs.existsSync(atRepoRoot)) return atRepoRoot;
    return inApp;
  }

  const localEnv = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(localEnv)) return localEnv;
  return path.resolve(process.cwd(), ".env");
}

function assertProductionSaveTarget(filePath: string): void {
  if (process.env.NODE_ENV !== "production") return;
  if (!filePath.endsWith(".env.production")) {
    throw new Error(
      `Refusing to save admin settings to ${filePath}. Use host-mounted .env.production.`
    );
  }
}

function ensureEnvFileDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function serializeEnvValue(value: string): string {
  if (value.includes("\n") || /[\s#"]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return value;
}

function applyToProcessEnv(updates: Record<string, string>): void {
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;
    process.env[key] = String(value);
  }
}

function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  return dotenv.parse(content);
}

function backupEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  fs.copyFileSync(filePath, `${filePath}.bak`);
}

function writeEnvUpdates(filePath: string, updates: Record<string, string>): void {
  assertProductionSaveTarget(filePath);
  ensureEnvFileDir(filePath);
  backupEnvFile(filePath);

  const lines: string[] = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8").split(/\r?\n/)
    : [];

  const updatedKeys = new Set<string>();
  const output = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) return line;

    const key = line.slice(0, eqIdx).trim();
    if (!(key in updates)) return line;

    updatedKeys.add(key);
    return `${key}=${serializeEnvValue(updates[key])}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      output.push(`${key}=${serializeEnvValue(value)}`);
    }
  }

  const body = output.join("\n");
  const content = body.endsWith("\n") ? body : `${body}\n`;
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, content, "utf-8");
  fs.renameSync(tmpPath, filePath);
}

export async function loadPersistedSettings(): Promise<void> {
  try {
    const filePath = getEnvFilePath();
    const settings = readEnvFile(filePath);
    applyToProcessEnv(settings);
    const keyCount = Object.keys(settings).length;
    if (keyCount > 0) {
      console.log(`✅ Loaded ${keyCount} persisted settings from ${filePath}`);
    }
    if (process.env.NODE_ENV === "production" && !fs.existsSync(filePath)) {
      console.warn(`⚠️ Persisted settings file missing: ${filePath}`);
    }
  } catch (error: any) {
    console.error("Failed to load persisted settings:", error?.message || error);
  }
}

export async function saveSettings(updates: Record<string, string>): Promise<void> {
  if (!updates || Object.keys(updates).length === 0) return;

  const filePath = getEnvFilePath();
  writeEnvUpdates(filePath, updates);
  applyToProcessEnv(updates);
  console.log(
    `✅ Saved ${Object.keys(updates).length} setting(s) to ${filePath} (persists across restarts)`
  );
}

export function getSettingsEnvFilePath(): string {
  return getEnvFilePath();
}

/** Stable SEO files dir — never use process.cwd() (can be "/" in Docker). */
function getSeoFilesDir(): string {
  if (process.env.SEO_FILES_DIR) {
    return path.resolve(process.env.SEO_FILES_DIR);
  }
  return path.resolve(__dirname, "../../seo");
}

function ensureSeoFilesDir(): string {
  const dir = getSeoFilesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function seoFilePath(name: string): string {
  return path.join(ensureSeoFilesDir(), name);
}

const DEFAULT_ROBOTS = "User-agent: *\nAllow: /\n";

export async function getRobotsTxtContent(): Promise<string> {
  const robotsPath = seoFilePath("robots.txt");
  if (fs.existsSync(robotsPath)) {
    return fs.readFileSync(robotsPath, "utf-8");
  }
  return DEFAULT_ROBOTS;
}

export async function saveRobotsTxtContent(content: string): Promise<void> {
  const robotsPath = seoFilePath("robots.txt");
  fs.writeFileSync(robotsPath, content || "", "utf-8");
}

export async function getSitemapXmlContent(): Promise<string | null> {
  const sitemapPath = seoFilePath("sitemap.xml");
  if (!fs.existsSync(sitemapPath)) return null;
  return fs.readFileSync(sitemapPath, "utf-8");
}

export async function saveSitemapXmlContent(content: string): Promise<void> {
  const sitemapPath = seoFilePath("sitemap.xml");
  fs.writeFileSync(sitemapPath, content, "utf-8");
}
