import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

type Ctx = {
  ids: string[];
  toggle: (id: string, name?: string) => void;
  has: (id: string) => boolean;
};

const C = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lg-wishlist") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("lg-wishlist", JSON.stringify(ids));
  }, [ids]);

  const toggle = (id: string, name?: string) => {
    setIds((prev) => {
      if (prev.includes(id)) {
        toast("Removed from wishlist", { description: name });
        return prev.filter((x) => x !== id);
      }
      toast.success("Added to wishlist", { description: name });
      return [...prev, id];
    });
  };

  return <C.Provider value={{ ids, toggle, has: (id) => ids.includes(id) }}>{children}</C.Provider>;
}

export function useWishlist() {
  const c = useContext(C);
  if (!c) throw new Error("useWishlist must be inside provider");
  return c;
}