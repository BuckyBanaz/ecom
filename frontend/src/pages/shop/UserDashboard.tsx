import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, Heart, MapPin, User, LogOut, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { orders, Order } from "@/data/orders";
import { useWishlist } from "@/context/WishlistContext";
import { products } from "@/data/products";
import { ProductCard } from "@/components/shop/ProductCard";
import { toast } from "sonner";
import { SafeImage } from "@/components/ui/SafeImage";
import { MapSelector } from "@/components/shop/MapSelector";
import { addressRepository, authRepository, ordersRepository } from "@/client/apiClient";
import { Loader2, FileText, CreditCard, Truck, Check, X } from "lucide-react";
import { parseOrderMetadata } from "@/utils/formatters";
import { ReviewModal } from "@/components/shop/ReviewModal";
import { useFcmToken } from "@/hooks/useFcmToken";
import { PhonePicker } from "@/components/ui/PhonePicker";
import { parseAndValidateFullPhone } from "@/utils/phoneValidation";

interface Address {
  id: string | number;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  houseNumber?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat: string;
  lng: string;
  isDefault: boolean;
}

const getFriendlyStatus = (status: string, t: (key: string) => string): string => {
  const s = status?.toLowerCase();
  if (["pending", "payment_pending", "payment_failed"].includes(s)) {
    return t("dashboard.status.pending_payment");
  }
  if (["paid", "processing", "ready_to_ship", "label_generated"].includes(s)) {
    return t("dashboard.status.processing");
  }
  if (["shipped", "picked_up", "in_transit", "out_for_delivery"].includes(s)) {
    return t("dashboard.status.shipped");
  }
  if (s === "delivered") {
    return t("dashboard.status.delivered");
  }
  if (s === "cancelled") {
    return t("dashboard.status.cancelled");
  }
  return status ? status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
};

const getStepIndex = (status: string) => {
  const s = status?.toLowerCase();
  if (["pending", "payment_pending", "payment_failed"].includes(s)) return 0;
  if (["paid", "processing"].includes(s)) return 1;
  if (["ready_to_ship", "label_generated"].includes(s)) return 2; // Processing done, preparing shipment
  if (["shipped", "picked_up", "in_transit", "out_for_delivery"].includes(s)) return 2;
  if (s === "delivered") return 3;
  return 0;
};

const getStatusBadgeClass = (status: string): string => {
  const s = status?.toLowerCase();
  if (["pending", "payment_pending", "payment_failed"].includes(s)) {
    return "bg-orange-100 text-orange-700";
  }
  if (["paid", "processing", "ready_to_ship", "label_generated"].includes(s)) {
    return "bg-yellow-100 text-yellow-700";
  }
  if (["shipped", "picked_up", "in_transit", "out_for_delivery"].includes(s)) {
    return "bg-blue-100 text-blue-700";
  }
  if (s === "delivered") {
    return "bg-green-100 text-green-700";
  }
  if (s === "cancelled") {
    return "bg-red-100 text-red-700";
  }
  return "bg-gray-100 text-gray-700";
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items: wishlistProducts } = useWishlist();
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "orders";
  });
  
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") || "orders";
    if (tabParam !== tab) {
      setTab(tabParam);
    }
  }, [window.location.search]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    params.delete("orderId"); // Clear order detail view when switching tabs
    navigate(`/dashboard?${params.toString()}`);
  };

  useEffect(() => {
    const token = localStorage.getItem("customer_token");
    const storedUser = localStorage.getItem("customer_user");
    
    if (!token || !storedUser) {
      navigate("/account", { replace: true });
    } else {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        navigate("/account", { replace: true });
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");
    toast.success(t("dashboard.sidebar.toast_logout"));
    navigate("/account");
  };

  if (!user) return null;

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-semibold">{user?.firstName ? `${user.firstName} ${user.lastName || ""}` : t("dashboard.sidebar.fallback_name")}</p>
                <p className="text-xs text-muted-foreground truncate w-40">{user?.email || user?.phone || t("dashboard.sidebar.fallback_email")}</p>
              </div>
            </div>
            <nav className="space-y-1">
              {[
                { icon: Package, label: t("dashboard.sidebar.my_orders"), value: "orders" },
                { icon: Heart, label: t("dashboard.sidebar.wishlist"), value: "wishlist" },
                { icon: MapPin, label: t("dashboard.sidebar.addresses"), value: "addresses" },
                { icon: User, label: t("dashboard.sidebar.profile"), value: "profile" },
                { icon: Settings, label: t("dashboard.sidebar.settings"), value: "settings" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    tab === item.value ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              <button 
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-4"
              >
                <LogOut className="h-4 w-4" />
                {t("dashboard.sidebar.logout")}
              </button>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {tab === "orders" && <OrdersTab />}
          {tab === "wishlist" && <WishlistTab products={wishlistProducts} />}
          {tab === "addresses" && <AddressesTab />}
          {tab === "profile" && <ProfileTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};

function OrdersTab() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState("");
  const [reviewProductName, setReviewProductName] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (ordersList.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const orderIdParam = params.get("orderId");
      if (orderIdParam) {
        const matched = ordersList.find(o => o.orderNumber === orderIdParam || o.id === orderIdParam);
        if (matched) {
          setSelectedOrder(matched);
        } else {
          setSelectedOrder(null);
        }
      } else {
        setSelectedOrder(null);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [ordersList, window.location.search]);

  const handleSelectOrder = (orderNumber: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("orderId", orderNumber);
    navigate(`/dashboard?${params.toString()}`);
  };

  const handleClearSelectedOrder = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("orderId");
    navigate(`/dashboard?${params.toString()}`);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersRepository.getMyOrders();
      setOrdersList(res.data || []);
    } catch (err) {
      toast.error(t("dashboard.orders.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (orderId: string) => {
    try {
      setIsProcessingAction(true);
      const res = await ordersRepository.retryPayment(orderId);
      if (res.success && res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      toast.error(err.message || t("dashboard.orders.toast_payment_failed"));
      setIsProcessingAction(false);
    }
  };

  const handleViewInvoice = async (orderId: string) => {
    try {
      setIsProcessingAction(true);
      const res = await ordersRepository.getMyOrderById(orderId);
      if (res.success && res.invoiceToken) {
        window.open(`/invoice?token=${res.invoiceToken}`, "_blank");
      } else {
        toast.error(t("dashboard.orders.toast_invoice_token_failed"));
      }
    } catch (err: any) {
      toast.error(err.message || t("dashboard.orders.toast_invoice_failed"));
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (selectedOrder) {
    const isPending = ["pending", "payment_pending", "payment_failed"].includes(selectedOrder.status);
    const { formattedAddress, tax, discount, phone, email, firstName, lastName, street, houseNumber, landmark, city, state, pincode, country } = parseOrderMetadata(selectedOrder.shippingAddress);
    
    return (
      <>
        <div>
          <button onClick={() => handleClearSelectedOrder()} className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline">
            {t("dashboard.orders.back_to_orders")}
          </button>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedOrder.orderNumber}</h2>
              <p className="text-sm text-muted-foreground">{t("dashboard.orders.placed_on", { date: new Date(selectedOrder.createdAt).toLocaleDateString() })}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(selectedOrder.status)}`}>
                {getFriendlyStatus(selectedOrder.status, t)}
              </span>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewInvoice(selectedOrder.id)}
                disabled={isProcessingAction}
                className="rounded-full h-8 px-3 gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" /> {t("dashboard.orders.invoice")}
              </Button>
              
              {isPending && (
                <Button 
                  size="sm" 
                  onClick={() => handlePayNow(selectedOrder.id)}
                  disabled={isProcessingAction}
                  className="rounded-full h-8 px-4 bg-primary text-primary-foreground font-semibold shadow-sm"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" /> {t("dashboard.orders.pay_now")}
                </Button>
              )}
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="mb-8 py-6 px-4 rounded-xl bg-muted/30 border border-muted/50">
            <div className="relative flex items-center justify-between w-full">
              {/* Connection Line Base (Gray) */}
              <div className="absolute left-0 right-0 top-[16px] -translate-y-1/2 h-1 bg-muted rounded-full" />
              
              {/* Active/Completed Connection Line (Green) */}
              <div 
                className="absolute left-0 top-[16px] -translate-y-1/2 h-1 bg-green-500 rounded-full transition-all duration-500" 
                style={{
                  width: selectedOrder.status === "cancelled" ? "0%" :
                         selectedOrder.status === "delivered" ? "100%" :
                         ["shipped", "picked_up", "in_transit", "out_for_delivery"].includes(selectedOrder.status) ? "66.6%" :
                         ["ready_to_ship", "label_generated"].includes(selectedOrder.status) ? "50%" :
                         ["paid", "processing"].includes(selectedOrder.status) ? "33.3%" : "0%"
                }}
              />

              {/* Steps */}
              {[
                { label: t("dashboard.orders.step_confirmed"), key: "confirmed" },
                { label: t("dashboard.orders.step_processing"), key: "processing" },
                { label: t("dashboard.orders.step_shipped"), key: "shipped" },
                { label: t("dashboard.orders.step_delivered"), key: "delivered" }
              ].map((step, idx) => {
                const isCancelled = selectedOrder.status === "cancelled";
                const currentIdx = getStepIndex(selectedOrder.status);
                
                let state: "completed" | "active" | "failed" | "pending" = "pending";
                
                if (isCancelled) {
                  if (idx === 0) {
                    state = "completed"; // Order was placed/confirmed initially
                  } else if (idx === 1) {
                    state = "failed"; // Failed/cancelled at processing stage
                  } else {
                    state = "pending";
                  }
                } else {
                  if (idx < currentIdx) {
                    state = "completed";
                  } else if (idx === currentIdx) {
                    state = "active";
                  } else {
                    state = "pending";
                  }
                }

                return (
                  <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
                    {/* Step Node */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-background ${
                      state === "completed" ? "border-green-500 bg-green-500 text-white shadow-sm shadow-green-200" :
                      state === "active" ? "border-green-500 bg-background text-green-600 ring-4 ring-green-100" :
                      state === "failed" ? "border-red-500 bg-red-500 text-white shadow-sm shadow-red-200" :
                      "border-muted bg-background text-muted-foreground"
                    }`}>
                      {state === "completed" && <Check className="w-4 h-4 stroke-[3]" />}
                      {state === "active" && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />}
                      {state === "failed" && <X className="w-4 h-4 stroke-[3]" />}
                      {state === "pending" && <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                    </div>
                    
                    {/* Step Label */}
                    <span className={`text-xs mt-2 font-medium text-center hidden sm:block ${
                      state === "completed" ? "text-green-600" :
                      state === "active" ? "text-green-700 font-semibold" :
                      state === "failed" ? "text-red-600 font-semibold" :
                      "text-muted-foreground"
                    }`}>
                      {step.label}
                    </span>
                    {/* Small Screen Label */}
                    <span className={`text-[10px] mt-2 font-medium text-center sm:hidden max-w-[65px] truncate ${
                      state === "completed" ? "text-green-600" :
                      state === "active" ? "text-green-700 font-semibold" :
                      state === "failed" ? "text-red-600 font-semibold" :
                      "text-muted-foreground"
                    }`}>
                      {step.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items */}
          <h3 className="font-semibold mb-3">{t("dashboard.orders.items")}</h3>
          <div className="space-y-3">
            {selectedOrder.items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 rounded-lg border p-3 flex-wrap sm:flex-nowrap">
                <SafeImage src={item.productImage} alt={item.productName} className="h-16 w-16 rounded-lg object-cover" fallbackType="product" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.orders.qty", { quantity: item.quantity })} {item.variant && `· ${item.variant}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</span>
                  {selectedOrder.status === "delivered" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setReviewProductId(item.productId);
                        setReviewProductName(item.productName);
                        setIsReviewModalOpen(true);
                      }}
                      className="rounded-full text-xs font-semibold border-amber-500 text-amber-600 hover:bg-amber-50"
                    >
                      {t("dashboard.orders.write_review")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("dashboard.orders.subtotal")}</span><span>€{selectedOrder.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("dashboard.orders.shipping")}</span><span>{selectedOrder.shipping === 0 ? t("dashboard.orders.shipping_free") : `€${selectedOrder.shipping.toFixed(2)}`}</span></div>
            {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("dashboard.orders.tax")}</span><span>€{tax.toFixed(2)}</span></div>}
            {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("dashboard.orders.discount")}</span><span className="text-green-600">-€{discount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>{t("dashboard.orders.total")}</span><span>€{selectedOrder.total.toFixed(2)}</span></div>
          </div>

          {/* Details */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold mb-1">{t("dashboard.orders.shipping_address")}</p>
              <div className="text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">{selectedOrder.customerName || `${firstName} ${lastName}`.trim()}</p>
                <p>{street ? `${street} ${houseNumber}`.trim() + `, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                {landmark && <p className="italic text-[10px]">{t("dashboard.orders.landmark", { value: landmark })}</p>}
                {phone && <p>{t("dashboard.orders.phone", { value: phone })}</p>}
                <p>{t("dashboard.orders.email", { value: selectedOrder.customerEmail || email })}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold mb-2">{t("dashboard.orders.payment_summary")}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-muted-foreground/10 pb-1 mb-1">
                  <span>{t("dashboard.orders.method")}</span>
                  <span className="font-semibold text-foreground capitalize">{selectedOrder.paymentMethod || t("dashboard.orders.method_default")}</span>
                </div>
                <div className="flex justify-between border-b border-muted-foreground/10 pb-1 mb-1">
                  <span>{t("dashboard.orders.status_label")}</span>
                  <span className={`font-semibold capitalize ${
                    selectedOrder.paymentStatus?.toLowerCase() === "paid" || selectedOrder.status === "paid" || selectedOrder.status === "processing" || selectedOrder.status === "shipped" || selectedOrder.status === "delivered" ? "text-green-600" :
                    selectedOrder.status === "cancelled" ? "text-red-600" : "text-orange-600"
                  }`}>{selectedOrder.paymentStatus || (selectedOrder.status === "pending" ? t("dashboard.orders.status_pending") : t("dashboard.orders.status_paid"))}</span>
                </div>
                {selectedOrder.stripePaymentId && (
                  <div className="flex justify-between border-b border-muted-foreground/10 pb-1 mb-1">
                    <span>{t("dashboard.orders.transaction_id")}</span>
                    <span className="font-mono text-[10px] text-foreground">{selectedOrder.stripePaymentId}</span>
                  </div>
                )}
                {selectedOrder.stripeSessionId && (
                  <div className="flex justify-between border-b border-muted-foreground/10 pb-1 mb-1">
                    <span>{t("dashboard.orders.session_id")}</span>
                    <span className="font-mono text-[10px] text-foreground truncate max-w-[150px]" title={selectedOrder.stripeSessionId}>{selectedOrder.stripeSessionId}</span>
                  </div>
                )}
                <div className="flex justify-between pt-0.5">
                  <span>{t("dashboard.orders.reference_utr")}</span>
                  <span className="font-mono text-[10px] text-foreground">
                    {selectedOrder.stripePaymentId 
                      ? `UTR-${selectedOrder.stripePaymentId.replace("pi_", "").replace("ch_", "").substring(0, 12).toUpperCase()}` 
                      : `UTR-${selectedOrder.id.replace(/-/g, "").substring(0, 12).toUpperCase()}`
                    }
                  </span>
                </div>
              </div>
            </div>
            {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && selectedOrder.trackingNumber && (
              <div className="rounded-lg bg-muted p-4 col-span-2 flex items-center justify-between flex-wrap gap-4 border border-primary/15">
                <div>
                  <p className="font-semibold mb-1 flex items-center gap-1.5"><Truck size={16} className="text-primary" /> {t("dashboard.orders.shipment_tracking")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.orders.carrier")} <span className="font-semibold text-foreground">{selectedOrder.carrier || t("dashboard.orders.carrier_default")}</span> • {t("dashboard.orders.tracking_number")} <span className="font-mono font-semibold text-foreground">{selectedOrder.trackingNumber}</span>
                  </p>
                </div>
                {selectedOrder.trackingUrl && (
                  <Button asChild size="sm" className="rounded-full text-xs">
                    <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener noreferrer">{t("dashboard.orders.track_shipment")}</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
        <ReviewModal 
          isOpen={isReviewModalOpen} 
          onClose={() => setIsReviewModalOpen(false)} 
          productId={reviewProductId} 
          productName={reviewProductName} 
          onSuccess={() => {
            fetchOrders();
          }}
        />
      </>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("dashboard.orders.title")}</h2>
      {ordersList.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t("dashboard.orders.empty_title")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.orders.empty_desc")}</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/">{t("dashboard.orders.browse_products")}</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {ordersList.map((o: any) => (
            <button key={o.id} onClick={() => handleSelectOrder(o.orderNumber)} className="w-full flex items-start sm:items-center gap-3 sm:gap-4 rounded-xl border bg-card p-3 sm:p-4 shadow-sm hover:bg-muted/30 transition text-left">
              <SafeImage src={o.items[0].productImage} alt="" className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg object-cover mt-1 sm:mt-0" fallbackType="product" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="font-semibold truncate text-sm sm:text-base">{o.orderNumber}</span>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${getStatusBadgeClass(o.status)}`}>
                    {getFriendlyStatus(o.status, t)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("dashboard.orders.items_count", { count: o.items.length })} · {new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end">
                <p className="font-semibold text-sm sm:text-base">€{o.total.toFixed(2)}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistTab({ products: items }: { products: typeof products }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("dashboard.wishlist.title")}</h2>
      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t("dashboard.wishlist.empty_title")}</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/">{t("dashboard.wishlist.explore_products")}</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function AddressesTab() {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchAddresses = async () => {
    try {
      setFetching(true);
      const res = await addressRepository.getAll();
      setAddresses(res.data || []);
    } catch (err: any) {
      toast.error(err.message || t("dashboard.addresses.toast_load_failed"));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  
  const [formData, setFormData] = useState<Partial<Address>>({
    label: "Home", firstName: "", lastName: "", phone: "", street: "", houseNumber: "", city: "", state: "", pincode: "", country: "", lat: "", lng: "", isDefault: false
  });
  const [addressError, setAddressError] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");

  const handleOpenForm = (address?: Address) => {
    if (address) {
      setEditingId(address.id);
      setFormData(address);
    } else {
      setEditingId(null);
      setFormData({ label: "Home", firstName: "", lastName: "", phone: "", street: "", houseNumber: "", city: "", state: "", pincode: "", country: "", lat: "", lng: "", isDefault: false });
    }
    setAddressError("");
    setPhoneError("");
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await addressRepository.delete(id.toString());
      toast.success(t("dashboard.addresses.toast_deleted"));
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || t("dashboard.addresses.toast_delete_failed"));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = parseAndValidateFullPhone(formData.phone || "");
    if (!validation.isValid) {
      setPhoneError(t("auth_pages.login.toast_invalid_phone"));
      return;
    }
    setPhoneError("");
    
    // Explicit manual validation
    if (formData.houseNumber && !/^[0-9]+[a-zA-Z0-9\s-]*$/.test(formData.houseNumber)) {
      setAddressError(t("dashboard.addresses.house_number_error"));
      return;
    }
    setAddressError("");

    const cleanedData = { ...formData, phone: validation.cleanedFullPhone };

    setLoading(true);
    try {
      if (editingId) {
        await addressRepository.update(editingId.toString(), cleanedData);
        toast.success(t("dashboard.addresses.toast_updated"));
      } else {
        await addressRepository.create(cleanedData);
        toast.success(t("dashboard.addresses.toast_added"));
      }
      setIsFormOpen(false);
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || t("dashboard.addresses.toast_save_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelect = (loc: any) => {
    setFormData({
      ...formData,
      lat: loc.lat,
      lng: loc.lng,
      street: loc.street || formData.street,
      city: loc.city || formData.city,
      state: loc.state || formData.state,
      pincode: loc.pincode || formData.pincode,
      country: loc.country || formData.country,
    });
    setIsMapOpen(false);
    toast.success(t("dashboard.addresses.toast_location_extracted"));
  };

  if (isFormOpen) {
    return (
      <div className="bg-card border rounded-xl p-6 shadow-sm max-w-2xl relative">
        {isMapOpen && <MapSelector onSelect={handleMapSelect} onCancel={() => setIsMapOpen(false)} />}
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{editingId ? t("dashboard.addresses.form.edit_title") : t("dashboard.addresses.form.add_title")}</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsMapOpen(true)} className="rounded-full gap-2 border-primary text-primary hover:bg-primary/5">
            <MapPin size={16} /> {t("dashboard.addresses.form.choose_on_map")}
          </Button>
        </div>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("dashboard.addresses.form.first_name")}</Label><Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required className="mt-1" /></div>
            <div><Label>{t("dashboard.addresses.form.last_name")}</Label><Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("dashboard.addresses.form.phone")}</Label>
              <PhonePicker value={formData.phone || ""} onChange={val => { setFormData({...formData, phone: val}); setPhoneError(""); }} required error={phoneError} className="mt-1" />
            </div>
            <div>
              <Label>{t("dashboard.addresses.form.address_label")}</Label>
              <select 
                value={formData.label} 
                onChange={e => setFormData({...formData, label: e.target.value})} 
                required 
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
              >
                <option value="Home">{t("dashboard.addresses.form.label_home")}</option>
                <option value="Work">{t("dashboard.addresses.form.label_work")}</option>
                <option value="Other">{t("dashboard.addresses.form.label_other")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("dashboard.addresses.form.street")}</Label><Input value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} required className="mt-1" /></div>
            <div>
              <Label>{t("dashboard.addresses.form.house_number")} <span className="text-xs text-red-500">*</span> <span className="text-xs text-muted-foreground">{t("dashboard.addresses.form.house_number_hint")}</span></Label>
              <Input value={formData.houseNumber || ""} onChange={e => { setFormData({...formData, houseNumber: e.target.value}); setAddressError(""); }} className="mt-1" placeholder={t("dashboard.addresses.form.house_number_placeholder")} required />
              {addressError && <p className="text-red-500 text-xs mt-1.5">{addressError}</p>}
            </div>
          </div>
          <div><Label>{t("dashboard.addresses.form.landmark")}</Label><Input value={formData.landmark || ""} onChange={e => setFormData({...formData, landmark: e.target.value})} className="mt-1" placeholder={t("dashboard.addresses.form.landmark_placeholder")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("dashboard.addresses.form.city")}</Label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required className="mt-1" /></div>
            <div><Label>{t("dashboard.addresses.form.state")}</Label><Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("dashboard.addresses.form.pincode")}</Label><Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} required className="mt-1" /></div>
            <div><Label>{t("dashboard.addresses.form.country")}</Label><Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} required className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("dashboard.addresses.form.latitude")}</Label><Input value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} className="mt-1" placeholder={t("dashboard.addresses.form.latitude_placeholder")} /></div>
            <div><Label>{t("dashboard.addresses.form.longitude")}</Label><Input value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} className="mt-1" placeholder={t("dashboard.addresses.form.longitude_placeholder")} /></div>
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm">
            <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="rounded" />
            {t("dashboard.addresses.form.set_default")}
          </label>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-full">{t("dashboard.addresses.form.cancel")}</Button>
            <Button type="submit" disabled={loading} className="rounded-full">
              {loading ? t("dashboard.addresses.form.saving") : t("dashboard.addresses.form.save")}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t("dashboard.addresses.title")}</h2>
        <Button className="rounded-full gap-2" onClick={() => handleOpenForm()}><MapPin className="h-4 w-4" /> {t("dashboard.addresses.add_address")}</Button>
      </div>
      {fetching ? (
        <p className="text-muted-foreground text-sm">{t("dashboard.addresses.loading")}</p>
      ) : addresses.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("dashboard.addresses.empty")}</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.label}</span>
                  {a.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t("dashboard.addresses.default_badge")}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.firstName} {a.lastName} • {a.phone}</p>
                <p className="text-sm text-muted-foreground">{a.street}, {a.city}, {a.state} {a.pincode}</p>
                <p className="text-sm text-muted-foreground">{a.country}</p>
                {(a.lat || a.lng) && <p className="text-xs text-muted-foreground mt-1">{t("dashboard.addresses.gps", { lat: a.lat, lng: a.lng })}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenForm(a)}>{t("dashboard.addresses.edit")}</Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(a.id)}>{t("dashboard.addresses.delete")}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setFetching(true);
        const res = await authRepository.getProfile();
        if (res.success && res.data) {
          const d = res.data;
          setFormData({
            firstName: d.firstName || "",
            lastName: d.lastName || "",
            email: d.email || "",
            phone: d.phone || "",
          });
        }
      } catch (error: any) {
        toast.error(error.message || t("dashboard.profile.toast_load_failed"));
        console.error("Profile load error:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authRepository.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });
      if (res.success) {
        toast.success(t("dashboard.profile.toast_updated"));
        // Update local storage user data as well
        const cachedUser = JSON.parse(localStorage.getItem("customer_user") || "{}");
        localStorage.setItem("customer_user", JSON.stringify({ ...cachedUser, ...res.data }));
      }
    } catch (error: any) {
      toast.error(error.message || t("dashboard.profile.toast_update_failed"));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-muted-foreground text-sm">{t("dashboard.profile.loading")}</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("dashboard.profile.title")}</h2>
      <form onSubmit={handleSave} className="max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{t("dashboard.profile.first_name")}</Label><Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="mt-1" required /></div>
          <div><Label>{t("dashboard.profile.last_name")}</Label><Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="mt-1" required /></div>
        </div>
        <div><Label>{t("dashboard.profile.email")}</Label><Input value={formData.email} disabled className="mt-1 bg-muted cursor-not-allowed text-muted-foreground" title={t("dashboard.profile.email_tooltip")} /></div>
        <div><Label>{t("dashboard.profile.phone")}</Label><PhonePicker value={formData.phone} onChange={() => {}} disabled className="mt-1" /></div>
        <Button type="submit" disabled={loading} className="rounded-full">
          {loading ? t("dashboard.profile.saving") : t("dashboard.profile.save")}
        </Button>
      </form>
    </div>
  );
}

function SettingsTab() {
  const { t } = useTranslation();
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("dashboard.settings.toast_password_mismatch"));
      return;
    }
    try {
      setLoading(true);
      const res = await authRepository.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.success) {
        toast.success(t("dashboard.settings.toast_password_updated"));
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (error: any) {
      toast.error(error.message || t("dashboard.settings.toast_password_failed"));
    } finally {
      setLoading(false);
    }
  };

  const notificationItems = [
    { key: "order_updates", label: t("dashboard.settings.notif_order_updates"), defaultChecked: true },
    { key: "promotions", label: t("dashboard.settings.notif_promotions"), defaultChecked: true },
    { key: "back_in_stock", label: t("dashboard.settings.notif_back_in_stock"), defaultChecked: true },
    { key: "newsletter", label: t("dashboard.settings.notif_newsletter"), defaultChecked: false },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("dashboard.settings.title")}</h2>
      <div className="max-w-lg space-y-6">
        <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">{t("dashboard.settings.change_password")}</h3>
          <div><Label>{t("dashboard.settings.current_password")}</Label><Input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} required className="mt-1" /></div>
          <div><Label>{t("dashboard.settings.new_password")}</Label><Input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} required className="mt-1" minLength={6} /></div>
          <div><Label>{t("dashboard.settings.confirm_password")}</Label><Input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} required className="mt-1" minLength={6} /></div>
          <Button type="submit" disabled={loading} className="rounded-full">{loading ? t("dashboard.settings.updating") : t("dashboard.settings.update_password")}</Button>
        </form>
        <div className="space-y-3 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">{t("dashboard.settings.notifications")}</h3>
          <div className="space-y-2">
            {notificationItems.map((n) => (
              <label key={n.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={n.defaultChecked} className="rounded" />
                {n.label}
              </label>
            ))}
          </div>
          <Button className="rounded-full" onClick={() => toast.success(t("dashboard.settings.toast_preferences_saved"))}>{t("dashboard.settings.save_preferences")}</Button>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-destructive">{t("dashboard.settings.danger_zone")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.settings.danger_zone_desc")}</p>
          <Button variant="destructive" className="mt-3 rounded-full" onClick={() => toast.error(t("dashboard.settings.toast_delete_demo"))}>{t("dashboard.settings.delete_account")}</Button>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;