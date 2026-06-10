import fs from "fs";
import path from "path";
import dotenv from "dotenv";

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

function writeEnvUpdates(filePath: string, updates: Record<string, string>): void {
  ensureEnvFileDir(filePath);

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
  fs.writeFileSync(filePath, body.endsWith("\n") ? body : `${body}\n`, "utf-8");
}

export async function loadPersistedSettings(): Promise<void> {
  try {
    const filePath = getEnvFilePath();
    const settings = readEnvFile(filePath);
    applyToProcessEnv(settings);
    if (Object.keys(settings).length > 0) {
      console.log(`Loaded settings from ${filePath}`);
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
}

export function getSettingsEnvFilePath(): string {
  return getEnvFilePath();
}

function resolvePublicFile(name: string): string {
  const inBackend = path.resolve(process.cwd(), "public", name);
  const inFrontend = path.resolve(process.cwd(), "../frontend/public", name);
  if (fs.existsSync(path.dirname(inBackend)) || process.env.NODE_ENV === "production") {
    return inBackend;
  }
  if (fs.existsSync(path.dirname(inFrontend))) return inFrontend;
  return inBackend;
}

const DEFAULT_ROBOTS = "User-agent: *\nAllow: /\n";

export async function getRobotsTxtContent(): Promise<string> {
  const robotsPath = resolvePublicFile("robots.txt");
  if (fs.existsSync(robotsPath)) {
    return fs.readFileSync(robotsPath, "utf-8");
  }
  return DEFAULT_ROBOTS;
}

export async function saveRobotsTxtContent(content: string): Promise<void> {
  const robotsPath = resolvePublicFile("robots.txt");
  ensureEnvFileDir(robotsPath);
  fs.writeFileSync(robotsPath, content || "", "utf-8");
}

export async function saveSitemapXmlContent(content: string): Promise<void> {
  const sitemapPath = resolvePublicFile("sitemap.xml");
  ensureEnvFileDir(sitemapPath);
  fs.writeFileSync(sitemapPath, content, "utf-8");
}
