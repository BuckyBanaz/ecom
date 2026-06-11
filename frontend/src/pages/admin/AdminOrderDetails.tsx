import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Tag, Printer, ClipboardCopy, Truck, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Order, statusLabels, MANUAL_STATUSES, AUTO_STATUSES } from "./AdminOrders";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/Logo";
import { ordersRepository } from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { parseOrderMetadata } from "@/utils/formatters";
import { formatPrice } from "@/context/CartContext";
import { printInvoice } from "@/utils/printInvoice";
import { getInvoiceNumber } from "@/utils/invoice";
import { resolveImgUrl } from "@/utils/image";

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
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [creatingShipment, setCreatingShipment] = useState(false);
  
  // Custom confirmation dialog state
  const [showConfirmStatusDialog, setShowConfirmStatusDialog] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string | null>(null);

  // Modal dialog view states for print/preview simulations
  const [showInvoiceMock, setShowInvoiceMock] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [showLabelMock, setShowLabelMock] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("Auto Cheapest");
  const [weight, setWeight] = useState<string>("1.5");
  const [length, setLength] = useState<string>("10");
  const [width, setWidth] = useState<string>("10");
  const [height, setHeight] = useState<string>("10");
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [loadingCarriers, setLoadingCarriers] = useState(false);
  const [carrierSearch, setCarrierSearch] = useState<string>("");
  const [isCarrierOpen, setIsCarrierOpen] = useState(false);

  // Memoize translated status options to avoid portal re-render issues
  const translatedStatusOptions = useMemo(() => {
    return Object.entries(statusLabels).map(([key, label]) => ({
      key,
      label: t(label),
      isAuto: AUTO_STATUSES.includes(key),
    }));
  }, [t]);

  // Helper to get translated status label
  const getTranslatedStatus = (statusKey: string | null): string => {
    if (!statusKey) return statusKey || "";
    return translatedStatusOptions.find(opt => opt.key === statusKey)?.label || statusKey;
  };

  useEffect(() => {
    if (showShipmentModal && order) {
      const fetchMethods = async () => {
        try {
          setLoadingCarriers(true);
          let toCountry: string | undefined = undefined;
          try {
            const addr = typeof order.shippingAddress === "string"
              ? JSON.parse(order.shippingAddress)
              : order.shippingAddress;
            const rawCountry = String(addr?.country || "").toLowerCase().trim();
            const countryMap: Record<string, string> = {
              // Netherlands
              "netherlands": "NL", "nederland": "NL", "nl": "NL",
              // Germany
              "germany": "DE", "deutschland": "DE", "de": "DE",
              // Belgium
              "belgium": "BE", "belgië": "BE", "be": "BE",
              // France
              "france": "FR", "fr": "FR",
              // India
              "india": "IN", "in": "IN",
              // United Kingdom
              "united kingdom": "GB", "uk": "GB", "gb": "GB", "england": "GB", "scotland": "GB",
              // United States
              "united states": "US", "usa": "US", "us": "US", "america": "US",
              // New Zealand
              "new zealand": "NZ", "nz": "NZ", "aotearoa": "NZ",
              // Australia
              "australia": "AU", "au": "AU",
              // Canada
              "canada": "CA", "ca": "CA",
              // Italy
              "italy": "IT", "it": "IT", "italia": "IT",
              // Spain
              "spain": "ES", "es": "ES", "españa": "ES",
              // Portugal
              "portugal": "PT", "pt": "PT",
              // Poland
              "poland": "PL", "pl": "PL",
              // Sweden
              "sweden": "SE", "se": "SE",
              // Norway
              "norway": "NO", "no": "NO",
              // Denmark
              "denmark": "DK", "dk": "DK",
              // Austria
              "austria": "AT", "at": "AT",
              // Switzerland
              "switzerland": "CH", "ch": "CH", "suisse": "CH",
              // Czech Republic
              "czech republic": "CZ", "czech": "CZ", "cz": "CZ",
            };
            toCountry = countryMap[rawCountry] || (addr?.country ? String(addr.country).toUpperCase().substring(0, 2) : undefined);
            console.log("🌍 Destination Country:", rawCountry, "→", toCountry, "| Weight:", weight, "kg");
          } catch (e) {
            console.warn("Failed to parse shipping address:", e);
          }

          const w = parseFloat(weight);
          console.log("📡 Fetching all Sendcloud shipping methods...");
          
          const res = await ordersRepository.getShippingMethods({
            toCountry,
            weight: !isNaN(w) && w > 0 ? w : undefined,
          });

          if (res.success && res.data && res.data.shipping_methods) {
            const allMethods = res.data.shipping_methods;
            console.log(`✅ Got ${allMethods.length} shipping methods from Sendcloud`);
            
            setShippingMethods(allMethods);
            if (allMethods.length > 0) {
              setSelectedCarrier(allMethods[0].id.toString());
              
              // Show info toast if destination is international
              if (toCountry && toCountry !== "NL") {
                toast.info(
                  `${allMethods.length} shipping methods available for ${toCountry}. Some may not support this destination or weight — the API will confirm on submit.`,
                  { duration: 5000 }
                );
              }
            } else {
              setSelectedCarrier("");
              toast.error("No shipping methods available. Configure carriers in Sendcloud.");
            }
          }
        } catch (err) {
          console.error("Failed to fetch shipping methods", err);
          toast.error("Failed to load shipping methods from Sendcloud");
        } finally {
          setLoadingCarriers(false);
        }
      };
      fetchMethods();
    }
  }, [showShipmentModal, order, weight]);

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await ordersRepository.getById(id);
      if (res.success && res.data) {
        const fetchedOrder = res.data;
        const estWeight = (fetchedOrder.items.reduce((sum: number, i: any) => sum + i.quantity, 0) * 1.5).toFixed(1);
        setWeight(estWeight);
        const formattedOrder = formatOrderWithShipment(fetchedOrder);
        setOrder(formattedOrder);
        setSelectedStatus(formattedOrder.status);
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
    const toastId = toast.loading(t("admin_order_details.toast_updating", { status: getTranslatedStatus(newStatus) || newStatus }));
    try {
      const res = await ordersRepository.updateStatus(order.id, newStatus);
      if (res.success) {
        setOrder(prev => {
          const updated = prev ? { ...res.data, items: res.data.items || prev.items } : res.data;
          const formatted = formatOrderWithShipment(updated);
          setSelectedStatus(formatted.status);
          return formatted;
        });
        toast.success(t("admin_order_details.toast_updated", { status: getTranslatedStatus(newStatus) || newStatus }), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_order_details.toast_error_failed"), { id: toastId });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const { formattedAddress, tax, discount, phone, email, firstName, lastName, street, houseNumber, landmark, city, state, pincode, country } = order ? parseOrderMetadata(order.shippingAddress) : { formattedAddress: "", tax: 0, discount: 0, phone: "", email: "", firstName: "", lastName: "", street: "", houseNumber: "", landmark: "", city: "", state: "", pincode: "", country: "" };

  const handleGenerateInvoice = () => {
    if (!order) return;
    setShowInvoiceMock(true);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || creatingShipment) return;
    
    setCreatingShipment(true);
    const toastId = toast.loading("Creating shipment via Sendcloud...");
    try {
      if (!selectedCarrier || isNaN(Number(selectedCarrier))) {
        toast.error(t("admin_order_details.toast_select_carrier"), { id: toastId });
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
        toast.success(t("admin_order_details.toast_shipment_created"), { id: toastId });
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
        <p className="text-muted-foreground">{t("admin_order_details.loading")}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">{t("admin_order_details.not_found")}</p>
        <Button onClick={() => navigate("/admin/orders")} variant="outline" className="rounded-full">
          {t("admin_order_details.button_back")}
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
            <h1 className="text-2xl font-bold tracking-tight">{t("admin_order_details.header_order", { orderNumber: order.orderNumber })}</h1>
            <p className="text-muted-foreground text-xs">
              {t("admin_order_details.header_placed", { date: new Date(order.createdAt).toLocaleString() })}
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
            <FileText className="h-4 w-4" /> {t("admin_order_details.button_invoice")}
          </Button>
          
          {/* Status Select */}
          {isMounted && (
            <Select value={selectedStatus || order?.status} onValueChange={setSelectedStatus} disabled={updatingStatus}>
              <SelectTrigger className="w-[220px] h-9 text-xs bg-background border-muted-foreground/20 rounded-full font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {translatedStatusOptions.map(({ key, label, isAuto }) => (
                  <SelectItem key={key} value={key} className="text-xs" disabled={isAuto}>
                    <span>{label}</span> {isAuto && <span className="text-xs text-muted-foreground">(Auto)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Save Status Button */}
          {selectedStatus && order && selectedStatus !== order.status && (
            <Button
              onClick={() => {
                setPendingStatusUpdate(selectedStatus);
                setShowConfirmStatusDialog(true);
              }}
              disabled={updatingStatus}
              className="rounded-full text-xs font-bold h-9 bg-green-600 text-white hover:bg-green-700 shadow-sm transition-all"
            >
              {t("admin_order_details.button_save_status")}
            </Button>
          )}

          {/* Quick next status button */}
          {nextStatus && !(selectedStatus && order && selectedStatus !== order.status) && (
            <Button
              onClick={() => {
                setPendingStatusUpdate(nextStatus);
                setShowConfirmStatusDialog(true);
              }}
              disabled={updatingStatus}
              className="rounded-full text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm"
            >
              {t("admin_order_details.button_next", { status: getTranslatedStatus(nextStatus) })} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Shipment Actions */}
          {(!order.trackingNumber || (order.labelUrl && order.labelUrl.includes("dummy.pdf"))) && (order.status === "ready_to_ship" || order.status === "label_generated") && (
            <Button
              onClick={() => setShowShipmentModal(true)}
              className="rounded-full text-xs font-bold gap-1.5 h-9 bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
            >
              <Truck className="h-4 w-4" /> {t("admin_order_details.button_create_shipment")}
            </Button>
          )}

          {AUTO_STATUSES.includes(order.status) && order.status !== "delivered" && (
            <Button disabled className="rounded-full text-xs font-bold gap-1.5 h-9 bg-muted text-muted-foreground border">
              {t("admin_order_details.button_waiting")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Items & Financial Summary */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90">{t("admin_order_details.section_items")}</h3>
            <div className="divide-y divide-border/60">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <img
                    src={resolveImgUrl(item.productImage)}
                    alt={item.productName}
                    className="h-12 w-12 rounded-xl object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">{item.productName}</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                      {t("admin_order_details.label_quantity")} {item.quantity} {item.variant && `· ${item.variant}`}
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
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90">{t("admin_order_details.section_summary")}</h3>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>{t("admin_order_details.label_subtotal")}</span>
                <span className="font-semibold text-foreground">€{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("admin_order_details.label_shipping")}</span>
                <span className="font-semibold text-foreground">
                  {order.shipping === 0 ? t("admin_order_details.shipping_free") : `€${order.shipping.toFixed(2)}`}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span>{t("admin_order_details.label_tax")}</span>
                  <span className="font-semibold text-foreground">€{tax.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between">
                  <span>{t("admin_order_details.label_discount")}</span>
                  <span className="font-semibold text-green-600">-€{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-bold text-sm text-foreground">
                <span>{t("admin_order_details.label_total")}</span>
                <span>€{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Customer Details & Fulfillment info */}
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90">{t("admin_order_details.section_customer")}</h3>
            <div className="space-y-2">
              <div>
                <p className="text-muted-foreground font-semibold">{t("admin_order_details.label_name")}</p>
                <p className="font-bold text-foreground mt-0.5">{order.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">{t("admin_order_details.label_email")}</p>
                <p className="font-bold text-foreground mt-0.5">{order.customerEmail}</p>
              </div>
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-1">{t("admin_order_details.label_address")}</p>
                <div className="font-bold text-foreground mt-0.5 leading-relaxed space-y-1">
                  <p>{order.customerName || `${firstName} ${lastName}`.trim()}</p>
                  <p>{street ? `${street} ${houseNumber}`.trim() + `, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                  {landmark && <p className="text-muted-foreground italic text-[10px]">{t("admin_order_details.label_landmark")} {landmark}</p>}
                  {phone && <p>{t("admin_order_details.label_phone")} {phone}</p>}
                  <p>{t("admin_order_details.label_email")}: {order.customerEmail || email}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">{t("admin_order_details.label_payment")}</p>
                <p className="font-bold text-foreground mt-0.5 capitalize">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm border-b pb-3 text-foreground/90 flex justify-between items-center">
              <span>{t("admin_order_details.section_logistics")}</span>
              {order.shipment && <Badge variant="outline" className="text-[10px]">{order.shipment.carrier}</Badge>}
            </h3>
            
            {!order.shipment ? (
              <div className="py-6 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Truck className="h-8 w-8 opacity-20" />
                <p>{t("admin_order_details.no_shipment")}</p>
                {order.status === "ready_to_ship" && (
                  <Button onClick={() => setShowShipmentModal(true)} size="sm" variant="outline" className="mt-2 text-xs rounded-full border-dashed">
                    {t("admin_order_details.button_create_shipment")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-muted-foreground font-semibold">{t("admin_order_details.label_carrier")}</p>
                    <p className="font-bold text-foreground mt-0.5">{order.shipment.carrier}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">{t("admin_order_details.label_status")}</p>
                    <div className="mt-1">
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-semibold">
                        {getTranslatedStatus(order.status) || order.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground font-semibold">{t("admin_order_details.label_tracking")}</p>
                    <p className="font-mono font-bold text-primary mt-0.5 select-all flex items-center gap-1.5">
                      {order.shipment.trackingNumber}
                      <button onClick={() => { navigator.clipboard.writeText(order.shipment!.trackingNumber); toast.success(t("admin_order_details.toast_tracking_copied")); }} className="text-muted-foreground hover:text-foreground">
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
                        const url = `${ENDPOINTS.ORDERS}/${order.id}/sendcloud/label?token=${token}`;
                        window.open(url, "_blank");
                      }}
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] h-7 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                    >
                      <Tag className="h-3 w-3 mr-1" /> {t("admin_order_details.button_view_label")}
                    </Button>
                  ) : (
                    <Button onClick={() => setShowLabelMock(true)} size="sm" variant="outline" className="text-[10px] h-7 rounded-full">
                      <Tag className="h-3 w-3 mr-1" /> {t("admin_order_details.button_view_label_mock")}
                    </Button>
                  )}
                  {order.shipment.trackingUrl && (
                    <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-full" onClick={() => window.open(order.shipment!.trackingUrl, "_blank")}>
                      {t("admin_order_details.button_track")}
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
          <div className="invoice-print-area bg-white text-black rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <Logo forceLight className="mb-1 pointer-events-none" />
                <p className="text-xs text-stone-500 mt-1">{t("admin_order_details.invoice_title")}</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p className="font-bold">{t("admin_order_details.invoice_number")} {getInvoiceNumber(order)}</p>
                <p>{t("admin_order_details.invoice_date")} {new Date().toLocaleDateString()}</p>
                <p>{t("admin_order_details.invoice_reference")} {order.orderNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">{t("admin_order_details.invoice_vendor")}</h4>
                <p className="mt-1 font-semibold">Schip & Ster BV</p>
                <p>Keizersgracht 456, Amsterdam</p>
                <p>billing@schipandster.nl</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">{t("admin_order_details.invoice_billto")}</h4>
                <div className="mt-1 space-y-1">
                  <p className="font-semibold">{order.customerName || `${firstName} ${lastName}`.trim()}</p>
                  <p className="leading-relaxed">{street ? `${street} ${houseNumber}`.trim() + `, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                  {landmark && <p className="italic">Landmark: {landmark}</p>}
                  {phone && <p>Phone: {phone}</p>}
                  <p>Email: {order.customerEmail || email}</p>
                </div>
              </div>
            </div>

            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                    <th className="p-3">{t("admin_order_details.invoice_product")}</th>
                    <th className="p-3 text-center">{t("admin_order_details.invoice_qty")}</th>
                    <th className="p-3 text-right">{t("admin_order_details.invoice_price")}</th>
                    <th className="p-3 text-right">{t("admin_order_details.invoice_total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {order.items.map((item, i) => (
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
                {/* Summary */}
                <div className="mt-6 border-t pt-4 space-y-2 text-sm text-foreground">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("admin_order_details.label_subtotal")}</span><span>{formatPrice(order.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("admin_order_details.label_shipping")}</span><span>{order.shipping === 0 ? t("admin_order_details.shipping_free") : formatPrice(order.shipping)}</span></div>
                  {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("admin_order_details.label_tax")}</span><span>{formatPrice(tax)}</span></div>}
                  {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("admin_order_details.label_discount")}</span><span className="text-green-600">-{formatPrice(discount)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>{t("admin_order_details.label_total")}</span><span>{formatPrice(order.total)}</span></div>
                </div>
              </div>
            </div>

            <div className="text-center border-t border-stone-200 pt-6">
              <p className="text-[10px] text-stone-400">{t("admin_order_details.invoice_thank")}</p>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <Button onClick={printInvoice} variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                <Printer className="h-3.5 w-3.5" /> {t("admin_order_details.button_print")}
              </Button>
              <Button onClick={() => setShowInvoiceMock(false)} size="sm" className="text-xs bg-amber-900 hover:bg-amber-950 text-white rounded-full">
                {t("admin_order_details.button_done")}
              </Button>
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
                <p className="leading-relaxed font-bold">{street ? `${street} ${houseNumber}`.trim() + `, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                {landmark && <p className="font-bold italic text-[9px]">Landmark: {landmark}</p>}
                {phone && <p className="font-bold">Phone: {phone}</p>}
                <p className="font-bold">{order.customerEmail || email}</p>
              </div>
            </div>

            <div className="flex justify-between items-center border-t-2 border-black pt-4 space-y-2">
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
                <Printer className="h-3.5 w-3.5" /> {t("admin_order_details.button_print")}
              </Button>
              <Button onClick={() => setShowLabelMock(false)} size="sm" className="text-xs bg-black hover:bg-stone-900 text-white rounded-full">
                {t("admin_order_details.button_close")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Create Shipment Modal */}
      {showShipmentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card text-foreground rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6">
            <div className="border-b pb-3 relative">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> {t("admin_order_details.shipment_create_title")}
                </h2>
                <button 
                  onClick={() => setShowShipmentModal(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin_order_details.shipment_enter", { orderNumber: order.orderNumber })}
              </p>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="weight" className="text-xs font-semibold">{t("admin_order_details.shipment_weight")}</Label>
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

                <div className="space-y-1.5 relative">
                  <Label htmlFor="carrier" className="text-xs font-semibold">{t("admin_order_details.shipment_carrier")}</Label>
                  
                  <div 
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    onClick={() => setIsCarrierOpen(!isCarrierOpen)}
                  >
                    <span className="truncate">
                      {selectedCarrier 
                        ? shippingMethods.find(m => m.id.toString() === selectedCarrier)?.name || t("admin_order_details.shipment_select")
                        : t("admin_order_details.shipment_select")}
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-50 rotate-90" />
                  </div>

                  {isCarrierOpen && (
                    <div className="absolute z-50 w-full top-full mt-1 bg-white dark:bg-popover border shadow-md rounded-md overflow-hidden">
                      <div className="p-2 border-b bg-muted/20">
                        <Input 
                          placeholder="Search carriers..." 
                          value={carrierSearch}
                          onChange={(e) => setCarrierSearch(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {loadingCarriers ? (
                          <div className="p-4 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-xs">Loading carriers...</span>
                          </div>
                        ) : shippingMethods.filter(m => m.name.toLowerCase().includes(carrierSearch.toLowerCase())).length === 0 ? (
                          <div className="p-2 text-xs text-center text-muted-foreground">No carriers found</div>
                        ) : (
                          shippingMethods
                            .filter(m => m.name.toLowerCase().includes(carrierSearch.toLowerCase()))
                            .map(method => {
                              const w = parseFloat(weight) || 0;
                              const n = method.name.toLowerCase();
                              // Suggestion logic
                              const isSuggested = (w < 2 && n.includes("mailbox")) || 
                                                  (w >= 2 && n.includes("standard")) || 
                                                  n.includes("postnl standard");
                                                  
                              const isDomestic = n.includes("postnl") || n.includes("dhl for you") || (!n.includes("global") && !n.includes("connect") && !n.includes("international"));
                              const isInternational = n.includes("global") || n.includes("connect") || n.includes("international") || n.includes("dhl parcel connect");

                              return (
                                <div 
                                  key={method.id}
                                  onClick={() => { setSelectedCarrier(method.id.toString()); setIsCarrierOpen(false); }}
                                  className={`flex items-center justify-between p-2 text-xs rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${selectedCarrier === method.id.toString() ? 'bg-accent/50 font-bold' : ''}`}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span>{method.name}</span>
                                    <div className="flex items-center gap-1">
                                      {isDomestic ? (
                                        <span className="text-[9px] text-blue-600 bg-blue-100 px-1 rounded">Domestic</span>
                                      ) : isInternational ? (
                                        <span className="text-[9px] text-orange-600 bg-orange-100 px-1 rounded">International</span>
                                      ) : null}
                                    </div>
                                  </div>
                                  {isSuggested && <Badge variant="secondary" className="text-[9px] h-4 py-0 px-1 bg-green-100 text-green-700 hover:bg-green-100 shrink-0">Suggested</Badge>}
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-muted/50 pt-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("admin_order_details.shipment_dimensions")}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="length" className="text-[10px] text-muted-foreground">{t("admin_order_details.shipment_length")}</Label>
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
                    <Label htmlFor="width" className="text-[10px] text-muted-foreground">{t("admin_order_details.shipment_width")}</Label>
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
                    <Label htmlFor="height" className="text-[10px] text-muted-foreground">{t("admin_order_details.shipment_height")}</Label>
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
                  {t("admin_order_details.button_cancel")}
                </Button>
                <Button type="submit" disabled={creatingShipment} className="rounded-full text-xs h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  <Truck className="h-4 w-4" /> {creatingShipment ? t("admin_order_details.shipment_creating") : t("admin_order_details.button_create_shipment")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Status Change */}
      {showConfirmStatusDialog && pendingStatusUpdate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" /> {t("admin_order_details.confirm_title")}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t("admin_order_details.confirm_msg")} <strong className="text-foreground">"{getTranslatedStatus(pendingStatusUpdate)}"</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowConfirmStatusDialog(false);
                  setPendingStatusUpdate(null);
                }} 
                className="rounded-full h-9 text-xs font-bold"
              >
                {t("admin_order_details.button_cancel")}
              </Button>
              <Button 
                onClick={() => {
                  handleStatusChange(pendingStatusUpdate);
                  setShowConfirmStatusDialog(false);
                  setPendingStatusUpdate(null);
                }} 
                className="rounded-full h-9 bg-green-600 hover:bg-green-700 text-white text-xs font-bold"
              >
                {t("admin_order_details.button_confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
