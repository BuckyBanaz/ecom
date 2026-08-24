export function getReturnWindowDays(): number {
  try {
    const raw = localStorage.getItem("maintenance_status");
    if (!raw) return 30;
    const parsed = JSON.parse(raw);
    return parsed.returnWindowDays !== undefined ? Number(parsed.returnWindowDays) : 30;
  } catch {
    return 30;
  }
}

export function isReturnsSystemEnabled(): boolean {
  try {
    const raw = localStorage.getItem("maintenance_status");
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed.returnsSystemEnabled !== false;
  } catch {
    return true;
  }
}

export function isRefundsSystemEnabled(): boolean {
  try {
    const raw = localStorage.getItem("maintenance_status");
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed.refundsSystemEnabled !== false;
  } catch {
    return true;
  }
}

export const RETURN_WINDOW_DAYS = 30; // Deprecated, use getReturnWindowDays() where possible.

export type ReturnWindowOrder = {
  deliveredAt?: string | null;
  updatedAt?: string;
  status?: string;
  createdAt?: string;
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getReturnWindowStart(order: ReturnWindowOrder): Date {
  const deliveredAt = parseDate(order.deliveredAt);
  if (deliveredAt) return deliveredAt;

  const updatedAt = parseDate(order.updatedAt);
  if (order.status === "delivered" && updatedAt) return updatedAt;

  const createdAt = parseDate(order.createdAt);
  return createdAt ?? new Date();
}

export function getReturnWindowDeadline(order: ReturnWindowOrder): Date {
  const deadline = new Date(getReturnWindowStart(order));
  deadline.setDate(deadline.getDate() + getReturnWindowDays());
  return deadline;
}

export function isWithinReturnWindow(order: ReturnWindowOrder): boolean {
  return new Date() <= getReturnWindowDeadline(order);
}

export function getReturnWindowDaysRemaining(order: ReturnWindowOrder): number {
  const msLeft = getReturnWindowDeadline(order).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}
