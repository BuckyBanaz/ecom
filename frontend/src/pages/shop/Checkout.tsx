import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { addressRepository } from "@/client/apiClient";
import { toast } from "sonner";
import { MapSelector } from "@/components/shop/MapSelector";

const steps = ["Contact", "Shipping", "Payment"] as const;

interface Address {
  id: string | number;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

const emptyAddressForm = {
  label: "Home",
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  country: "Netherlands",
};

const Checkout = () => {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

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

  // Add Address Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addrForm, setAddrForm] = useState(emptyAddressForm);
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
      toast.error("Could not load addresses");
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
    try {
      setAddingAddress(true);
      const res = await addressRepository.create({ ...addrForm, isDefault: addresses.length === 0 });
      if (res.success || res.data) {
        toast.success("Address added!");
        setShowAddDialog(false);
        setAddrForm(emptyAddressForm);
        await fetchAddresses();
        if (res.data?.id) setSelectedAddressId(res.data.id);
      } else {
        toast.error(res.message || "Failed to add address");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add address");
    } finally {
      setAddingAddress(false);
    }
  };

  const ship = shipping === "express" ? 9.95 : subtotal > 75 ? 0 : 4.95;
  const total = subtotal + ship;

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && !selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
    else { clear(); setDone(true); }
  };

  if (items.length === 0 && !done) {
    return (
      <div className="container-page py-20 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
          <Truck className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground mt-1">Add some products before checking out.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Continue shopping</Link></Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold">Order confirmed!</h1>
        <p className="mt-2 text-muted-foreground">Thank you for your order. A confirmation has been sent to your email.</p>
        <p className="mt-2 font-mono text-sm text-muted-foreground">Order #LG-{Math.floor(Math.random() * 900000 + 100000)}</p>
        <div className="flex justify-center gap-3 mt-6">
          <Button asChild variant="outline" className="rounded-full"><Link to="/dashboard">My Orders</Link></Button>
          <Button asChild className="rounded-full"><Link to="/">Continue shopping</Link></Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container-page py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Checkout</h1>

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
                {i < step ? "✓" : i + 1}
              </span>
              <span className={cn("text-sm font-medium hidden sm:block",
                i === step ? "text-primary font-semibold" : i < step ? "text-foreground" : "text-muted-foreground"
              )}>{s}</span>
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
                <h2 className="text-xl font-bold">Contact information</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Pre-filled from your account</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={contact.firstName} onChange={v => setContact({ ...contact, firstName: v })} required />
                <Field label="Last name" value={contact.lastName} onChange={v => setContact({ ...contact, lastName: v })} required />
                <Field label="Email" type="email" value={contact.email} onChange={v => setContact({ ...contact, email: v })} required />
                <Field label="Phone" type="tel" value={contact.phone} onChange={v => setContact({ ...contact, phone: v })} required />
              </div>
            </div>
          )}

          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Shipping address</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Select or add a delivery address</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5 shrink-0"
                    onClick={() => { setAddrForm(emptyAddressForm); setShowAddDialog(true); }}>
                    <Plus className="h-4 w-4" /> Add new
                  </Button>
                </div>

                {loadingAddresses ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground h-6 w-6" /></div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p>No saved addresses yet</p>
                    <Button type="button" className="mt-3 rounded-full" size="sm" onClick={() => setShowAddDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add address
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
                            {addr.isDefault && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">Default</span>}
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
                <h3 className="font-bold text-lg">Shipping method</h3>
                <RadioGroup value={shipping} onValueChange={setShipping} className="space-y-2">
                  <ShippingOption id="standard" value="standard" icon={<Truck className="h-5 w-5" />}
                    title="Standard delivery" desc="Next day before 22:00"
                    price={subtotal > 75 ? "Free" : "€4.95"} selected={shipping === "standard"} />
                  <ShippingOption id="express" value="express" icon={<Zap className="h-5 w-5" />}
                    title="Express delivery" desc="Same day in selected areas"
                    price="€9.95" selected={shipping === "express"} />
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-bold">Payment method</h2>
                <p className="text-sm text-muted-foreground mt-0.5">This is a demo — no real payment processed.</p>
              </div>
              <RadioGroup value={payment} onValueChange={setPayment} className="space-y-2">
                <PaymentOption id="ideal" value="ideal" title="iDEAL" desc="Pay with your bank app" selected={payment === "ideal"} />
                <PaymentOption id="card" value="card" title="Credit / Debit Card" desc="Visa, Mastercard, Amex" selected={payment === "card"} />
                <PaymentOption id="paypal" value="paypal" title="PayPal" desc="Pay securely with PayPal" selected={payment === "paypal"} />
              </RadioGroup>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" className="rounded-full"
              onClick={() => step === 0 ? navigate("/cart") : setStep(step - 1)}>
              {step === 0 ? "Back to cart" : "← Back"}
            </Button>
            <Button type="submit" size="lg" className="rounded-full">
              {step === steps.length - 1 ? `Place order · ${formatPrice(total)}` : "Continue →"}
            </Button>
          </div>
        </form>

        {/* Order summary sidebar */}
        <aside className="h-fit rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-lg font-bold">Order summary</h2>
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
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span><span>{ship === 0 ? "Free" : formatPrice(ship)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Add Address Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-bold">Add new address</h2>
              <button onClick={() => setShowAddDialog(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAddress} className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Label quick pick */}
              <div>
                <Label className="mb-2 block">Label</Label>
                <div className="flex gap-2">
                  {["Home", "Office", "Other"].map((l) => (
                    <button key={l} type="button"
                      onClick={() => setAddrForm({ ...addrForm, label: l })}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                        addrForm.label === l ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                      )}>
                      {l === "Home" ? <Home className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" value={addrForm.firstName} onChange={v => setAddrForm({ ...addrForm, firstName: v })} required />
                <Field label="Last name" value={addrForm.lastName} onChange={v => setAddrForm({ ...addrForm, lastName: v })} required />
              </div>
              <Field label="Phone" type="tel" value={addrForm.phone} onChange={v => setAddrForm({ ...addrForm, phone: v })} required />

              {/* Map picker */}
              <div>
                <Label className="mb-1.5 block text-sm">Location <span className="text-muted-foreground font-normal">(optional — auto-fills address fields)</span></Label>
                <button type="button" onClick={() => setShowMap(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all py-3 text-sm text-muted-foreground hover:text-primary">
                  <Map className="h-4 w-4" />
                  {addrForm.lat ? `📍 ${parseFloat(addrForm.lat).toFixed(4)}, ${parseFloat(addrForm.lng).toFixed(4)} — change` : "Pick location on map"}
                </button>
              </div>
              <Field label="Street address" value={addrForm.street} onChange={v => setAddrForm({ ...addrForm, street: v })} required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={addrForm.city} onChange={v => setAddrForm({ ...addrForm, city: v })} required />
                <Field label="State / Province" value={addrForm.state} onChange={v => setAddrForm({ ...addrForm, state: v })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Postal code" value={addrForm.pincode} onChange={v => setAddrForm({ ...addrForm, pincode: v })} required />
                <Field label="Country" value={addrForm.country} onChange={v => setAddrForm({ ...addrForm, country: v })} required />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-full" disabled={addingAddress}>
                  {addingAddress ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save address"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Selector Modal */}
      {showMap && (
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
      )}
    </div>
  );
};

// Field component
function Field({
  label, value, onChange, type = "text", required = false
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)}
        required={required} className="h-10" />
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
function PaymentOption({ id, value, title, desc, selected }: {
  id: string; value: string; title: string; desc: string; selected: boolean;
}) {
  return (
    <Label htmlFor={id} className={cn(
      "flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all",
      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
    )}>
      <RadioGroupItem id={id} value={value} />
      <div className={cn("p-1.5 rounded-lg", selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
        <CreditCard className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Label>
  );
}

export default Checkout;