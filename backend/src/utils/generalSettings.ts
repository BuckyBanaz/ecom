/** Shared general store / invoice / API-docs settings from env. */

export type InvoiceVendorSettings = {
  vendorName: string;
  vendorAddress: string;
  vendorEmail: string;
};

export function getInvoiceVendorSettings(): InvoiceVendorSettings {
  return {
    vendorName:
      process.env.INVOICE_VENDOR_NAME?.trim() ||
      process.env.STORE_NAME?.trim() ||
      "Schip & Ster BV",
    vendorAddress:
      process.env.INVOICE_VENDOR_ADDRESS?.trim() || "Keizersgracht 456, Amsterdam",
    vendorEmail:
      process.env.INVOICE_VENDOR_EMAIL?.trim() ||
      process.env.SUPPORT_EMAIL?.trim() ||
      "billing@schipandster.nl",
  };
}

export function isApiDocsEnabled(): boolean {
  const raw = process.env.API_DOCS_ENABLED?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV !== "production";
}
