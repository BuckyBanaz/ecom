import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Eye, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Order } from "./AdminOrders";
import { Logo } from "@/components/layout/Logo";
import { parseOrderMetadata } from "@/utils/formatters";
import { formatPrice } from "@/context/CartContext";
import { printInvoice } from "@/utils/printInvoice";
import { getInvoiceNumber, isInvoiceEligible } from "@/utils/invoice";

export default function AdminInvoices() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("admin_orders");
    if (stored) {
      setOrdersList(JSON.parse(stored));
    }
  }, []);

  const invoices = ordersList.filter(isInvoiceEligible);

  const filtered = invoices.filter((o) => {
    const invoiceNo = getInvoiceNumber(o).toLowerCase();
    const query = search.toLowerCase();
    return (
      invoiceNo.includes(query) ||
      o.orderNumber.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("admin_invoices.total_text", { count: invoices.length })}</p>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin_invoices.search_placeholder")}
          className="pl-10 h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs">
              <th className="p-4">{t("admin_invoices.table_invoice_number")}</th>
              <th className="p-4">{t("admin_invoices.table_order_number")}</th>
              <th className="p-4">{t("admin_invoices.table_customer")}</th>
              <th className="p-4">{t("admin_invoices.table_amount")}</th>
              <th className="p-4">{t("admin_invoices.table_date")}</th>
              <th className="p-4 text-right">{t("admin_invoices.table_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  {t("admin_invoices.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-mono font-bold text-foreground">{getInvoiceNumber(o)}</td>
                  <td className="p-4 font-semibold text-primary">{o.orderNumber}</td>
                  <td className="p-4 font-medium text-foreground">{o.customerName}</td>
                  <td className="p-4 font-semibold text-foreground">€{o.total.toFixed(2)}</td>
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
                      title={t("admin_invoices.button_preview")}
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

      {/* Invoice PDF Mockup Dialog */}
      {selectedOrder && (() => {
        const { formattedAddress, tax, discount, phone, email, firstName, lastName, street, city, state, pincode, country } = parseOrderMetadata(selectedOrder.shippingAddress);
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="invoice-print-area bg-white text-black rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <Logo forceLight className="mb-1 pointer-events-none" />
                  <p className="text-xs text-stone-500 mt-1">{t("admin_invoices.dialog_title")}</p>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p className="font-bold">Invoice: {getInvoiceNumber(selectedOrder)}</p>
                  <p>Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  <p>Order Reference: {selectedOrder.orderNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">{t("admin_invoices.vendor_label")}</h4>
                  <p className="mt-1 font-semibold">Schip & Ster BV</p>
                  <p>Keizersgracht 456, Amsterdam</p>
                  <p>billing@schipandster.nl</p>
                </div>
                <div>
                  <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">{t("admin_invoices.bill_to_label")}</h4>
                  <div className="mt-1 space-y-1">
                    <p className="font-semibold">{selectedOrder.customerName || `${firstName} ${lastName}`.trim()}</p>
                    <p className="leading-relaxed">{street ? `${street}, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                    {phone && <p>Phone: {phone}</p>}
                    <p>Email: {selectedOrder.customerEmail || email}</p>
                  </div>
                </div>
              </div>

              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                      <th className="p-3">{t("admin_invoices.product_name")}</th>
                      <th className="p-3 text-center">{t("admin_invoices.product_qty")}</th>
                      <th className="p-3 text-right">{t("admin_invoices.product_price")}</th>
                      <th className="p-3 text-right">{t("admin_invoices.product_total")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-3 font-semibold">{item.productName} {item.variant && `(${item.variant})`}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">{formatPrice(item.price)}</td>
                        <td className="p-3 text-right">{formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-2 border-t pt-3">
                  <div className="flex justify-between text-stone-500"><span>{t("admin_invoices.subtotal")}</span><span>{formatPrice(selectedOrder.subtotal)}</span></div>
                  <div className="flex justify-between text-stone-500"><span>{t("admin_invoices.shipping")}</span><span>{selectedOrder.shipping === 0 ? t("admin_invoices.shipping_free") : formatPrice(selectedOrder.shipping)}</span></div>
                  {tax > 0 && <div className="flex justify-between text-stone-500"><span>{t("admin_invoices.tax")}</span><span>{formatPrice(tax)}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>{t("admin_invoices.discount")}</span><span>-{formatPrice(discount)}</span></div>}
                  <div className="flex justify-between font-bold text-stone-900 border-t pt-2 text-sm"><span>{t("admin_invoices.grand_total")}</span><span>{formatPrice(selectedOrder.total)}</span></div>
                </div>
              </div>

              <div className="text-center border-t border-stone-200 pt-6">
                <p className="text-[10px] text-stone-400">{t("admin_invoices.footer_text")}</p>
              </div>

              <div className="flex justify-end gap-2 no-print">
                <Button onClick={printInvoice} variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                  <Printer className="h-3.5 w-3.5" /> {t("admin_invoices.button_print")}
                </Button>
                <Button onClick={() => setSelectedOrder(null)} size="sm" className="text-xs bg-amber-900 hover:bg-amber-950 text-white rounded-full">
                  {t("admin_invoices.button_close")}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
