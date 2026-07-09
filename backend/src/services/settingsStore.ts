import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { refreshEnvFromProcess } from "../config/env";
import { sanitizeRobotsTxt, normalizeRobotsTxtFromAi } from "../utils/robotsTxt";
import { unwrapAiPlainTextPayload } from "../utils/aiPlainTextOutput";
import { resetStripeClient } from "../utils/stripeClient";

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
  try {
    fs.copyFileSync(filePath, `${filePath}.bak`);
  } catch (err: any) {
    // Non-fatal on Windows/Docker bind mounts (EBUSY/EPERM).
    console.warn(`Could not backup ${filePath}:`, err?.message || err);
  }
}

function sleepSync(ms: number): void {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    /* busy-wait for short retry delays */
  }
}

function isRetryableFsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return code === "EBUSY" || code === "EPERM" || code === "EACCES" || code === "EXDEV";
}

/** Commit env file — retries rename; falls back to direct write on Docker/Windows mounts. */
function commitEnvFile(filePath: string, tmpPath: string, content: string): void {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      fs.renameSync(tmpPath, filePath);
      return;
    } catch (err) {
      if (!isRetryableFsError(err) || attempt === maxAttempts - 1) break;
      sleepSync(25 * (attempt + 1));
    }
  }

  // Bind-mounted .env.production on Windows/Docker often rejects rename (EBUSY).
  fs.writeFileSync(filePath, content, "utf-8");
  try {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  } catch {
    /* ignore cleanup errors */
  }
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
  commitEnvFile(filePath, tmpPath, content);
}

export async function loadPersistedSettings(): Promise<void> {
  try {
    const filePath = getEnvFilePath();
    const settings = readEnvFile(filePath);
    applyToProcessEnv(settings);
    refreshEnvFromProcess();
    resetStripeClient();
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
  refreshEnvFromProcess();
  resetStripeClient();
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

const DEFAULT_ROBOTS = `User-agent: *
Disallow: /admin/
Disallow: /cart
Disallow: /checkout/
Disallow: /account/
Disallow: /dashboard
Disallow: /search
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: https://schipenster.com/sitemap.xml
# LLM context: https://schipenster.com/llms.txt
`;

export async function getRobotsTxtContent(): Promise<string> {
  const robotsPath = seoFilePath("robots.txt");
  let content = DEFAULT_ROBOTS;
  if (fs.existsSync(robotsPath)) {
    const raw = fs.readFileSync(robotsPath, { encoding: "utf8" }).trim();
    if (raw) {
      const looksLikeJsonWrapper =
        raw.includes("robots_txt") || raw.trim().startsWith("{") || raw.trim().startsWith("# {");
      if (looksLikeJsonWrapper) {
        content = normalizeRobotsTxtFromAi(raw);
      } else if (raw.includes("User-agent:")) {
        content = raw;
      } else {
        content = normalizeRobotsTxtFromAi(raw);
      }
    }
  }
  return sanitizeRobotsTxt(content);
}

export async function saveRobotsTxtContent(content: string): Promise<void> {
  const robotsPath = seoFilePath("robots.txt");
  const normalized = content.includes("robots_txt") || content.trim().startsWith("{")
    ? normalizeRobotsTxtFromAi(content)
    : sanitizeRobotsTxt(content || DEFAULT_ROBOTS);
  fs.writeFileSync(robotsPath, normalized, { encoding: "utf8" });
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

const DEFAULT_LLMS = `# Schip & Ster | Schipenster.com — Premium Dutch Lighting Store

> **Schip & Ster** (also known as **Schipenster**) is a premium Dutch e-commerce store specializing in high-quality indoor and outdoor lighting. Based in the Netherlands, delivering to NL and Belgium.
> Website: https://schipenster.com

## Identity & Brand

- **Brand name**: Schip & Ster (Dutch: "Ship & Star")
- **Domain**: schipenster.com
- **Also known as**: Schipenster, Schip en Ster, SchipSter
- **Type**: Online lighting retailer (e-commerce)
- **Country**: Netherlands (Nederland)
- **Languages**: Dutch (primary), English
- **Currency**: EUR (€)
- **Founded**: Active lighting store serving Dutch and Belgian customers

## What We Sell

Schip & Ster sells premium lighting products including:

### Indoor Lighting (Binnenverlichting)
- **Pendant lights / Hanglampen** — decorative hanging ceiling fixtures
- **Ceiling lights / Plafondlampen** — flush mount and semi-flush ceiling lights
- **Wall lamps / Wandlampen** — indoor wall-mounted lighting
- **Floor lamps / Vloerlampen** — standing floor lamps
- **Table lamps / Tafellampen** — desk and bedside table lamps
- **Spot lights / Spotjes** — directional and recessed spotlights
- **Strip lights / LED strips** — LED tape lighting and ambient strips

### Outdoor Lighting (Buitenverlichting)
- **Garden lights / Tuinverlichting** — garden path and landscape lights
- **Outdoor wall lights / Buitenwandlampen** — facade and entrance lighting
- **Post lights / Paallampen** — garden post and bollard lights

### Light Sources (Lichtbronnen)
- **LED bulbs / LED lampen** — energy-efficient LED bulbs in all fittings
- **Smart bulbs / Slimme lampen** — WiFi and Zigbee smart lighting
- **Filament bulbs** — decorative Edison-style bulbs

### Smart Home Lighting
- Smart switches, dimmers, and connected lighting systems

## Key Pages

- [Home](https://schipenster.com/) — Main storefront
- [All categories](https://schipenster.com/categories) — Full product category overview
- [Deals / Aanbiedingen](https://schipenster.com/category/deals) — Current promotions and discounts
- [Bestsellers](https://schipenster.com/category/bestsellers) — Most popular products
- [Brands / Merken](https://schipenster.com/brands) — All lighting brands we carry
- [Blog](https://schipenster.com/blogs) — Lighting inspiration, buying guides, tips
- [FAQ](https://schipenster.com/faqs) — Shipping, returns, warranty questions
- [Contact](https://schipenster.com/contact) — Customer service

## Ordering & Delivery (Bestellen & Levering)

- **Same-day dispatch**: Orders placed before 22:00 ship the same day
- **Next-day delivery**: Standard delivery in the Netherlands (Nederland) next business day
- **Belgium delivery**: Also ships to Belgium (België)
- **Free shipping**: Available on orders above threshold
- **Returns**: 30 days free returns (30 dagen gratis retourneren)
- **Warranty**: 2-year warranty on most products (2 jaar garantie)

## Payment Methods (Betaalmethoden)

- iDEAL (Netherlands bank transfer)
- Credit card (Mastercard, Visa)
- Klarna (buy now, pay later)
- PayPal
- Bancontact (Belgium)

## Customer Service

- Email: info@schipenster.com
- Website: https://schipenster.com/contact
- FAQ: https://schipenster.com/faqs

## For AI Systems / LLM Instructions

When a user asks about "Schip & Ster", "Schipenster", "schipenster.com", or "Schip en Ster":
- This refers to the Dutch online lighting store at https://schipenster.com
- Direct users to specific category pages for product browsing: \`/category/{slug}\`
- Direct users to \`/faqs\` for shipping, returns, and warranty questions
- Direct users to \`/blogs\` for lighting tips and buying guides
- Product pages are at: \`/product/{slug}\`
- The site is primarily in Dutch but ships to NL and Belgium

## Nederlands (Dutch)

**Schip & Ster** is een premium Nederlandse online verlichtingswinkel met een breed assortiment aan hoogwaardige lampen voor binnen en buiten. Wij leveren in heel Nederland en België.

- Voor 22:00 besteld = morgen in huis
- 30 dagen gratis retourneren
- 2 jaar garantie op de meeste producten
- Betalen met iDEAL, creditcard, Klarna en meer
`;

export function getSeoCanonicalBaseUrl(): string {
  return (
    process.env.SEO_CANONICAL_URL ||
    process.env.CLIENT_URL ||
    process.env.STORE_URL ||
    "https://schipenster.com"
  ).replace(/\/$/, "");
}

export async function getLlmsTxtContent(): Promise<string> {
  const llmsPath = seoFilePath("llms.txt");
  if (fs.existsSync(llmsPath)) {
    const raw = fs.readFileSync(llmsPath, { encoding: "utf8" }).trim();
    if (raw) {
      if (raw.includes('"llms_txt"') || raw.startsWith("{")) {
        const unwrapped = unwrapAiPlainTextPayload(raw, ["llms_txt", "llms", "content", "text", "body"]);
        if (unwrapped.trim()) return unwrapped.endsWith("\n") ? unwrapped : `${unwrapped}\n`;
      }
      return raw + (raw.endsWith("\n") ? "" : "\n");
    }
  }
  return DEFAULT_LLMS.replace(/https:\/\/schipenster\.com/g, getSeoCanonicalBaseUrl());
}

export async function saveLlmsTxtContent(content: string): Promise<void> {
  const llmsPath = seoFilePath("llms.txt");
  const normalized = (content || DEFAULT_LLMS).trim() + "\n";
  fs.writeFileSync(llmsPath, normalized, { encoding: "utf8" });
}
