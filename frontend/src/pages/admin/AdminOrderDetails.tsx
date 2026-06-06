import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Tag, Printer, ClipboardCopy, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Order, statusLabels, MANUAL_STATUSES, AUTO_STATUSES } from "./AdminOrders";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/Logo";
import { ordersRepository } from "@/client/apiClient";
import { parseOrderMetadata } from "@/utils/formatters";

const formatOrderWithShipment = (orderData: any) => {
  if (!orderData) return orderData;
  const formatted = { ...orderData };
  if (formatted.trackingNumber) {
    formatted.shipment = {
      carrier: formatted.carrier || "Sendcloud",
      trackingNumber: formatted.trackingNumber,
      trackingUrl: formatted.trackingUrl || `https://tracking.sendcloud.sc/tracking/shipment/${formatted.trackingNumber}`,
      labelUrl: formatted.labelUrl || "",
      shippingCost: formatted.shippingCost || 0,
      shipmentStatus: formatted.shipmentStatus || formatted.status,
      createdAt: formatted.updatedAt || formatted.createdAt
    };
  } else if (["label_generated", "picked_up", "in_transit", "out_for_delivery", "delivered"].includes(formatted.status) && !formatted.shipment) {
    const carrier = "PostNL";
    const trackingNumber = `3SPOSTNL${Math.floor(100000 + Math.random() * 900000)}`;
    formatted.shipment = {
      carrier,
      trackingNumber,
      trackingUrl: `https://tracking.sendcloud.com/${trackingNumber}`,
      labelUrl: `/labels/LBL-${formatted.orderNumber}.pdf`,
      shippingCost: 5.50,
      shipmentStatus: formatted.status === "label_generated" ? "label_generated" : "in_transit",
      createdAt: formatted.updatedAt || formatted.createdAt
    };
  }
  return formatted;
};

export default function AdminOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);

  // Modal dialog view states for print/preview simulations
  const [showInvoiceMock, setShowInvoiceMock] = useState(false);
  const [showLabelMock, setShowLabelMock] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("Auto Cheapest");
  const [weight, setWeight] = useState<string>("1.5");
  const [length, setLength] = useState<string>("10");
  const [width, setWidth] = useState<string>("10");
  const [height, setHeight] = useState<string>("10");
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);

  useEffect(() => {
    if (showShipmentModal && shippingMethods.length === 0) {
      const fetchMethods = async () => {
        try {
          const res = await ordersRepository.getShippingMethods();
          if (res.success && res.data && res.data.shipping_methods) {
            setShippingMethods(res.data.shipping_methods);
            if (res.data.shipping_methods.length > 0) {
              setSelectedCarrier(res.data.shipping_methods[0].id.toString());
            }
          }
        } catch (err) {
          console.error("Failed to fetch shipping methods", err);
          toast.error("Failed to load shipping methods from Sendcloud");
        }
      };
      fetchMethods();
    }
  }, [showShipmentModal]);

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await ordersRepository.getById(id);
      if (res.success && res.data) {
        const fetchedOrder = res.data;
        const estWeight = (fetchedOrder.items.reduce((sum: number, i: any) => sum + i.quantity, 0) * 1.5).toFixed(1);
        setWeight(estWeight);
        setOrder(formatOrderWithShipment(fetchedOrder));
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
    if (!order || updatingStatus) return;
    setUpdatingStatus(true);
    const toastId = toast.loading(`Updating status to ${statusLabels[newStatus] || newStatus}...`);
    try {
      const res = await ordersRepository.updateStatus(order.id, newStatus);
      if (res.success) {
        setOrder(prev => {
          const updated = prev ? { ...res.data, items: res.data.items || prev.items } : res.data;
          return formatOrderWithShipment(updated);
        });
        toast.success(`Order status updated to "${statusLabels[newStatus] || newStatus}"`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status", { id: toastId });
    } finally {
      setUpdatingStatus(false);
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

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || creatingShipment) return;
    
    setCreatingShipment(true);
    const toastId = toast.loading("Creating shipment via Sendcloud...");
    try {
      if (!selectedCarrier || isNaN(Number(selectedCarrier))) {
        toast.error("Please select a valid shipping method", { id: toastId });
        setCreatingShipment(false);
        return;
      }
      
      const res = await ordersRepository.createShipment(order.id, parseFloat(weight), Number(selectedCarrier));
      
      if (res.success) {
        setOrder(prev => {
          const updated = prev ? { ...res.data, items: res.data.items || prev.items } : res.data;
          return formatOrderWithShipment(updated);
        });
        setShowShipmentModal(false);
        toast.success("Shipment created successfully via Sendcloud", { id: toastId });
      } else {
        toast.error(res.message || "Failed to create shipment", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create shipment", { id: toastId });
    } finally {
      setCreatingShipment(false);
    }
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
          <Select value={order.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
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
              disabled={updatingStatus}
              className="rounded-full text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm"
            >
              Next Step: {statusLabels[nextStatus]} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Shipment Actions */}
          {(!order.trackingNumber || (order.labelUrl && order.labelUrl.includes("dummy.pdf"))) && (order.status === "ready_to_ship" || order.status === "label_generated") && (
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
              {(order.items || []).map((item, idx) => (
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
                  {order.shipment.labelUrl && !order.shipment.labelUrl.includes("/labels/") ? (
                    <Button 
                      onClick={() => {
                        const token = localStorage.getItem("admin_token") || localStorage.getItem("customer_token") || "";
                        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                        const url = `${baseUrl}/api/v1/orders/${order.id}/sendcloud/label?token=${token}`;
                        window.open(url, "_blank");
                      }}
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] h-7 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                    >
                      <Tag className="h-3 w-3 mr-1" /> View/Print Label
                    </Button>
                  ) : (
                    <Button onClick={() => setShowLabelMock(true)} size="sm" variant="outline" className="text-[10px] h-7 rounded-full">
                      <Tag className="h-3 w-3 mr-1" /> View Label
                    </Button>
                  )}
                  {order.shipment.trackingUrl && (
                    <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-full" onClick={() => window.open(order.shipment!.trackingUrl, "_blank")}>
                      Track Shipment
                    </Button>
                  )}
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
              <div className="pb-3 space-y-1">
                <p className="text-[9px] font-bold text-stone-500">TO:</p>
                <p className="font-bold text-sm">{order.customerName || `${firstName} ${lastName}`.trim()}</p>
                <p className="leading-relaxed font-bold">{street ? `${street}, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                {phone && <p className="font-bold">Phone: {phone}</p>}
                <p className="font-bold">{order.customerEmail || email}</p>
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
          <div className="bg-white dark:bg-card text-foreground rounded-2xl max-w-[500px] w-full p-6 shadow-2xl space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Create Shipment
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Enter weight and box dimensions for order {order.orderNumber}
              </p>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="weight" className="text-xs font-semibold">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="carrier" className="text-xs font-semibold">Carrier</Label>
                  <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue placeholder="Select shipping method" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethods.length === 0 ? (
                        <SelectItem value="loading" disabled className="text-xs">Loading methods...</SelectItem>
                      ) : (
                        shippingMethods.map(method => (
                          <SelectItem key={method.id} value={method.id.toString()} className="text-xs">
                            {method.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-muted/50 pt-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dimensions (cm)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="length" className="text-[10px] text-muted-foreground">Length</Label>
                    <Input
                      id="length"
                      type="number"
                      min="1"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="width" className="text-[10px] text-muted-foreground">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      min="1"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="height" className="text-[10px] text-muted-foreground">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      min="1"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowShipmentModal(false)} disabled={creatingShipment} className="rounded-full text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingShipment} className="rounded-full text-xs h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  <Truck className="h-4 w-4" /> {creatingShipment ? "Creating..." : "Create Shipment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
