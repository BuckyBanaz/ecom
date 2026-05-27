import { useState } from "react";
import { Link } from "react-router-dom";
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

const statusColors: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  pending: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

const UserDashboard = () => {
  const [tab, setTab] = useState("orders");
  const { ids: wishlistIds } = useWishlist();
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));
  // Demo: show orders for user-0
  const userOrders = orders.filter((o) => o.userId === "user-0");

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-bold text-lg">S</div>
              <div>
                <p className="font-semibold">Sophie V.</p>
                <p className="text-xs text-muted-foreground">sophie@example.com</p>
              </div>
            </div>
            <nav className="space-y-1">
              {[
                { icon: Package, label: "My Orders", value: "orders" },
                { icon: Heart, label: "Wishlist", value: "wishlist" },
                { icon: MapPin, label: "Addresses", value: "addresses" },
                { icon: User, label: "Profile", value: "profile" },
                { icon: Settings, label: "Settings", value: "settings" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setTab(item.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    tab === item.value ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
            <Button variant="ghost" className="mt-4 w-full justify-start gap-2 text-destructive">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {tab === "orders" && <OrdersTab orders={userOrders} />}
          {tab === "wishlist" && <WishlistTab products={wishlistProducts} />}
          {tab === "addresses" && <AddressesTab />}
          {tab === "profile" && <ProfileTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};

function OrdersTab({ orders }: { orders: Order[] }) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (selectedOrder) {
    return (
      <div>
        <button onClick={() => setSelectedOrder(null)} className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline">
          ← Back to orders
        </button>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{selectedOrder.orderNumber}</h2>
              <p className="text-sm text-muted-foreground">Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[selectedOrder.status]}`}>{selectedOrder.status}</span>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              {["Ordered", "Processing", "Shipped", "Delivered"].map((s) => <span key={s}>{s}</span>)}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{
                width: selectedOrder.status === "delivered" ? "100%" :
                       selectedOrder.status === "shipped" ? "75%" :
                       selectedOrder.status === "processing" ? "50%" :
                       selectedOrder.status === "cancelled" ? "0%" : "25%"
              }} />
            </div>
          </div>

          {/* Items */}
          <h3 className="font-semibold mb-3">Items</h3>
          <div className="space-y-3">
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 rounded-lg border p-3">
                <SafeImage src={item.productImage} alt={item.productName} className="h-16 w-16 rounded-lg object-cover" fallbackType="product" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity} {item.variant && `· ${item.variant}`}</p>
                </div>
                <span className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>€{selectedOrder.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{selectedOrder.shipping === 0 ? "Free" : `€${selectedOrder.shipping.toFixed(2)}`}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>€{selectedOrder.total.toFixed(2)}</span></div>
          </div>

          {/* Details */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold mb-1">Shipping Address</p>
              <p className="text-muted-foreground">{selectedOrder.shippingAddress}</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold mb-1">Payment Method</p>
              <p className="text-muted-foreground">{selectedOrder.paymentMethod}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Orders</h2>
      {orders.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 font-semibold">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start shopping to see your orders here</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/">Browse Products</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <button key={o.id} onClick={() => setSelectedOrder(o)} className="w-full flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:bg-muted/30 transition text-left">
              <SafeImage src={o.items[0].productImage} alt="" className="h-14 w-14 rounded-lg object-cover" fallbackType="product" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{o.orderNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[o.status]}`}>{o.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">{o.items.length} item(s) · {new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">€{o.total.toFixed(2)}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistTab({ products: items }: { products: typeof products }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Wishlist</h2>
      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 font-semibold">Your wishlist is empty</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/">Explore Products</Link></Button>
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
  const addresses = [
    { id: 1, label: "Home", name: "Sophie V.", line: "123 Main St, 1012 AB Amsterdam, Netherlands", isDefault: true },
    { id: 2, label: "Work", name: "Sophie V.", line: "456 Office Ave, 1017 CD Amsterdam, Netherlands", isDefault: false },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">My Addresses</h2>
        <Button className="rounded-full gap-2" onClick={() => toast.success("Address form (demo)")}><MapPin className="h-4 w-4" /> Add Address</Button>
      </div>
      <div className="space-y-3">
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{a.label}</span>
                {a.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Default</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{a.name}</p>
              <p className="text-sm text-muted-foreground">{a.line}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => toast.success("Edit address (demo)")}>Edit</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>
      <form onSubmit={(e) => { e.preventDefault(); toast.success("Profile saved (demo)"); }} className="max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name</Label><Input defaultValue="Sophie" className="mt-1" /></div>
          <div><Label>Last Name</Label><Input defaultValue="V." className="mt-1" /></div>
        </div>
        <div><Label>Email</Label><Input defaultValue="sophie@example.com" className="mt-1" /></div>
        <div><Label>Phone</Label><Input defaultValue="+31 6 1234 5678" className="mt-1" /></div>
        <div><Label>Date of Birth</Label><Input type="date" defaultValue="1992-05-15" className="mt-1" /></div>
        <Button type="submit" className="rounded-full">Save Profile</Button>
      </form>
    </div>
  );
}

function SettingsTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
      <div className="max-w-lg space-y-6">
        <form onSubmit={(e) => { e.preventDefault(); toast.success("Password changed (demo)"); }} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Change Password</h3>
          <div><Label>Current Password</Label><Input type="password" className="mt-1" /></div>
          <div><Label>New Password</Label><Input type="password" className="mt-1" /></div>
          <div><Label>Confirm Password</Label><Input type="password" className="mt-1" /></div>
          <Button type="submit" className="rounded-full">Update Password</Button>
        </form>
        <div className="space-y-3 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Notifications</h3>
          <div className="space-y-2">
            {["Order updates", "Promotions & deals", "Product back in stock", "Newsletter"].map((n) => (
              <label key={n} className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={n !== "Newsletter"} className="rounded" />
                {n}
              </label>
            ))}
          </div>
          <Button className="rounded-full" onClick={() => toast.success("Preferences saved (demo)")}>Save Preferences</Button>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all data.</p>
          <Button variant="destructive" className="mt-3 rounded-full" onClick={() => toast.error("Account deletion (demo)")}>Delete Account</Button>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;