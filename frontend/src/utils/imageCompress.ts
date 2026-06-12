const MAX_DIMENSION = 1920;
const MIN_COMPRESS_BYTES = 80 * 1024;
const SKIP_TYPES = new Set(["image/svg+xml", "image/gif"]);

const readFileAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as Data URL"));
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

const resizeToCanvas = (img: HTMLImageElement): { canvas: HTMLCanvasElement; resized: boolean } => {
  const ratio = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1);
  const targetWidth = Math.round(img.width * ratio);
  const targetHeight = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return { canvas, resized: ratio < 1 };
};

/** Compress image files before media library upload (resize + WebP/JPEG). */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || SKIP_TYPES.has(file.type)) {
    return file;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const { canvas, resized } = resizeToCanvas(img);

  if (!resized && file.size < MIN_COMPRESS_BYTES) {
    return file;
  }

  const candidates: { type: string; quality?: number; ext: string }[] = [
    { type: "image/webp", quality: 0.82, ext: "webp" },
    { type: "image/jpeg", quality: 0.78, ext: "jpg" },
  ];

  if (file.type === "image/png") {
    candidates.push({ type: "image/png", ext: "png" });
  }

  let bestBlob: Blob | null = null;
  let bestType = file.type;
  let bestExt = file.name.split(".").pop() || "jpg";

  for (const { type, quality, ext } of candidates) {
    const blob = await canvasToBlob(canvas, type, quality);
    if (!blob) continue;
    if (!bestBlob || blob.size < bestBlob.size) {
      bestBlob = blob;
      bestType = type;
      bestExt = ext;
    }
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([bestBlob], `${baseName}.${bestExt}`, {
    type: bestType,
    lastModified: Date.now(),
  });
}

export const compressImage = async (file: File) => {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const { canvas } = resizeToCanvas(img);
  const targetWidth = canvas.width;
  const targetHeight = canvas.height;

  const preferredTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const normalizedType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const outputType = preferredTypes.includes(normalizedType) ? normalizedType : "image/jpeg";
  const quality = outputType === "image/png" ? undefined : 0.8;

  const blob = await canvasToBlob(canvas, outputType, quality).then(async (b) => {
    if (b) return b;
    const dataUrlFallback = canvas.toDataURL(outputType, quality);
    const fetched = await fetch(dataUrlFallback);
    return fetched.blob();
  });

  const compressedUrl = await readFileAsDataUrl(blob);

  return {
    dataUrl: compressedUrl,
    size: blob.size,
    type: outputType,
    width: targetWidth,
    height: targetHeight,
  };
};
