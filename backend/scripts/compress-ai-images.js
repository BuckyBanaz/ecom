/**
 * Compress existing AI images (JPG/PNG → WebP) and update product/draft URLs in DB.
 *
 *   node scripts/compress-ai-images.js
 *   DRY_RUN=1 node scripts/compress-ai-images.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";
const AI_MAX_PX = parseInt(process.env.AI_IMAGE_MAX_PX || "1200", 10);
const AI_QUALITY = parseInt(process.env.AI_IMAGE_QUALITY || "75", 10);
const AI_DIR = path.join(__dirname, "../public/uploads/ai-images");

async function compressBuffer(input) {
  const pipeline = sharp(input)
    .rotate()
    .resize({
      width: AI_MAX_PX,
      height: AI_MAX_PX,
      fit: "inside",
      withoutEnlargement: true,
    });
  try {
    return await pipeline.webp({ quality: AI_QUALITY, effort: 5, smartSubsample: true }).toBuffer();
  } catch {
    return pipeline.jpeg({ quality: AI_QUALITY, mozjpeg: true }).toBuffer();
  }
}

async function convertFile(fullPath) {
  const beforeBytes = fs.statSync(fullPath).size;
  const compressed = await compressBuffer(fs.readFileSync(fullPath));
  const webpPath = fullPath.replace(/\.(jpe?g|png)$/i, ".webp");
  const oldRelative = `/uploads/ai-images/${path.basename(fullPath)}`;
  const newRelative = `/uploads/ai-images/${path.basename(webpPath)}`;

  if (!DRY_RUN) {
    fs.writeFileSync(webpPath, compressed);
    if (compressed.length < beforeBytes) fs.unlinkSync(fullPath);
  }

  return { oldPath: oldRelative, newPath: newRelative, beforeBytes, afterBytes: compressed.length };
}

function remapUrl(url, pathMap) {
  if (!url || typeof url !== "string") return url;
  for (const [oldP, newP] of pathMap.entries()) {
    if (url === oldP || url.includes(oldP)) return url.replace(oldP, newP);
    const oldBase = path.basename(oldP);
    const newBase = path.basename(newP);
    if (url.includes(oldBase)) return url.replace(oldBase, newBase);
  }
  return url;
}

async function main() {
  if (!fs.existsSync(AI_DIR)) {
    console.log("No ai-images folder.");
    return;
  }

  const files = fs.readdirSync(AI_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
  console.log(`Found ${files.length} uncompressed AI image(s)${DRY_RUN ? " (dry run)" : ""}`);

  const pathMap = new Map();
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const fullPath = path.join(AI_DIR, file);
    const result = await convertFile(fullPath);
    pathMap.set(result.oldPath, result.newPath);
    totalBefore += result.beforeBytes;
    totalAfter += result.afterBytes;
    console.log(
      `${DRY_RUN ? "[dry-run] " : ""}${file} → ${path.basename(result.newPath)} (${Math.round(result.beforeBytes / 1024)}KB → ${Math.round(result.afterBytes / 1024)}KB)`,
    );
  }

  if (DRY_RUN || pathMap.size === 0) return;

  let productsUpdated = 0;
  for (const p of await prisma.product.findMany({ select: { id: true, image: true, images: true } })) {
    const newImage = remapUrl(p.image, pathMap);
    const newImages = (p.images || []).map((u) => remapUrl(u, pathMap));
    if (newImage === p.image && JSON.stringify(newImages) === JSON.stringify(p.images || [])) continue;
    await prisma.product.update({ where: { id: p.id }, data: { image: newImage, images: newImages } });
    productsUpdated++;
  }

  let draftsUpdated = 0;
  for (const d of await prisma.productDraft.findMany({ select: { id: true, payload: true } })) {
    const payload = d.payload;
    if (!payload || typeof payload !== "object") continue;
    const next = { ...payload };
    let changed = false;
    if (typeof next.image === "string") {
      const v = remapUrl(next.image, pathMap);
      if (v !== next.image) {
        next.image = v;
        changed = true;
      }
    }
    if (Array.isArray(next.images)) {
      const v = next.images.map((u) => remapUrl(u, pathMap));
      if (JSON.stringify(v) !== JSON.stringify(next.images)) {
        next.images = v;
        changed = true;
      }
    }
    if (!changed) continue;
    await prisma.productDraft.update({ where: { id: d.id }, data: { payload: next } });
    draftsUpdated++;
  }

  console.log("\n=== Done ===");
  console.log(`Converted: ${pathMap.size} files`);
  console.log(`Size: ${Math.round(totalBefore / 1024 / 1024)}MB → ${Math.round(totalAfter / 1024)}KB`);
  console.log(`Products updated: ${productsUpdated}, drafts: ${draftsUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
