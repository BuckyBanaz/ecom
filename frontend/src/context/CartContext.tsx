import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Product } from "@/data/products";

export type CartItem = {
  id: string;
  product: Product;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  setDrawerOpen: (b: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem("lg-cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("lg-cart", JSON.stringify(items));
  }, [items]);

  const add = (p: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) {
        return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { id: p.id, product: p, qty }];
    });
    toast.success("Added to cart", { description: p.name });
    setDrawerOpen(true);
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
  const clear = () => setItems([]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      add,
      remove,
      setQty,
      clear,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.product.price, 0),
      drawerOpen,
      setDrawerOpen,
    }),
    [items, drawerOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);