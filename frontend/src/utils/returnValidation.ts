import {
  getReturnWindowDeadline,
  isWithinReturnWindow,
  RETURN_WINDOW_DAYS,
} from "./returnWindow";

export const RETURN_REASONS = [
  "damaged",
  "wrong_item",
  "defective",
  "not_as_described",
  "changed_mind",
  "other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

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

export const ALLOWED_RETURN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type ReturnEligibilityOrder = {
  status: string;
  deliveredAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

export type ReturnEligibilityResult =
  | { allowed: true }
  | { allowed: false; reason: "not_delivered" | "active_return" | "window_expired" };

export function getReturnEligibility(
  order: ReturnEligibilityOrder,
  hasActiveReturn: boolean,
): ReturnEligibilityResult {
  if (order.status !== "delivered") {
    return { allowed: false, reason: "not_delivered" };
  }
  if (hasActiveReturn) {
    return { allowed: false, reason: "active_return" };
  }
  if (!isWithinReturnWindow(order)) {
    return { allowed: false, reason: "window_expired" };
  }
  return { allowed: true };
}

export function isValidReturnReason(reason: string): reason is ReturnReason {
  return (RETURN_REASONS as readonly string[]).includes(reason);
}

export function filterReturnPhotoFiles(files: File[]): File[] {
  return files.filter((file) => ALLOWED_RETURN_IMAGE_TYPES.includes(file.type));
}

export function validateReturnSubmitInput(input: {
  reason: string;
  photos: File[];
  customerNote: string;
  eligibility: ReturnEligibilityResult;
}): string | null {
  if (!input.eligibility.allowed) {
    if (input.eligibility.reason === "window_expired") return "returns.toast_window_expired";
    if (input.eligibility.reason === "active_return") return "returns.toast_active_return";
    return "returns.toast_not_delivered";
  }
  if (!input.reason || !isValidReturnReason(input.reason)) {
    return "returns.toast_reason_required";
  }
  if (input.photos.length === 0) {
    return "returns.toast_photos_required";
  }
  if (input.photos.length > MAX_RETURN_PHOTOS) {
    return "returns.toast_photos_max";
  }
  if (input.photos.some((file) => !ALLOWED_RETURN_IMAGE_TYPES.includes(file.type))) {
    return "returns.toast_photos_type";
  }
  if (input.customerNote.trim().length > MAX_RETURN_NOTE_LENGTH) {
    return "returns.toast_note_too_long";
  }
  return null;
}

export function validateReturnShipmentWeight(weight: string | number): string | null {
  const parsed = typeof weight === "number" ? weight : parseFloat(weight);
  if (
    !Number.isFinite(parsed) ||
    parsed < MIN_RETURN_SHIPMENT_WEIGHT_KG ||
    parsed > MAX_RETURN_SHIPMENT_WEIGHT_KG
  ) {
    return "admin_returns.toast_invalid_weight";
  }
  return null;
}

export { RETURN_WINDOW_DAYS, getReturnWindowDeadline, isWithinReturnWindow };
