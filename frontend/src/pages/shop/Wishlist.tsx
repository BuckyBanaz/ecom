import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/shop/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

const Wishlist = () => {
  const { items, loading } = useWishlist();

  if (loading) {
    return (
      <div className="container-page py-6">
        <h1 className="text-3xl font-bold">My wishlist</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <h1 className="text-3xl font-bold">My wishlist</h1>
      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border bg-muted/30 p-10 text-center">
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/">Browse products</Link></Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};
export default Wishlist;