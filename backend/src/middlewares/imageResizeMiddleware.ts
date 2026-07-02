import { Request, Response, NextFunction } from "express";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOADS_DIR = path.join(__dirname, "../../public/uploads");
const CACHE_DIR = path.join(UPLOADS_DIR, "_cache");
const ALLOWED_WIDTHS = new Set([320, 480, 640, 800, 960, 1200, 1600]);
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

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
    await fsp.mkdir(path.dirname(cachePath), { recursive: true });
    const ext = path.extname(relativePath).toLowerCase();
    let pipeline = sharp(fullPath).rotate().resize({
      width: w,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (ext === ".png") {
      await pipeline.png({ compressionLevel: 9 }).toFile(cachePath);
    } else if (ext === ".webp") {
      await pipeline.webp({ quality: 82 }).toFile(cachePath);
    } else {
      await pipeline.jpeg({ quality: 78, mozjpeg: true }).toFile(cachePath);
    }

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
