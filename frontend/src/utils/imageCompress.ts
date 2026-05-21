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

export const compressImage = async (file: File) => {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const maxWidth = 1600;
  const maxHeight = 1600;
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const targetWidth = Math.round(img.width * ratio);
  const targetHeight = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const preferredTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const normalizedType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const outputType = preferredTypes.includes(normalizedType) ? normalizedType : "image/jpeg";
  const quality = outputType === "image/png" ? undefined : 0.8;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      outputType,
      quality
    );
  }).catch(async () => {
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
