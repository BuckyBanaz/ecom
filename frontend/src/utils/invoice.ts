/** Stable invoice reference — always the order number from DB, never random. */
export function getInvoiceNumber(order: {
  invoiceNumber?: string | null;
  orderNumber: string;
}): string {
  return order.invoiceNumber || order.orderNumber;
}

/** Orders eligible for invoicing (paid or further along). */
export const INVOICE_ELIGIBLE_STATUSES = new Set([
  "paid",
  "confirmed",
  "processing",
  "label_generated",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
  "refunded",
]);

export function isInvoiceEligible(order: {
  status: string;
  paymentStatus?: string;
}): boolean {
  return (
    INVOICE_ELIGIBLE_STATUSES.has(order.status) ||
    order.paymentStatus === "paid"
  );
}
