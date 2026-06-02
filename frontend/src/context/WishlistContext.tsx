import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { wishlistRepository, productRepository } from "@/client/apiClient";

type Ctx = {
  ids: string[];
  items: any[];
  loading: boolean;
  toggle: (id: string, name?: string, product?: any) => void;
  has: (id: string) => boolean;
};

const C = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("customer_token"));

  // Monitor customer_token changes (e.g. login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("customer_token"));
    };
    window.addEventListener("storage", handleStorageChange);
    
    // Check every second to ensure token reactivity in the same window context
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem("customer_token");
      if (currentToken !== token) {
        setToken(currentToken);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [token]);

  // Sync / Fetch effect
  useEffect(() => {
    const fetchAndSync = async () => {
      setLoading(true);
      if (token) {
        try {
          // 1. Get local wishlist items to sync
          const localIds: string[] = JSON.parse(localStorage.getItem("lg-wishlist") || "[]");
          if (localIds.length > 0) {
            for (const id of localIds) {
              try {
                await wishlistRepository.add(id);
              } catch (e) {
                console.error(`Failed to sync item ${id}:`, e);
              }
            }
            // Clear local storage after syncing
            localStorage.removeItem("lg-wishlist");
          }

          // 2. Fetch from backend
          const res = await wishlistRepository.get();
          if (res.success && res.data) {
            // res.data is Wishlist[] where each entry has product
            const serverProducts = res.data.map((w: any) => w.product).filter(Boolean);
            setItems(serverProducts);
            setIds(serverProducts.map((p: any) => p.id));
          }
        } catch (error) {
          console.error("Failed to sync/fetch wishlist from backend:", error);
          // Fallback to local on error
          await loadLocalWishlist();
        } finally {
          setLoading(false);
        }
      } else {
        await loadLocalWishlist();
        setLoading(false);
      }
    };

    const loadLocalWishlist = async () => {
      try {
        const localIds: string[] = JSON.parse(localStorage.getItem("lg-wishlist") || "[]");
        setIds(localIds);
        
        // Fetch details from backend database for each local ID
        const fetchedItems = [];
        for (const id of localIds) {
          try {
            const res = await productRepository.getByIdOrSlug(id);
            if (res.success && res.product) {
              const p = res.product;
              // Format product consistent with frontend view requirements
              fetchedItems.push({
                id: p.id,
                slug: p.slug,
                name: p.name,
                brand: p.brand?.name || "Lumio",
                category: p.category?.slug || "general",
                price: p.price,
                oldPrice: p.oldPrice || undefined,
                rating: p.rating || 5,
                reviewCount: p.reviewCount || 0,
                image: p.images?.[0] || "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=800",
                images: p.images || [],
                inStock: p.inStock ?? true
              });
            }
          } catch (e) {
            console.error("Failed to fetch product details for guest wishlist ID:", id, e);
          }
        }
        setItems(fetchedItems);
      } catch (e) {
        setIds([]);
        setItems([]);
      }
    };

    fetchAndSync();
  }, [token]);

  // Toggle wishlist item
  const toggle = async (id: string, name?: string, productObj?: any) => {
    const isFav = ids.includes(id);

    // 1. Optimistic UI update
    setIds((prev) => (isFav ? prev.filter((x) => x !== id) : [...prev, id]));
    
    // Find product object to update items state
    let targetProduct = items.find((p) => p.id === id) || productObj;
    if (!targetProduct) {
      try {
        const res = await productRepository.getByIdOrSlug(id);
        if (res.success && res.product) {
          targetProduct = res.product;
        }
      } catch (e) {
        console.error("Failed to fetch target product on toggle:", e);
      }
    }
    
    // Fallback if still not found
    if (!targetProduct) {
      targetProduct = { id, name: name || "Product" };
    }

    if (isFav) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast("Removed from wishlist", { description: name });
    } else {
      setItems((prev) => [...prev, targetProduct]);
      toast.success("Added to wishlist", { description: name });
    }

    // 2. Persist
    if (token) {
      try {
        if (isFav) {
          await wishlistRepository.remove(id);
        } else {
          await wishlistRepository.add(id);
        }
      } catch (error) {
        console.error("Failed to update wishlist on backend:", error);
        toast.error("Failed to save changes to server");
        
        // Revert on failure
        setIds((prev) => (isFav ? [...prev, id] : prev.filter((x) => x !== id)));
        if (isFav) {
          setItems((prev) => [...prev, targetProduct]);
        } else {
          setItems((prev) => prev.filter((p) => p.id !== id));
        }
      }
    } else {
      // Guest local storage update
      const localIds: string[] = JSON.parse(localStorage.getItem("lg-wishlist") || "[]");
      let updatedLocalIds: string[];
      if (isFav) {
        updatedLocalIds = localIds.filter((x) => x !== id);
      } else {
        updatedLocalIds = [...localIds, id];
      }
      localStorage.setItem("lg-wishlist", JSON.stringify(updatedLocalIds));
    }
  };

  return (
    <C.Provider value={{ ids, items, loading, toggle, has: (id) => ids.includes(id) }}>
      {children}
    </C.Provider>
  );
}

export function useWishlist() {
  const c = useContext(C);
  if (!c) throw new Error("useWishlist must be inside provider");
  return c;
}