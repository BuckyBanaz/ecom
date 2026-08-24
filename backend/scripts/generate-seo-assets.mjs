/**
 * Generate square favicons + OG image from frontend/public/favicon.png
 * Run from repo root: node backend/scripts/generate-seo-assets.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "..", "frontend", "public");
const source = path.join(publicDir, "favicon.png");
const BRAND_BG = { r: 250, g: 247, b: 242, alpha: 1 };

async function squareIcon(size, outName, padding = 0.12) {
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: BRAND_BG })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toFile(path.join(publicDir, outName));

  console.log("✓", outName);
}

async function ogImage() {
  const logo = await sharp(source)
    .resize(320, 320, { fit: "contain", background: BRAND_BG })
    .png()
    .toBuffer();

  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(publicDir, "og-image.png"));

  console.log("✓ og-image.png (1200×630)");
}

await squareIcon(48, "favicon-48x48.png", 0.1);
await sharp(path.join(publicDir, "favicon-48x48.png")).toFile(path.join(publicDir, "favicon.ico"));
console.log("✓ favicon.ico (from 48×48 PNG — Google default path)");
await squareIcon(192, "favicon-192x192.png", 0.12);
await squareIcon(180, "apple-touch-icon.png", 0.12);
await sharp(path.join(publicDir, "favicon-192x192.png"))
  .resize(32, 32)
  .png()
  .toFile(path.join(publicDir, "favicon-32x32.png"));
console.log("✓ favicon-32x32.png");
await ogImage();
