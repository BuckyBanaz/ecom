import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2, MapPin, Plus, ChevronRight, Loader2, X,
  Home, Building2, CreditCard, Truck, Zap, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPrice, useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { addressRepository, shippingRepository, couponRepository, chargeRepository, ordersRepository, paymentRepository } from "@/client/apiClient";
import { toast } from "sonner";
import { MapSelector } from "@/components/shop/MapSelector";
import { PhonePicker } from "@/components/ui/PhonePicker";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const steps = ["Contact", "Shipping", "Payment"] as const;

interface Address {
  id: string | number;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  houseNumber?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
  lat?: string;
  lng?: string;
}

const emptyAddressForm = {
  label: "Home",
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  houseNumber: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  country: "Netherlands",
  lat: "",
  lng: "",
};

const Checkout = () => {
  const { t } = useTranslation();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle Stripe Success/Cancel redirects
  const [verifyingSession, setVerifyingSession] = useState(false);

  useEffect(() => {
    const handleStripeRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const sessionId = searchParams.get("session_id");

      if (location.pathname === "/checkout/cancel") {
        toast.error(t("checkout.toast_payment_cancelled"));
        navigate("/checkout", { replace: true });
      } else if (location.pathname === "/checkout/success" && sessionId) {
        setVerifyingSession(true);
        try {
          const res = await ordersRepository.verifySession(sessionId);
          if (res.success) {
            clear();
            setDone(true);
            setConfirmedOrderNum(res.order?.orderNumber || `LG-${Math.floor(Math.random() * 900000 + 100000)}`);
            toast.success(t("checkout.toast_order_success"));
            // Stay on page — done screen will render
          } else {
            toast.error(t("checkout.toast_verify_failed"));
            navigate("/dashboard?tab=orders", { replace: true });
          }
        } catch (err: any) {
          toast.error(err.message || t("checkout.toast_verify_error"));
          navigate("/checkout", { replace: true });
        } finally {
          setVerifyingSession(false);
        }
      }
    };
    handleStripeRedirect();
  }, [location.pathname, location.search]);

  // Auth check
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const token = localStorage.getItem("customer_token");
    const stored = localStorage.getItem("customer_user");
    if (!token || !stored) {
      navigate("/account?redirect=/checkout", { replace: true });
    } else {
      try { setUser(JSON.parse(stored)); } catch { navigate("/account?redirect=/checkout"); }
    }
  }, [navigate]);

  const [step, setStep] = useState(0);
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("ideal");
  const [done, setDone] = useState(false);
  const [confirmedOrderNum, setConfirmedOrderNum] = useState("");
  const [shipConfig, setShipConfig] = useState({
    freeShippingThreshold: 75,
    standardShippingFee: 5.95,
    expressShippingFee: 9.95,
    sameDayDelivery: true,
    deliveryCutoffTime: "22:00",
  });
  const [loadingShipConfig, setLoadingShipConfig] = useState(true);

  const [paymentConfig, setPaymentConfig] = useState({
    ideal: true,
    card: true,
    paypal: false,
    klarna: false,
    bancontact: false,
  });

  // Coupons and Charges
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  const [charges, setCharges] = useState<any[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    shippingRepository.getConfig().then(res => {
      if (res.success && res.data) setShipConfig(res.data);
      setLoadingShipConfig(false);
    }).catch(() => setLoadingShipConfig(false));

    paymentRepository.getConfig().then(res => {
      if (res.success && res.enabledMethods) setPaymentConfig(res.enabledMethods);
    }).catch(err => console.error("Payment config error:", err));

    chargeRepository.getAll().then(res => {
      if (res.success && res.data) {
        // Filter only active charges
        setCharges(res.data.filter((c: any) => c.isActive));
      }
      setLoadingCharges(false);
    }).catch(err => {
      console.error(err);
      setLoadingCharges(false);
    });
  }, []);

  const isLoadingSummary = loadingShipConfig || loadingCharges;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setValidatingCoupon(true);
    try {
      const res = await couponRepository.validate(couponCode, subtotal);
      if (res.success && res.data) {
        const coupon = res.data;
        setAppliedCoupon(coupon);
        const discount = coupon.discountType === "percentage"
          ? (subtotal * coupon.value) / 100
          : coupon.value;
        setDiscountAmount(discount);
        toast.success(t("checkout.toast_coupon_applied"));
      } else {
        toast.error(res.message || t("checkout.toast_coupon_invalid"));
        setAppliedCoupon(null);
        setDiscountAmount(0);
      }
    } catch (err: any) {
      toast.error(err.message || t("checkout.toast_coupon_failed"));
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscountAmount(0);
    toast.success(t("checkout.toast_coupon_removed"));
  };

  // Contact form (pre-filled from user)
  const [contact, setContact] = useState({ email: "", phone: "", firstName: "", lastName: "" });
  useEffect(() => {
    if (user) {
      setContact({
        email: user.email || "",
        phone: user.phone || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    }
  }, [user]);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | number | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addrForm, setAddrForm] = useState(emptyAddressForm);
  const [addressError, setAddressError] = useState("");
  const [showMap, setShowMap] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await addressRepository.getAll();
      const list: Address[] = res.data || [];
      setAddresses(list);
      if (list.length === 0) {
        setShowAddDialog(true);
      } else {
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(def.id);
      }
    } catch {
      toast.error(t("checkout.toast_load_addresses_error"));
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Fetch addresses when entering step 1
  useEffect(() => {
    if (step === 1) fetchAddresses();
  }, [step]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addrForm.houseNumber && !/^[0-9]+[a-zA-Z0-9\s-]*$/.test(addrForm.houseNumber)) {
      setAddressError(t("checkout.address_error_house_number"));
      return;
    }
    setAddressError("");

    try {
      setAddingAddress(true);
      const res = await addressRepository.create({ ...addrForm, isDefault: addresses.length === 0 });
      if (res.success || res.data) {
        toast.success(t("checkout.toast_address_added"));
        setShowAddDialog(false);
        setAddrForm(emptyAddressForm);
        await fetchAddresses();
        if (res.data?.id) setSelectedAddressId(res.data.id);
      } else {
        toast.error(res.message || t("checkout.toast_add_address_failed"));
      }
    } catch (err: any) {
      toast.error(err.message || t("checkout.toast_add_address_failed"));
    } finally {
      setAddingAddress(false);
    }
  };

  const ship = shipping === "express" ? Number(shipConfig.expressShippingFee || 0) : subtotal > Number(shipConfig.freeShippingThreshold || 0) ? 0 : Number(shipConfig.standardShippingFee || 0);

  // Calculate total charges
  const totalCharges = charges.reduce((acc, charge) => {
    const val = Number(charge.value || 0);
    if (charge.type === "percentage") {
      return acc + (subtotal * val) / 100;
    }
    return acc + val;
  }, 0);

  const totalWithoutDiscount = Number(subtotal) + Number(ship) + Number(totalCharges);
  const total = totalWithoutDiscount - Number(discountAmount);

  const next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && !selectedAddressId) {
      toast.error(t("checkout.toast_select_address"));
      return;
    }
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      if (isSubmitting) return;
      setIsSubmitting(true);
      // Final step: Place Order via Stripe
      try {
        const selectedAddr = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddr) {
          toast.error(t("checkout.toast_invalid_address"));
          setIsSubmitting(false);
          return;
        }

        const res = await ordersRepository.initiateCheckout({
          items,
          customer: {
            ...user,
            address: selectedAddr,
          },
          shippingConfig: shipConfig,
          charges,
          appliedCoupon,
          calculatedTotals: { subtotal, shipFee: ship, discountAmount, totalCharges, finalTotal: total }
        });

        if (res.success && res.url) {
          // Redirect to Stripe Checkout page
          window.location.href = res.url;
        } else {
          toast.error(res.message || t("checkout.toast_init_failed"));
          setIsSubmitting(false);
        }
      } catch (err: any) {
        toast.error(err.message || t("checkout.toast_place_order_error"));
        setIsSubmitting(false);
      }
    }
  };

  if (items.length === 0 && !done) {
    return (
      <div className="container-page py-20 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
          <Truck className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{t("checkout.empty_cart_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("checkout.empty_cart_desc")}</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">{t("checkout.button_continue_shopping")}</Link></Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold">{t("checkout.order_confirmed_title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("checkout.order_confirmed_desc")}</p>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{t("checkout.order_number_prefix")}{confirmedOrderNum}</p>
        <div className="flex justify-center gap-3 mt-6">
          <Button asChild variant="outline" className="rounded-full"><Link to="/dashboard">{t("checkout.button_my_orders")}</Link></Button>
          <Button asChild className="rounded-full"><Link to="/">{t("checkout.button_continue_shopping")}</Link></Button>
        </div>
      </div>
    );
  }

  if (verifyingSession) {
    return (
      <div className="container-page py-32 text-center flex flex-col items-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h1 className="text-2xl font-bold">{t("checkout.verifying_title")}</h1>
        <p className="text-muted-foreground mt-2">{t("checkout.verifying_desc")}</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container-page py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">{t("checkout.page_title")}</h1>

      {/* Step indicator */}
      <ol className="flex items-center mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-xs font-bold border-2 transition-all",
                i < step ? "border-primary bg-primary text-primary-foreground" :
                  i === step ? "border-primary text-primary" :
                    "border-border text-muted-foreground"
              )}>
                {i < step ? "\u2713" : i + 1}
              </span>
              <span className={cn("text-sm font-medium hidden sm:block",
                i === step ? "text-primary font-semibold" : i < step ? "text-foreground" : "text-muted-foreground"
              )}>{t(`checkout.step_${s.toLowerCase()}`)}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main form */}
        <form onSubmit={next} className="space-y-6">
          {/* Step 0: Contact */}
          {step === 0 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-xl font-bold">{t("checkout.contact_info_heading")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("checkout.contact_info_desc")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("checkout.field_first_name")} value={contact.firstName} onChange={v => setContact({ ...contact, firstName: v })} required />
                <Field label={t("checkout.field_last_name")} value={contact.lastName} onChange={v => setContact({ ...contact, lastName: v })} required />
                <Field label={t("checkout.field_email")} type="email" value={contact.email} onChange={v => setContact({ ...contact, email: v })} required />
                <Field label={t("checkout.field_phone")} type="tel" value={contact.phone} onChange={v => setContact({ ...contact, phone: v })} required />
              </div>
            </div>
          )}

          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{t("checkout.shipping_address_heading")}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{t("checkout.shipping_address_desc")}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5 shrink-0"
                    onClick={() => { setAddrForm(emptyAddressForm); setShowAddDialog(true); }}>
                    <Plus className="h-4 w-4" /> {t("checkout.button_add_address")}
                  </Button>
                </div>

                {loadingAddresses ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground h-6 w-6" /></div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p>{t("checkout.no_addresses")}</p>
                    <Button type="button" className="mt-3 rounded-full" size="sm" onClick={() => setShowAddDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" /> {t("checkout.button_add_address_empty")}
                    </Button>
                  </div>
                ) : (
                  <RadioGroup value={String(selectedAddressId)} onValueChange={v => setSelectedAddressId(v)}
                    className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((addr) => (
                      <Label key={addr.id} htmlFor={`addr-${addr.id}`}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all",
                          String(selectedAddressId) === String(addr.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        )}>
                        <RadioGroupItem id={`addr-${addr.id}`} value={String(addr.id)} className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0 text-sm">
                          <div className="flex items-center gap-1.5 mb-1">
                            {addr.label?.toLowerCase() === "home" ? <Home className="h-3.5 w-3.5 text-muted-foreground" /> : <Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="font-semibold">{addr.label}</span>
                            {addr.isDefault && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">{t("checkout.label_default")}</span>}
                          </div>
                          <p className="text-muted-foreground leading-snug line-clamp-3">
                            {addr.firstName} {addr.lastName}<br />
                            {addr.street}, {addr.city}, {addr.state} {addr.pincode}<br />
                            {addr.country}
                          </p>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              </div>

              {/* Shipping method */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-lg">{t("checkout.shipping_method_heading")}</h3>
                <RadioGroup value={shipping} onValueChange={setShipping} className="space-y-2">
                  <ShippingOption id="standard" value="standard" icon={<Truck className="h-5 w-5" />}
                    title={t("checkout.shipping_standard_title")} desc={`${t("checkout.shipping_standard_desc_prefix")} ${shipConfig.deliveryCutoffTime}`}
                    price={subtotal > Number(shipConfig.freeShippingThreshold || 0) ? t("checkout.shipping_free") : `\u20ac${Number(shipConfig.standardShippingFee || 0).toFixed(2)}`} selected={shipping === "standard"} />
                  {shipConfig.sameDayDelivery && (
                    <ShippingOption id="express" value="express" icon={<Zap className="h-5 w-5" />}
                      title={t("checkout.shipping_express_title")} desc={t("checkout.shipping_express_desc")}
                      price={`\u20ac${Number(shipConfig.expressShippingFee || 0).toFixed(2)}`} selected={shipping === "express"} />
                  )}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-bold">{t("checkout.payment_method_heading")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("checkout.payment_desc")}</p>
              </div>
              <RadioGroup value={payment} onValueChange={setPayment} className="grid grid-cols-1 gap-3">
                {paymentConfig.ideal && (
                  <PaymentOption id="ideal" value="ideal" title={t("checkout.payment_ideal_title")} desc={t("checkout.payment_ideal_desc")} selected={payment === "ideal"} imgSrc="https://www.iconpacks.net/icons/free-icons-6/free-ideal-logo-icon-19535.png" />
                )}
                {paymentConfig.card && (
                  <PaymentOption id="card" value="card" title={t("checkout.payment_card_title")} desc={t("checkout.payment_card_desc")} selected={payment === "card"} />
                )}
                {paymentConfig.paypal && (
                  <PaymentOption id="paypal" value="paypal" title={t("checkout.payment_paypal_title")} desc={t("checkout.payment_paypal_desc")} selected={payment === "paypal"} imgSrc="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" />
                )}
                {paymentConfig.klarna && (
                  <PaymentOption id="klarna" value="klarna" title={t("checkout.payment_klarna_title")} desc={t("checkout.payment_klarna_desc")} selected={payment === "klarna"} imgSrc="https://cdn-icons-png.flaticon.com/128/39/39073.png" />
                )}
                {paymentConfig.bancontact && (
                  <PaymentOption id="bancontact" value="bancontact" title={t("checkout.payment_bancontact_title")} desc={t("checkout.payment_bancontact_desc")} selected={payment === "bancontact"} imgSrc="https://www.bancontact.com/img/bancontact-logo.png" />
                )}
              </RadioGroup>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" className="rounded-full"
              onClick={() => step === 0 ? navigate("/cart") : setStep(step - 1)}
              disabled={isSubmitting}>
              {step === 0 ? t("checkout.button_back_to_cart") : t("checkout.button_back")}
            </Button>
            <Button type="submit" size="lg" className="rounded-full" disabled={isSubmitting}>
              {step === steps.length - 1 ? (
                isSubmitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("checkout.button_processing")}</span>
                ) : `${t("checkout.button_place_order")} \u00b7 ${formatPrice(total)}`
              ) : t("checkout.button_continue")}
            </Button>
          </div>
        </form>

        {/* Order summary sidebar */}
        <aside className="h-fit rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-lg font-bold">{t("checkout.order_summary")}</h2>
          </div>
          <ul className="divide-y px-5">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 py-3">
                <div className="relative shrink-0">
                  <SafeImage src={i.product.image} alt="" className="h-16 w-16 rounded-xl object-cover border" fallbackType="product" />
                  <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{i.qty}</span>
                </div>
                <div className="flex-1 min-w-0 text-sm py-1">
                  <div className="line-clamp-2 font-medium leading-snug">{i.product.name}</div>
                </div>
                <span className="text-sm font-semibold shrink-0 pt-1">{formatPrice(i.product.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="p-5 border-t space-y-2 text-sm">
            {isLoadingSummary ? (
              <div className="space-y-3 animate-pulse">
                <div className="flex justify-between items-center"><div className="h-4 bg-muted rounded w-16"></div><div className="h-4 bg-muted rounded w-12"></div></div>
                <div className="flex justify-between items-center"><div className="h-4 bg-muted rounded w-20"></div><div className="h-4 bg-muted rounded w-10"></div></div>
                <div className="flex justify-between items-center"><div className="h-4 bg-muted rounded w-12"></div><div className="h-4 bg-muted rounded w-10"></div></div>
                <div className="flex justify-between items-center pt-2 border-t mt-2"><div className="h-5 bg-muted rounded w-12"></div><div className="h-5 bg-muted rounded w-16"></div></div>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("checkout.summary_subtotal")}</span><span>{formatPrice(subtotal)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <div className="flex items-center gap-1">
                      <span>{t("checkout.summary_discount")} ({appliedCoupon.code})</span>
                      <button type="button" onClick={removeCoupon} className="text-muted-foreground hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>{t("checkout.summary_shipping")}</span><span>{ship === 0 ? t("checkout.shipping_free") : formatPrice(ship)}</span>
                </div>

                {charges.map((charge) => {
                  const val = Number(charge.value || 0);
                  const chargeValue = charge.type === "percentage" ? (subtotal * val) / 100 : val;
                  return (
                    <div key={charge.id} className="flex justify-between text-[12px] text-muted-foreground">
                      <span>{charge.name}</span>
                      <span>{formatPrice(chargeValue)}</span>
                    </div>
                  );
                })}

                <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
                  <span>{t("checkout.summary_total")}</span>
                  <div className="flex items-center gap-2">
                    {appliedCoupon && (
                      <span className="text-muted-foreground line-through text-sm font-medium">
                        {formatPrice(totalWithoutDiscount)}
                      </span>
                    )}
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Coupon Input Area */}
          <div className="p-5 border-t bg-muted/5">
            {!showCouponInput && !appliedCoupon ? (
              <button
                type="button"
                onClick={() => setShowCouponInput(true)}
                className="text-primary font-medium text-sm hover:underline"
              >
                {t("checkout.coupon_prompt")}
              </button>
            ) : !appliedCoupon ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowCouponInput(false)}
                  className="text-primary font-medium text-sm hover:underline"
                >
                  {t("checkout.coupon_prompt")}
                </button>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("checkout.coupon_placeholder")}
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    className="h-10 bg-background text-sm rounded-lg border-primary/20 focus-visible:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 text-primary border-primary/20 hover:bg-primary/5 rounded-lg font-medium"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode || validatingCoupon}
                  >
                    {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : t("checkout.coupon_apply")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-green-50/50 border border-green-200 p-2.5">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{appliedCoupon.code}</span> {t("checkout.coupon_applied_text")}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Add Address Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-bold">{t("checkout.dialog_add_address")}</h2>
              <button onClick={() => setShowAddDialog(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAddress} className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Label quick pick */}
              <div>
                <Label className="mb-2 block">{t("checkout.label_address_label")}</Label>
                <div className="flex gap-2">
                  {[
                    { value: "Home", labelKey: "checkout.label_home" },
                    { value: "Office", labelKey: "checkout.label_office" },
                    { value: "Other", labelKey: "checkout.label_other" },
                  ].map((l) => (
                    <button key={l.value} type="button"
                      onClick={() => setAddrForm({ ...addrForm, label: l.value })}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                        addrForm.label === l.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                      )}>
                      {l.value === "Home" ? <Home className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                      {t(l.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("checkout.field_first_name")} value={addrForm.firstName} onChange={v => setAddrForm({ ...addrForm, firstName: v })} required />
                <Field label={t("checkout.field_last_name")} value={addrForm.lastName} onChange={v => setAddrForm({ ...addrForm, lastName: v })} required />
              </div>
              <Field label={t("checkout.field_phone")} type="tel" value={addrForm.phone} onChange={v => setAddrForm({ ...addrForm, phone: v })} required />

              {/* Map picker */}
              <div>
                <Label className="mb-1.5 block text-sm">{t("checkout.label_location")} <span className="text-muted-foreground font-normal">{t("checkout.label_location_help")}</span></Label>
                <button type="button" onClick={() => setShowMap(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all py-3 text-sm text-muted-foreground hover:text-primary">
                  <Map className="h-4 w-4" />
                  {addrForm.lat ? `\ud83d\udccd ${parseFloat(addrForm.lat).toFixed(4)}, ${parseFloat(addrForm.lng).toFixed(4)} \u2014 ${t("checkout.button_change_location")}` : t("checkout.button_pick_location")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("checkout.field_street")} value={addrForm.street} onChange={v => setAddrForm({ ...addrForm, street: v })} required />
                <Field
                  label={t("checkout.field_house_number")}
                  value={addrForm.houseNumber || ""}
                  onChange={v => { setAddrForm({ ...addrForm, houseNumber: v }); setAddressError(""); }}
                  required
                  error={addressError}
                />
              </div>
              <Field label={t("checkout.field_landmark")} value={addrForm.landmark || ""} onChange={v => setAddrForm({ ...addrForm, landmark: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("checkout.field_city")} value={addrForm.city} onChange={v => setAddrForm({ ...addrForm, city: v })} required />
                <Field label={t("checkout.field_state")} value={addrForm.state} onChange={v => setAddrForm({ ...addrForm, state: v })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("checkout.field_postal_code")} value={addrForm.pincode} onChange={v => setAddrForm({ ...addrForm, pincode: v })} required />
                <Field label={t("checkout.field_country")} value={addrForm.country} onChange={v => setAddrForm({ ...addrForm, country: v })} required />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setShowAddDialog(false)}>
                  {t("checkout.button_cancel")}
                </Button>
                <Button type="submit" className="flex-1 rounded-full" disabled={addingAddress}>
                  {addingAddress ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("checkout.button_saving")}</> : t("checkout.button_save_address")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Selector Modal */}
      {showMap && (
        <ErrorBoundary fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-white p-4 rounded">Map failed to load. Please refresh.</div></div>}>
          <MapSelector
            onSelect={(loc) => {
              setAddrForm(prev => ({
                ...prev,
                lat: loc.lat,
                lng: loc.lng,
                street: loc.street || prev.street,
                city: loc.city || prev.city,
                state: loc.state || prev.state,
                pincode: loc.pincode || prev.pincode,
                country: loc.country || prev.country,
              }));
              setShowMap(false);
            }}
            onCancel={() => setShowMap(false)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

// Field component
function Field({
  label, value, onChange, type = "text", required = false, pattern, title, error
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; pattern?: string; title?: string; error?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {type === "tel" ? (
        <PhonePicker value={value} onChange={onChange} required={required} className={error ? "border-red-500" : ""} />
      ) : (
        <Input type={type} value={value} onChange={e => onChange(e.target.value)}
          required={required} pattern={pattern} title={title} className={cn("h-10", error ? "border-red-500" : "")} />
      )}
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

// Shipping option
function ShippingOption({ id, value, icon, title, desc, price, selected }: {
  id: string; value: string; icon: React.ReactNode; title: string; desc: string; price: string; selected: boolean;
}) {
  return (
    <Label htmlFor={id} className={cn(
      "flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all",
      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
    )}>
      <RadioGroupItem id={id} value={value} />
      <div className={cn("p-1.5 rounded-lg", selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <span className="font-bold text-sm">{price}</span>
    </Label>
  );
}

// Payment option
function PaymentOption({ id, value, title, desc, selected, imgSrc }: {
  id: string; value: string; title: string; desc: string; selected: boolean; imgSrc?: string;
}) {
  return (
    <Label htmlFor={id} className={cn(
      "flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all",
      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
    )}>
      <RadioGroupItem id={id} value={value} />
      <div className={cn("rounded-md w-[48px] h-[32px] flex items-center justify-center shrink-0 border bg-white", selected ? "border-primary/50" : "border-border")}>
        {imgSrc ? (
          <img src={imgSrc} alt={title} className="max-w-[36px] max-h-[20px] object-contain" />
        ) : (
          <CreditCard className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
        )}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Label>
  );
}

export default Checkout;