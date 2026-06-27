import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const MAX_DIMENSION = 1920;
const AI_MAX_DIMENSION = parseInt(process.env.AI_IMAGE_MAX_PX || "1600", 10);
const AI_WEBP_QUALITY = parseInt(process.env.AI_IMAGE_QUALITY || "82", 10);
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

/** Compress in-memory image (AI uploads / Gemini output) before writing to disk. */
export async function compressImageBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({
      width: AI_MAX_DIMENSION,
      height: AI_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: AI_WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

export type SavedCompressedImage = {
  filename: string;
  publicPath: string;
  beforeBytes: number;
  afterBytes: number;
};

/** Write compressed WebP to a directory; returns URL path under /uploads/... */
export async function saveCompressedImageToDir(
  input: Buffer,
  dir: string,
  urlPrefix: string,
  namePrefix: string,
): Promise<SavedCompressedImage> {
  const beforeBytes = input.length;
  const compressed = await compressImageBuffer(input);
  const filename = `${namePrefix}-${Date.now()}.webp`;
  await fs.writeFile(path.join(dir, filename), compressed);

  if (compressed.length < beforeBytes) {
    console.log(
      `📦 Image compressed: ${Math.round(beforeBytes / 1024)}KB → ${Math.round(compressed.length / 1024)}KB (${filename})`,
    );
  }

  return {
    filename,
    publicPath: `${urlPrefix}/${filename}`,
    beforeBytes,
    afterBytes: compressed.length,
  };
}
