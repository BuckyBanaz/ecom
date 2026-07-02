import { useEffect, useState } from "react";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { DEFAULT_INVOICE_VENDOR, normalizeInvoiceVendor, type InvoiceVendor } from "@/utils/invoiceVendor";

export function useInvoiceVendor() {
  const [vendor, setVendor] = useState<InvoiceVendor>(DEFAULT_INVOICE_VENDOR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ data: { invoice?: { vendorName?: string; vendorAddress?: string; vendorEmail?: string } } }>(
        ENDPOINTS.CONFIG_APP,
      )
      .then((res) => {
        if (!cancelled) {
          setVendor(
            normalizeInvoiceVendor(
              res.data?.invoice
                ? {
                    vendorName: res.data.invoice.vendorName,
                    vendorAddress: res.data.invoice.vendorAddress,
                    vendorEmail: res.data.invoice.vendorEmail,
                  }
                : null,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setVendor(DEFAULT_INVOICE_VENDOR);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { vendor, loading };
}
