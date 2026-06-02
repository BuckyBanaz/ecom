import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Tag, Printer, Check, ClipboardCopy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Order, statusLabels, statusColors } from "./AdminOrders";
import { Badge } from "@/components/ui/badge";

const STATUS_FLOW = [
  "pending",
  "payment_pending",
  "paid",
  "processing",
  "ready_to_ship",
  "label_generated",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered"
];

export default function AdminOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [ordersList, setOrdersList] = useState<Order[]>([]);

  // Modal dialog view states for print/preview simulations
  const [showInvoiceMock, setShowInvoiceMock] = useState(false);
  const [showLabelMock, setShowLabelMock] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin_orders");
    if (stored) {
      const parsed = JSON.parse(stored) as Order[];
      setOrdersList(parsed);
      const found = parsed.find((o) => o.id === id);
      if (found) {
        setOrder(found);
      }
    }
  }, [id]);

  const updateOrderInStorage = (updatedOrder: Order) => {
    const newList = ordersList.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
    localStorage.setItem("admin_orders", JSON.stringify(newList));
    setOrdersList(newList);
    setOrder(updatedOrder);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!order) return;
    const updated = {
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    updateOrderInStorage(updated);
    toast.success(`Order status updated to "${statusLabels[newStatus] || newStatus}"`);
  };

  const handleGenerateInvoice = () => {
    if (!order) return;
    const updated = {
      ...order,
      invoiceNumber: order.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceUrl: order.invoiceUrl || `/invoices/${order.orderNumber}.pdf`,
      status: order.status === "pending" || order.status === "payment_pending" ? "paid" : order.status,
      updatedAt: new Date().toISOString(),
    };
    updateOrderInStorage(updated);
    setShowInvoiceMock(true);
    toast.success("Invoice generated successfully");
  };

  const handleGenerateLabel = () => {
    if (!order) return;
    const updated = {
      ...order,
      trackingNumber: order.trackingNumber || `3S${order.carrier === "DHL" ? "DHL" : "NPL"}${Math.floor(100000 + Math.random() * 900000)}`,
      labelUrl: order.labelUrl || `/labels/LBL-${order.orderNumber}.pdf`,
      carrier: order.carrier || "PostNL",
      status: "label_generated",
      updatedAt: new Date().toISOString(),
    };
    updateOrderInStorage(updated);
    setShowLabelMock(true);
    toast.success("Shipping label generated successfully");
  };

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Order not found.</p>
        <Button onClick={() => navigate("/admin/orders")} variant="outline" className="rounded-full">
          Back to Orders
        </Button>
      </div>
    );
  }

  const currentFlowIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = currentFlowIdx !== -1 && currentFlowIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentFlowIdx + 1] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Back Button & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/orders")}
            className="h-9 w-9 rounded-full border bg-background"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order {order.orderNumber}</h1>
            <p className="text-muted-foreground text-xs">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Invoice trigger */}
          <Button
            variant="outline"
            onClick={handleGenerateInvoice}
            className="rounded-full text-xs font-bold gap-2 h-9"
          >
            <FileText className="h-4 w-4" /> {order.invoiceNumber ? "View Invoice" : "Generate Invoice"}
          </Button>
          {/* Label trigger */}
          <Button
            variant="outline"
            onClick={handleGenerateLabel}
            disabled={order.status === "pending" || order.status === "payment_pending"}
            className="rounded-full text-xs font-bold gap-2 h-9"
          >
            <Tag className="h-4 w-4" /> {order.labelUrl ? "View Shipping Label" : "Generate Label"}
          </Button>
          
          {/* Status Select */}
          <Select value={order.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[220px] h-9 text-xs bg-background border-muted-foreground/20 rounded-full font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick next status button */}
          {nextStatus && (
            <Button
              onClick={() => handleStatusChange(nextStatus)}
              className="rounded-full text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm"
            >
              Next Step: {statusLabels[nextStatus]} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Items & Financial Summary */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90">Items Purchased</h3>
            <div className="divide-y divide-border/60">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="h-12 w-12 rounded-xl object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">{item.productName}</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                      Quantity: {item.quantity} {item.variant && `· ${item.variant}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">€{(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">€{item.price} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90">Summary</h3>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">€{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-foreground">
                  {order.shipping === 0 ? "Free" : `€${order.shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-sm text-foreground">
                <span>Total</span>
                <span>€{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Customer Details & Fulfillment info */}
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90">Customer Details</h3>
            <div className="space-y-2">
              <div>
                <p className="text-muted-foreground font-semibold">Name</p>
                <p className="font-bold text-foreground mt-0.5">{order.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Email</p>
                <p className="font-bold text-foreground mt-0.5">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Shipping Address</p>
                <p className="font-bold text-foreground mt-0.5 leading-relaxed">{order.shippingAddress}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Payment Method</p>
                <p className="font-bold text-foreground mt-0.5 capitalize">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90">Logistics & Tracking</h3>
            <div className="space-y-2.5">
              <div>
                <p className="text-muted-foreground font-semibold">Carrier</p>
                <p className="font-bold text-foreground mt-0.5">{order.carrier || "Not Assigned"}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Tracking Number</p>
                <p className="font-mono font-bold text-primary mt-0.5 select-all flex items-center gap-1.5">
                  {order.trackingNumber || "Not Generated"}
                  {order.trackingNumber && (
                    <button onClick={() => { navigator.clipboard.writeText(order.trackingNumber!); toast.success("Copied tracking ID"); }} className="text-muted-foreground hover:text-foreground">
                      <ClipboardCopy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </p>
              </div>
              {order.labelUrl && (
                <div className="pt-1.5">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold py-0.5 px-2">
                    Shipping Label Printed
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice PDF Mockup Dialog */}
      {showInvoiceMock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <h2 className="font-serif text-2xl tracking-tight font-extrabold text-amber-900">SCHIP & STER</h2>
                <p className="text-xs text-stone-500 mt-1">Invoice Statement</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p className="font-bold">Invoice: {order.invoiceNumber}</p>
                <p>Date: {new Date().toLocaleDateString()}</p>
                <p>Order Reference: {order.orderNumber}</p>
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
                <p className="mt-1 font-semibold">{order.customerName}</p>
                <p className="leading-relaxed">{order.shippingAddress}</p>
                <p>{order.customerEmail}</p>
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
                  {order.items.map((item, i) => (
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
                <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>€{order.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-stone-500"><span>Shipping</span><span>€{order.shipping.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-stone-900 border-t pt-2 text-sm"><span>Grand Total</span><span>€{order.total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-6">
              <span className="text-[10px] text-stone-400">Thank you for shopping at Schip & Ster!</span>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                <Button onClick={() => setShowInvoiceMock(false)} size="sm" className="text-xs bg-amber-900 hover:bg-amber-950 text-white rounded-full">
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Label PDF Mockup Dialog */}
      {showLabelMock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 font-mono border-4 border-black">
            <div className="flex justify-between items-center border-b-2 border-black pb-4">
              <div>
                <h2 className="text-2xl font-black">{order.carrier || "PostNL"}</h2>
                <p className="text-[10px] uppercase font-bold">Standard Parcel</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">PRIORITY</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="border-b border-dashed border-stone-400 pb-3">
                <p className="text-[9px] font-bold text-stone-500">FROM:</p>
                <p className="font-bold">Schip & Ster Fulfillment</p>
                <p>Keizersgracht 456, Amsterdam</p>
              </div>
              <div className="pb-3">
                <p className="text-[9px] font-bold text-stone-500">TO:</p>
                <p className="font-bold text-sm">{order.customerName}</p>
                <p className="leading-relaxed font-bold">{order.shippingAddress}</p>
                <p>{order.customerEmail}</p>
              </div>
            </div>

            {/* Fake Barcode representation */}
            <div className="flex flex-col items-center justify-center border-t-2 border-black pt-4 space-y-2">
              <div className="w-full h-16 bg-gradient-to-r from-black via-white to-black border border-black relative">
                {/* Visual striping simulator */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: i % (Math.floor(Math.random() * 3) + 2) === 0 ? "black" : "transparent" }} />
                  ))}
                </div>
              </div>
              <p className="text-xs font-bold tracking-wider">{order.trackingNumber}</p>
            </div>

            <div className="flex justify-between items-center border-t border-black pt-4">
              <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5 text-xs rounded-full border-black hover:bg-black hover:text-white">
                <Printer className="h-3.5 w-3.5" /> Print Label
              </Button>
              <Button onClick={() => setShowLabelMock(false)} size="sm" className="text-xs bg-black hover:bg-stone-900 text-white rounded-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
