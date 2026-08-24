import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Eye, Printer, Tag, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionLoader } from "@/components/ui/PageLoader";
import { toast } from "sonner";
import { Order } from "./AdminOrders";
import { ordersRepository } from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";

type OrderWithLabel = Order & {
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  carrier?: string | null;
};

/** SendCloud PDF stored on order — not local mock paths. */
export function hasRealShippingLabel(order: { labelUrl?: string | null }): boolean {
  const url = (order.labelUrl || "").trim();
  if (!url) return false;
  if (url.includes("dummy.pdf")) return false;
  if (url.startsWith("/labels/")) return false;
  return true;
}

function getLabelPdfUrl(orderId: string): string {
  const token = localStorage.getItem("admin_token") || localStorage.getItem("customer_token") || "";
  return `${ENDPOINTS.ORDERS}/${orderId}/sendcloud/label?token=${encodeURIComponent(token)}`;
}

export default function AdminLabels() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<OrderWithLabel[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithLabel | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ordersRepository.getAll();
      setOrdersList(res.data || []);
    } catch (err) {
      console.error("Failed to load orders for shipping labels", err);
      toast.error("Failed to load shipping labels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const labels = useMemo(
    () => ordersList.filter((o) => hasRealShippingLabel(o)),
    [ordersList],
  );

  const filtered = useMemo(
    () =>
      labels.filter(
        (o) =>
          (o.trackingNumber || "").toLowerCase().includes(search.toLowerCase()) ||
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customerName.toLowerCase().includes(search.toLowerCase()),
      ),
    [labels, search],
  );

  const openLabelPdf = (order: OrderWithLabel, print = false) => {
    const url = getLabelPdfUrl(order.id);
    const win = window.open(url, "_blank");
    if (print && win) {
      win.addEventListener("load", () => {
        try {
          win.print();
        } catch {
          /* cross-origin — user prints manually */
        }
      });
    }
  };

  const labelPdfSrc = selectedOrder ? getLabelPdfUrl(selectedOrder.id) : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin_sidebar.shipping_labels", { defaultValue: "Shipping Labels" })}</h1>
        {!loading && (
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin_shipping_labels.total_text", { count: filtered.length })}
            {" · "}
            <span className="text-xs">Real SendCloud PDF labels only</span>
          </p>
        )}
      </div>

      {loading ? (
        <SectionLoader />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin_shipping_labels.search_placeholder")}
              className="pl-10 h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs">
                  <th className="p-4">{t("admin_shipping_labels.table_tracking")}</th>
                  <th className="p-4">{t("admin_shipping_labels.table_order_ref")}</th>
                  <th className="p-4">{t("admin_shipping_labels.table_customer")}</th>
                  <th className="p-4">{t("admin_shipping_labels.table_carrier")}</th>
                  <th className="p-4">{t("admin_shipping_labels.table_date")}</th>
                  <th className="p-4 text-right">{t("admin_shipping_labels.table_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground space-y-2">
                      <p>{t("admin_shipping_labels.empty")}</p>
                      <p className="text-xs max-w-md mx-auto">
                        Generate a label from an order (Orders → order detail → Create SendCloud shipment). Mock/demo labels are not listed here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary select-all">
                        {o.trackingNumber || "—"}
                      </td>
                      <td className="p-4 font-semibold text-foreground">{o.orderNumber}</td>
                      <td className="p-4 font-medium text-foreground">{o.customerName}</td>
                      <td className="p-4 text-muted-foreground capitalize">{o.carrier || "Sendcloud"}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/80"
                            onClick={() => setSelectedOrder(o)}
                            title={t("admin_shipping_labels.button_preview")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/80"
                            onClick={() => openLabelPdf(o)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {o.trackingUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full border border-border/80"
                              onClick={() => window.open(o.trackingUrl!, "_blank")}
                              title="Track shipment"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-3xl w-full shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between gap-3 p-4 border-b bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <h2 className="font-bold">{selectedOrder.orderNumber}</h2>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {selectedOrder.carrier || "Sendcloud"}
                  </Badge>
                </div>
                {selectedOrder.trackingNumber && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">{selectedOrder.trackingNumber}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openLabelPdf(selectedOrder)}>
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openLabelPdf(selectedOrder, true)}>
                  <Printer className="h-3.5 w-3.5" /> {t("admin_shipping_labels.button_print")}
                </Button>
                {selectedOrder.trackingUrl && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(selectedOrder.trackingUrl!, "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5" /> Track
                  </Button>
                )}
                <Button size="sm" className="text-xs" onClick={() => setSelectedOrder(null)}>
                  {t("admin_shipping_labels.button_close")}
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-[480px] bg-muted/20">
              <iframe
                title={`Shipping label ${selectedOrder.orderNumber}`}
                src={labelPdfSrc}
                className="w-full h-full min-h-[480px] border-0 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
