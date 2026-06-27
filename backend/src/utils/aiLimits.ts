/** AI image count per product — clamped 0–5 (Admin Settings → AI Brain). */
export function getAiImageCount(): number {
  const n = parseInt(process.env.AI_IMAGE_COUNT || "1", 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(5, Math.max(0, n));
}

/** Max products per bulk Quick Add batch — clamped 1–5. */
export function getAiBulkLimit(): number {
  const n = parseInt(process.env.AI_BULK_LIMIT || "5", 10);
  if (Number.isNaN(n)) return 5;
  return Math.min(5, Math.max(1, n));
}

export function clampAiImageCount(value: number): number {
  return Math.min(5, Math.max(0, Math.floor(value)));
}

export function clampAiBulkLimit(value: number): number {
  return Math.min(5, Math.max(1, Math.floor(value)));
}
