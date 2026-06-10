import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const MAX_DIMENSION = 1920;
const MIN_SAVINGS_BYTES = 8 * 1024;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const SKIP_EXT = new Set([".gif", ".svg", ".ico"]);

export type OptimizeResult = {
  path: string;
  optimized: boolean;
  beforeBytes: number;
  afterBytes: number;
  error?: string;
};

async function collectImageFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImageFiles(fullPath)));
    } else if (IMAGE_EXT.test(entry.name) && !SKIP_EXT.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function optimizeImageAtPath(fullPath: string): Promise<OptimizeResult> {
  const ext = path.extname(fullPath).toLowerCase();
  const relative = path.basename(fullPath);

  if (SKIP_EXT.has(ext) || !IMAGE_EXT.test(relative)) {
    const stat = await fs.stat(fullPath);
    return { path: relative, optimized: false, beforeBytes: stat.size, afterBytes: stat.size };
  }

  const stat = await fs.stat(fullPath);
  const beforeBytes = stat.size;

  try {
    const pipeline = sharp(fullPath).rotate().resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

    let buffer: Buffer;
    if (ext === ".png") {
      buffer = await pipeline.png({ compressionLevel: 9, effort: 6 }).toBuffer();
    } else if (ext === ".webp") {
      buffer = await pipeline.webp({ quality: 82 }).toBuffer();
    } else {
      buffer = await pipeline.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    }

    if (buffer.length >= beforeBytes - MIN_SAVINGS_BYTES) {
      return { path: relative, optimized: false, beforeBytes, afterBytes: beforeBytes };
    }

    await fs.writeFile(fullPath, buffer);
    return { path: relative, optimized: true, beforeBytes, afterBytes: buffer.length };
  } catch (error: any) {
    return {
      path: relative,
      optimized: false,
      beforeBytes,
      afterBytes: beforeBytes,
      error: error?.message || "Optimization failed",
    };
  }
}

export async function optimizeImagesInUploads(
  uploadsDir: string,
  options: { paths?: string[]; folder?: string; recursive?: boolean },
  resolveSafePath: (subPath: string) => { fullPath: string; relativePath: string },
): Promise<OptimizeResult[]> {
  let targetFiles: string[] = [];

  if (options.paths?.length) {
    targetFiles = options.paths.map((p) => resolveSafePath(p).fullPath);
  } else {
    const { fullPath } = resolveSafePath(options.folder || "");
    if (options.recursive !== false) {
      targetFiles = await collectImageFiles(fullPath);
    } else {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      targetFiles = entries
        .filter((e) => e.isFile() && IMAGE_EXT.test(e.name))
        .map((e) => path.join(fullPath, e.name));
    }
  }

  const results: OptimizeResult[] = [];
  for (const filePath of targetFiles) {
    const rel = path.relative(uploadsDir, filePath).replace(/\\/g, "/");
    const result = await optimizeImageAtPath(filePath);
    results.push({ ...result, path: rel });
  }

  return results;
}
