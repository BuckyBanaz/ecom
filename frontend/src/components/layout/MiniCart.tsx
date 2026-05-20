import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatPrice, useCart } from "@/context/CartContext";
import { Trash2 } from "lucide-react";

export function MiniCart() {
  const { drawerOpen, setDrawerOpen, items, subtotal, remove, setQty } = useCart();

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Your cart ({items.length})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center p-8 text-center text-muted-foreground">
              Your cart is empty.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3 p-4">
                  <img src={i.product.image} alt="" className="h-20 w-20 rounded-md object-cover" />
                  <div className="flex flex-1 flex-col">
                    <Link
                      to={`/product/${i.product.slug}`}
                      onClick={() => setDrawerOpen(false)}
                      className="line-clamp-2 text-sm font-medium hover:text-primary"
                    >
                      {i.product.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{i.product.brand}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border">
                        <button onClick={() => setQty(i.id, i.qty - 1)} className="px-2 py-1 text-sm" aria-label="Decrease">−</button>
                        <span className="w-7 text-center text-sm">{i.qty}</span>
                        <button onClick={() => setQty(i.id, i.qty + 1)} className="px-2 py-1 text-sm" aria-label="Increase">+</button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatPrice(i.product.price * i.qty)}</span>
                        <button onClick={() => remove(i.id)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t p-4">
            <div className="mb-3 flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" onClick={() => setDrawerOpen(false)}>
                <Link to="/cart">View cart</Link>
              </Button>
              <Button asChild onClick={() => setDrawerOpen(false)}>
                <Link to="/checkout">Checkout</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}