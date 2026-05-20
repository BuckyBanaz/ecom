import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPrice, useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const steps = ["Contact", "Shipping", "Payment"] as const;

const Checkout = () => {
  const { items, subtotal, clear } = useCart();
  const [step, setStep] = useState(0);
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("ideal");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const ship = shipping === "express" ? 9.95 : subtotal > 75 ? 0 : 4.95;
  const total = subtotal + ship;

  if (items.length === 0 && !done) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Button asChild className="mt-4 rounded-full"><Link to="/">Continue shopping</Link></Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-4 text-3xl font-bold">Order confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your order. A confirmation has been sent to your email.
        </p>
        <p className="mt-2 font-mono text-sm">Order #LG-{Math.floor(Math.random() * 900000 + 100000)}</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Back to home</Link></Button>
      </div>
    );
  }

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < steps.length - 1) setStep(step + 1);
    else {
      clear();
      setDone(true);
    }
  };

  return (
    <div className="container-page py-6">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <ol className="mt-4 flex items-center gap-3 text-sm">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("grid h-7 w-7 place-items-center rounded-full border text-xs font-bold",
              i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
              {i + 1}
            </span>
            <span className={cn(i === step && "font-semibold text-primary")}>{s}</span>
            {i < steps.length - 1 && <span className="mx-2 h-px w-8 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={next} className="space-y-6 rounded-xl border bg-card p-6">
          {step === 0 && (
            <>
              <h2 className="text-xl font-bold">Contact information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="email" label="Email" type="email" required />
                <Field id="phone" label="Phone" required />
                <Field id="first" label="First name" required />
                <Field id="last" label="Last name" required />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">Shipping address</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="address" label="Address" required className="sm:col-span-2" />
                <Field id="postal" label="Postal code" required />
                <Field id="city" label="City" required />
                <Field id="country" label="Country" defaultValue="Netherlands" required />
              </div>
              <div>
                <h3 className="mb-2 mt-4 font-semibold">Shipping method</h3>
                <RadioGroup value={shipping} onValueChange={setShipping} className="space-y-2">
                  <Option id="standard" value="standard" title="Standard delivery" desc="Next day before 22:00" price={subtotal > 75 ? "Free" : "€4.95"} />
                  <Option id="express" value="express" title="Express delivery" desc="Same day in selected areas" price="€9.95" />
                </RadioGroup>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold">Payment method</h2>
              <RadioGroup value={payment} onValueChange={setPayment} className="space-y-2">
                <Option id="ideal" value="ideal" title="iDEAL" desc="Pay with your bank app" />
                <Option id="card" value="card" title="Credit card" desc="Visa, Mastercard, Amex" />
                <Option id="paypal" value="paypal" title="PayPal" desc="Pay securely with PayPal" />
              </RadioGroup>
              <p className="text-xs text-muted-foreground">This is a demo — no real payment will be processed.</p>
            </>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => (step === 0 ? navigate("/cart") : setStep(step - 1))}>
              {step === 0 ? "Back to cart" : "Back"}
            </Button>
            <Button type="submit" size="lg" className="rounded-full">
              {step === steps.length - 1 ? `Place order · ${formatPrice(total)}` : "Continue"}
            </Button>
          </div>
        </form>

        <aside className="h-fit space-y-4 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-bold">Your order</h2>
          <ul className="divide-y">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 py-3">
                <img src={i.product.image} alt="" className="h-14 w-14 rounded-md object-cover" />
                <div className="flex-1 text-sm">
                  <div className="line-clamp-1 font-medium">{i.product.name}</div>
                  <div className="text-xs text-muted-foreground">Qty {i.qty}</div>
                </div>
                <span className="text-sm font-semibold">{formatPrice(i.product.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t pt-3 text-sm">
            <Row k="Subtotal" v={formatPrice(subtotal)} />
            <Row k="Shipping" v={ship === 0 ? "Free" : formatPrice(ship)} />
            <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
};

function Field({ id, label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="mt-1.5" {...rest} />
    </div>
  );
}

function Option({ id, value, title, desc, price }: { id: string; value: string; title: string; desc: string; price?: string }) {
  return (
    <Label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
      <RadioGroupItem id={id} value={value} />
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {price && <span className="text-sm font-semibold">{price}</span>}
    </Label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>;
}

export default Checkout;