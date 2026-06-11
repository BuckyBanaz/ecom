import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Eye, Printer, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionLoader } from "@/components/ui/PageLoader";
import { toast } from "sonner";
import { Order } from "./AdminOrders";
import { parseOrderMetadata } from "@/utils/formatters";
import { ordersRepository } from "@/client/apiClient";

export default function AdminLabels() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await ordersRepository.getAll();
        setOrdersList(res.data || []);
      } catch (err) {
        console.error("Failed to load orders for shipping labels", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Filter orders with generated labels
  const labels = ordersList.filter((o) => o.trackingNumber !== null && o.trackingNumber !== undefined);

  const filtered = labels.filter((o) =>
    o.trackingNumber!.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {loading ? (
        <SectionLoader />
      ) : (
        <p className="text-sm text-muted-foreground">{t("admin_shipping_labels.total_text", { count: filtered.length })}</p>
      )}

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
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  {t("admin_shipping_labels.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-mono font-bold text-primary select-all">{o.trackingNumber}</td>
                  <td className="p-4 font-semibold text-foreground">{o.orderNumber}</td>
                  <td className="p-4 font-medium text-foreground">{o.customerName}</td>
                  <td className="p-4 text-muted-foreground capitalize">{o.carrier || "PostNL"}</td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border border-border/80 bg-background/50 hover:bg-primary hover:text-primary-foreground shadow-sm transition-all"
                      onClick={() => setSelectedOrder(o)}
                      title={t("admin_shipping_labels.button_preview")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Shipping Label PDF Mockup Dialog */}
      {selectedOrder && (() => {
        const { formattedAddress, phone, email, firstName, lastName, street, city, state, pincode, country } = parseOrderMetadata(selectedOrder.shippingAddress);
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 font-mono border-4 border-black">
              <div className="flex justify-between items-center border-b-2 border-black pb-4">
                <div>
                  <h2 className="text-2xl font-black">{selectedOrder.carrier || t("admin_shipping_labels.default_carrier")}</h2>
                  <p className="text-[10px] uppercase font-bold">{t("admin_shipping_labels.label_type")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">{t("admin_shipping_labels.label_priority")}</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="border-b border-dashed border-stone-400 pb-3">
                  <p className="text-[9px] font-bold text-stone-500">{t("admin_shipping_labels.label_from")}</p>
                  <p className="font-bold">{t("admin_shipping_labels.label_from_company")}</p>
                  <p>Keizersgracht 456, Amsterdam</p>
                </div>
                <div className="pb-3 space-y-1">
                  <p className="text-[9px] font-bold text-stone-500">{t("admin_shipping_labels.label_to")}</p>
                  <p className="font-bold text-sm">{selectedOrder.customerName || `${firstName} ${lastName}`.trim()}</p>
                  <p className="leading-relaxed font-bold">{street ? `${street}, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                  {phone && <p className="font-bold">{t("admin_shipping_labels.label_phone")} {phone}</p>}
                  <p className="font-bold">{selectedOrder.customerEmail || email}</p>
                </div>
              </div>

              {/* Fake Barcode representation */}
              <div className="flex flex-col items-center justify-center border-t-2 border-black pt-4 space-y-2">
                <div className="w-full h-16 relative overflow-hidden">
                  <img 
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${selectedOrder.trackingNumber || selectedOrder.orderNumber}&code=Code128&dpi=96`} 
                    alt="Barcode" 
                    className="w-full h-full object-cover scale-150 grayscale contrast-150" 
                  />
                </div>
                <p className="text-xs font-bold tracking-wider">{selectedOrder.trackingNumber}</p>
              </div>

              <div className="flex justify-between items-center border-t border-black pt-4">
                <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5 text-xs rounded-full border-black hover:bg-black hover:text-white">
                  <Printer className="h-3.5 w-3.5" /> {t("admin_shipping_labels.button_print")}
                </Button>
                <Button onClick={() => setSelectedOrder(null)} size="sm" className="text-xs bg-black hover:bg-stone-900 text-white rounded-full">
                  {t("admin_shipping_labels.button_close")}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
