import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, useCart } from "@/context/CartContext";
import { SafeImage } from "@/components/ui/SafeImage";

const Cart = () => {
  const { items, subtotal, remove, setQty } = useCart();
  const shipping = subtotal > 75 || subtotal === 0 ? 0 : 4.95;

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse our catalog and find something you love.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Continue shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <h1 className="text-3xl font-bold">Shopping cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 p-4">
              <SafeImage src={i.product.image} alt="" className="h-24 w-24 rounded-lg object-cover" fallbackType="product" />
              <div className="flex flex-1 flex-col">
                <Link to={`/product/${i.product.slug}`} className="font-semibold hover:text-primary">{i.product.name}</Link>
                <span className="text-xs text-muted-foreground">
                  {typeof i.product.brand === "object" ? i.product.brand.name : i.product.brand} · {i.product.color}
                </span>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border">
                    <button onClick={() => setQty(i.id, i.qty - 1)} className="px-3 py-1.5">−</button>
                    <span className="w-8 text-center text-sm">{i.qty}</span>
                    <button onClick={() => setQty(i.id, i.qty + 1)} className="px-3 py-1.5">+</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{formatPrice(i.product.price * i.qty)}</span>
                    <button onClick={() => remove(i.id)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border bg-card p-6">
          <h2 className="text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{formatPrice(subtotal + shipping)}</dd></div>
          </dl>
          <div className="mt-4 flex gap-2">
            <Input placeholder="Promo code" />
            <Button variant="outline">Apply</Button>
          </div>
          <Button asChild size="lg" className="mt-4 w-full rounded-full">
            <Link to="/checkout">Continue to checkout</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
};

export default Cart;