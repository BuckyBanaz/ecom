export const RETURN_WINDOW_DAYS = 30;

export type ReturnWindowOrder = {
  deliveredAt: Date | null;
  updatedAt: Date;
  status: string;
  createdAt: Date;
};

export function getReturnWindowStart(order: ReturnWindowOrder): Date {
  if (order.deliveredAt) return order.deliveredAt;
  if (order.status === "delivered") return order.updatedAt;
  return order.createdAt;
}

export function getReturnWindowDeadline(order: ReturnWindowOrder): Date {
  const start = getReturnWindowStart(order);
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
  return deadline;
}

export function isWithinReturnWindow(order: ReturnWindowOrder): boolean {
  return new Date() <= getReturnWindowDeadline(order);
}

export function getReturnWindowDaysRemaining(order: ReturnWindowOrder): number {
  const msLeft = getReturnWindowDeadline(order).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}
