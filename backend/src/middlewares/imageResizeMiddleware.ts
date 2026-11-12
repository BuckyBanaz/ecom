import { Request, Response, NextFunction } from "express";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOADS_DIR = path.join(__dirname, "../../public/uploads");
const CACHE_DIR = path.join(UPLOADS_DIR, "_cache");
const ALLOWED_WIDTHS = new Set([320, 480, 640, 800, 960, 1200, 1600]);
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/**
 * A page with many new images used to start one sharp job per image per width at the same time, filling the
 * CPU and the libuv thread pool (also used by file reads and DNS), so every request slowed down. Now each
 * variant is generated once (concurrent requests share the job) and at most MAX_PARALLEL run at a time.
 */
const MAX_PARALLEL = 2;
const inflight = new Map<string, Promise<void>>();
let active = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function generateVariant(fullPath: string, cachePath: string, w: number, ext: string) {
  await fsp.mkdir(path.dirname(cachePath), { recursive: true });
  // Temp name + rename: a half-written file is never served
  const tmpPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  const pipeline = sharp(fullPath).rotate().resize({ width: w, fit: "inside", withoutEnlargement: true });
  try {
    if (ext === ".png") await pipeline.png({ compressionLevel: 6 }).toFile(tmpPath);
    else if (ext === ".webp") await pipeline.webp({ quality: 82, effort: 2 }).toFile(tmpPath);
    else await pipeline.jpeg({ quality: 78, mozjpeg: false }).toFile(tmpPath);
    await fsp.rename(tmpPath, cachePath);
  } catch (err) {
    await fsp.rm(tmpPath, { force: true });
    throw err;
  }
}

/** Serve ?w= resized variants for GET /uploads/* requests. Falls through to static when no width. */
export async function serveResizedUpload(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") return next();

  const w = parseInt(String(req.query.w ?? ""), 10);
  if (!ALLOWED_WIDTHS.has(w)) return next();

  const relativePath = req.path.replace(/^\//, "");
  if (!relativePath || relativePath.startsWith("_cache/")) return next();

  const fullPath = path.normalize(path.join(UPLOADS_DIR, relativePath));
  if (!fullPath.startsWith(UPLOADS_DIR) || !IMAGE_EXT.test(relativePath)) return next();

  try {
    await fsp.access(fullPath, fs.constants.R_OK);
  } catch {
    return next();
  }

  const cachePath = path.join(CACHE_DIR, `w${w}`, relativePath);

  try {
    await fsp.access(cachePath, fs.constants.R_OK);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", contentTypeForPath(cachePath));
    res.sendFile(cachePath);
    return;
  } catch {
    // generate below
  }

  try {
    let job = inflight.get(cachePath);
    if (!job) {
      const ext = path.extname(relativePath).toLowerCase();
      job = withSlot(() => generateVariant(fullPath, cachePath, w, ext)).finally(() => inflight.delete(cachePath));
      inflight.set(cachePath, job);
    }
    await job;

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", contentTypeForPath(cachePath));
    res.sendFile(cachePath);
  } catch (error) {
    console.error("Image resize failed:", relativePath, error);
    next();
  }
}

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}
