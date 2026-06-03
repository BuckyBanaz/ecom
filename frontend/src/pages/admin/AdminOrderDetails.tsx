import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Tag, Printer, ClipboardCopy, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Order, statusLabels, MANUAL_STATUSES, AUTO_STATUSES } from "./AdminOrders";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/Logo";
import { ordersRepository } from "@/client/apiClient";
import { parseOrderMetadata } from "@/utils/formatters";

export default function AdminOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal dialog view states for print/preview simulations
  const [showInvoiceMock, setShowInvoiceMock] = useState(false);
  const [showLabelMock, setShowLabelMock] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("Auto Cheapest");

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await ordersRepository.getById(id);
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    try {
      const res = await ordersRepository.updateStatus(order.id, newStatus);
      if (res.success) {
        setOrder(res.data);
        toast.success(`Order status updated to "${statusLabels[newStatus] || newStatus}"`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const { formattedAddress, tax, discount, phone, email, firstName, lastName, street, city, state, pincode, country } = order ? parseOrderMetadata(order.shippingAddress) : { formattedAddress: "", tax: 0, discount: 0, phone: "", email: "", firstName: "", lastName: "", street: "", city: "", state: "", pincode: "", country: "" };

  const handleGenerateInvoice = () => {
    if (!order) return;
    const updated = {
      ...order,
      invoiceNumber: order.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceUrl: order.invoiceUrl || `/invoices/${order.orderNumber}.pdf`,
      status: order.status === "pending" || order.status === "payment_pending" ? "paid" : order.status,
      updatedAt: new Date().toISOString(),
    };
    setOrder(updated);
    setShowInvoiceMock(true);
    toast.success("Invoice generated successfully");
  };

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    // Simulate API call to Sendcloud
    const finalCarrier = selectedCarrier === "Auto Cheapest" ? "PostNL" : selectedCarrier;
    const trackingNumber = `3S${finalCarrier === "DHL" ? "DHL" : "NPL"}${Math.floor(100000 + Math.random() * 900000)}`;
    const labelUrl = `/labels/LBL-${order.orderNumber}.pdf`;
    
    const shipment = {
      carrier: finalCarrier,
      trackingNumber,
      trackingUrl: `https://tracking.sendcloud.com/${trackingNumber}`,
      labelUrl,
      shippingCost: selectedCarrier === "Auto Cheapest" ? 5.50 : (selectedCarrier === "DHL" ? 6.20 : 5.90),
      shipmentStatus: "label_generated",
      createdAt: new Date().toISOString()
    };

    const updated = {
      ...order,
      shipment,
      status: "label_generated",
      updatedAt: new Date().toISOString(),
    };
    setOrder(updated);
    setShowShipmentModal(false);
    toast.success(`Shipment created successfully via ${finalCarrier}`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    );
  }

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

  const getNextStep = (status: string) => {
    switch (status) {
      case "pending": return "payment_pending";
      case "payment_pending": return "paid";
      case "paid": return "processing";
      case "processing": return "ready_to_ship";
      default: return null;
    }
  };
  const nextStatus = getNextStep(order.status);

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
          
          {/* Status Select */}
          <Select value={order.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[220px] h-9 text-xs bg-background border-muted-foreground/20 rounded-full font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs" disabled={AUTO_STATUSES.includes(key)}>
                  {label} {AUTO_STATUSES.includes(key) && "(Auto)"}
                </SelectItem>
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

          {/* Shipment Actions */}
          {order.status === "ready_to_ship" && !order.shipment && (
            <Button
              onClick={() => setShowShipmentModal(true)}
              className="rounded-full text-xs font-bold gap-1.5 h-9 bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
            >
              <Truck className="h-4 w-4" /> Create Shipment
            </Button>
          )}

          {AUTO_STATUSES.includes(order.status) && order.status !== "delivered" && (
            <Button disabled className="rounded-full text-xs font-bold gap-1.5 h-9 bg-muted text-muted-foreground border">
              Waiting For Carrier Update
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
              {tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax / GST</span>
                  <span className="font-semibold text-foreground">€{tax.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="font-semibold text-green-600">-€{discount.toFixed(2)}</span>
                </div>
              )}
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
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-1">Shipping Address</p>
                <div className="font-bold text-foreground mt-0.5 leading-relaxed space-y-1">
                  <p>{order.customerName || `${firstName} ${lastName}`.trim()}</p>
                  <p>{street ? `${street}, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                  {phone && <p>Phone: {phone}</p>}
                  <p>Email: {order.customerEmail || email}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Payment Method</p>
                <p className="font-bold text-foreground mt-0.5 capitalize">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90 flex justify-between items-center">
              <span>Logistics & Tracking</span>
              {order.shipment && <Badge variant="outline" className="text-[10px]">{order.shipment.carrier}</Badge>}
            </h3>
            
            {!order.shipment ? (
              <div className="py-6 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Truck className="h-8 w-8 opacity-20" />
                <p>No shipment created yet.</p>
                {order.status === "ready_to_ship" && (
                  <Button onClick={() => setShowShipmentModal(true)} size="sm" variant="outline" className="mt-2 text-xs rounded-full border-dashed">
                    Create Shipment
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-muted-foreground font-semibold">Carrier</p>
                    <p className="font-bold text-foreground mt-0.5">{order.shipment.carrier}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">Status</p>
                    <div className="mt-1">
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-semibold">
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground font-semibold">Tracking Number</p>
                    <p className="font-mono font-bold text-primary mt-0.5 select-all flex items-center gap-1.5">
                      {order.shipment.trackingNumber}
                      <button onClick={() => { navigator.clipboard.writeText(order.shipment!.trackingNumber); toast.success("Copied tracking ID"); }} className="text-muted-foreground hover:text-foreground">
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </button>
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 flex flex-wrap gap-2">
                  <Button onClick={() => setShowLabelMock(true)} size="sm" variant="outline" className="text-[10px] h-7 rounded-full">
                    <Tag className="h-3 w-3 mr-1" /> View Label
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-full" onClick={() => window.open(order.shipment!.trackingUrl, "_blank")}>
                    Track Shipment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice PDF Mockup Dialog */}
      {showInvoiceMock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <Logo forceLight className="mb-1 pointer-events-none" />
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
                <div className="mt-1 space-y-1">
                  <p className="font-semibold">{order.customerName || `${firstName} ${lastName}`.trim()}</p>
                  <p className="leading-relaxed">{street ? `${street}, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                  {phone && <p>Phone: {phone}</p>}
                  <p>Email: {order.customerEmail || email}</p>
                </div>
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
                {/* Summary */}
                <div className="mt-6 border-t pt-4 space-y-2 text-sm text-foreground">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>€{order.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{order.shipping === 0 ? "Free" : `€${order.shipping.toFixed(2)}`}</span></div>
                  {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax / GST</span><span>€{tax.toFixed(2)}</span></div>}
                  {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-green-600">-€{discount.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>€{order.total.toFixed(2)}</span></div>
                </div>
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
      {/* Create Shipment Modal */}
      {showShipmentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card text-foreground rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Create Shipment
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Select a shipping carrier for {order.customerName}</p>
            </div>
            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div className="space-y-3">
                {[
                  { name: "Auto Cheapest", price: 5.50 },
                  { name: "PostNL", price: 5.50 },
                  { name: "DHL", price: 6.20 },
                  { name: "UPS", price: 7.10 },
                  { name: "DPD", price: 5.90 }
                ].map((c) => (
                  <label key={c.name} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${selectedCarrier === c.name ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/50"}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="carrier" 
                        value={c.name} 
                        checked={selectedCarrier === c.name} 
                        onChange={() => setSelectedCarrier(c.name)}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="font-medium text-sm">{c.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">€{c.price.toFixed(2)}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowShipmentModal(false)} className="rounded-full text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full text-xs h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                  <CheckCircle2 className="h-4 w-4" /> Generate Label
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
