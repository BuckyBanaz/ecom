import { useState, useEffect } from "react";
import { Search, Eye, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Order } from "./AdminOrders";

export default function AdminInvoices() {
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("admin_orders");
    if (stored) {
      setOrdersList(JSON.parse(stored));
    }
  }, []);

  // Filter orders that have generated invoices
  const invoices = ordersList.filter((o) => o.invoiceNumber !== null && o.invoiceNumber !== undefined);

  const filtered = invoices.filter((o) =>
    o.invoiceNumber!.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">{invoices.length} invoices generated total</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoices by invoice number or customer..."
          className="pl-10 h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs">
              <th className="p-4">Invoice Number</th>
              <th className="p-4">Order Number</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-mono font-bold text-foreground">{o.invoiceNumber}</td>
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
                      title="Preview Invoice"
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
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <h2 className="font-serif text-2xl tracking-tight font-extrabold text-amber-900">SCHIP & STER</h2>
                <p className="text-xs text-stone-500 mt-1">Invoice Statement</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p className="font-bold">Invoice: {selectedOrder.invoiceNumber}</p>
                <p>Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                <p>Order Reference: {selectedOrder.orderNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Vendor</h4>
                <p className="mt-1 font-semibold">Schip & Ster BV</p>
                <p>Keizersgracht 456, Amsterdam</p>
                <p>billing@schipandster.nl</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Bill To</h4>
                <p className="mt-1 font-semibold">{selectedOrder.customerName}</p>
                <p className="leading-relaxed">{selectedOrder.shippingAddress}</p>
                <p>{selectedOrder.customerEmail}</p>
              </div>
            </div>

            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {selectedOrder.items.map((item, i) => (
                    <tr key={i}>
                      <td className="p-3 font-semibold">{item.productName} {item.variant && `(${item.variant})`}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">€{item.price.toFixed(2)}</td>
                      <td className="p-3 text-right">€{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-2 border-t pt-3">
                <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>€{selectedOrder.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-stone-500"><span>Shipping</span><span>€{selectedOrder.shipping.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-stone-900 border-t pt-2 text-sm"><span>Grand Total</span><span>€{selectedOrder.total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-6">
              <span className="text-[10px] text-stone-400">Thank you for shopping at Schip & Ster!</span>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                <Button onClick={() => setSelectedOrder(null)} size="sm" className="text-xs bg-amber-900 hover:bg-amber-950 text-white rounded-full">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
