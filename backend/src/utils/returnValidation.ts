import { AppError } from "../middlewares/errorMiddleware";
import { isWithinReturnWindow, RETURN_WINDOW_DAYS } from "./returnWindow";

export const VALID_RETURN_REASONS = [
  "damaged",
  "wrong_item",
  "defective",
  "not_as_described",
  "changed_mind",
  "other",
] as const;

export type ReturnReason = (typeof VALID_RETURN_REASONS)[number];

export const ACTIVE_RETURN_STATUSES = [
  "pending_review",
  "approved",
  "awaiting_return",
  "return_received",
] as const;

export const MAX_RETURN_PHOTOS = 5;
export const MAX_RETURN_NOTE_LENGTH = 2000;
export const MIN_RETURN_SHIPMENT_WEIGHT_KG = 0.01;
export const MAX_RETURN_SHIPMENT_WEIGHT_KG = 30;

export const ALLOWED_RETURN_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type ReturnEligibleOrder = {
  status: string;
  deliveredAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

export function assertReturnReason(reason: unknown): asserts reason is ReturnReason {
  if (typeof reason !== "string" || !VALID_RETURN_REASONS.includes(reason as ReturnReason)) {
    throw new AppError("Invalid return reason", 400);
  }
}

export function assertReturnEligible(
  order: ReturnEligibleOrder,
  returnRequests: Array<{ status: string }>,
): void {
  if (order.status !== "delivered") {
    throw new AppError("Only delivered orders can be returned", 400);
  }
  if (!isWithinReturnWindow(order)) {
    throw new AppError(`Return window is ${RETURN_WINDOW_DAYS} days from delivery date`, 400);
  }
  const activeReturn = returnRequests.find((r) =>
    (ACTIVE_RETURN_STATUSES as readonly string[]).includes(r.status),
  );
  if (activeReturn) {
    throw new AppError("This order already has an active return request", 400);
  }
}

export function assertReturnPhotos(files: Express.Multer.File[]): void {
  if (files.length === 0) {
    throw new AppError("Please upload at least one photo of the product", 400);
  }
  if (files.length > MAX_RETURN_PHOTOS) {
    throw new AppError(`You can upload up to ${MAX_RETURN_PHOTOS} photos`, 400);
  }
  for (const file of files) {
    if (!ALLOWED_RETURN_IMAGE_MIMES.has(file.mimetype)) {
      throw new AppError("Photos must be JPEG, PNG, WebP, or GIF images", 400);
    }
  }
}

export function assertReturnNote(note: unknown): string | null {
  if (note == null || note === "") return null;
  if (typeof note !== "string") {
    throw new AppError("Customer note must be text", 400);
  }
  const trimmed = note.trim();
  if (trimmed.length > MAX_RETURN_NOTE_LENGTH) {
    throw new AppError(`Customer note must be ${MAX_RETURN_NOTE_LENGTH} characters or fewer`, 400);
  }
  return trimmed || null;
}

export function parseReturnShipmentWeight(weight: unknown): number {
  const parsed = parseFloat(String(weight ?? "1"));
  if (!Number.isFinite(parsed) || parsed < MIN_RETURN_SHIPMENT_WEIGHT_KG || parsed > MAX_RETURN_SHIPMENT_WEIGHT_KG) {
    throw new AppError(
      `Return weight must be between ${MIN_RETURN_SHIPMENT_WEIGHT_KG} and ${MAX_RETURN_SHIPMENT_WEIGHT_KG} kg`,
      400,
    );
  }
  return parsed;
}
