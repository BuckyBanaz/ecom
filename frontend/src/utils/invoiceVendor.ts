export type InvoiceVendor = {
  vendorName: string;
  vendorAddress: string;
  vendorEmail: string;
};

export const DEFAULT_INVOICE_VENDOR: InvoiceVendor = {
  vendorName: "Schip & Ster BV",
  vendorAddress: "Keizersgracht 456, Amsterdam",
  vendorEmail: "billing@schipandster.nl",
};

export function normalizeInvoiceVendor(raw?: Partial<InvoiceVendor> | null): InvoiceVendor {
  return {
    vendorName: raw?.vendorName?.trim() || DEFAULT_INVOICE_VENDOR.vendorName,
    vendorAddress: raw?.vendorAddress?.trim() || DEFAULT_INVOICE_VENDOR.vendorAddress,
    vendorEmail: raw?.vendorEmail?.trim() || DEFAULT_INVOICE_VENDOR.vendorEmail,
  };
}
