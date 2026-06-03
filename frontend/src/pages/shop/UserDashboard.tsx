import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { MapSelector } from "@/components/shop/MapSelector";
import { addressRepository, authRepository } from "@/client/apiClient";

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
  lat: string;
  lng: string;
  isDefault: boolean;
}

const statusColors: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  pending: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const { items: wishlistProducts } = useWishlist();
  const [tab, setTab] = useState("orders");
  
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("customer_token");
    const storedUser = localStorage.getItem("customer_user");
    
    if (!token || !storedUser) {
      navigate("/account", { replace: true });
    } else {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        navigate("/account", { replace: true });
      }
    }
  }, [navigate]);

  // Demo: show orders for user-0
  const userOrders = orders.filter((o) => o.userId === "user-0");

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");
    toast.success("Logged out successfully");
    navigate("/account");
  };

  if (!user) return null;

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-semibold">{user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "User"}</p>
                <p className="text-xs text-muted-foreground truncate w-40">{user?.email || user?.phone || "customer@example.com"}</p>
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
              <button 
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-4"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </nav>
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
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchAddresses = async () => {
    try {
      setFetching(true);
      const res = await addressRepository.getAll();
      setAddresses(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load addresses");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  
  const [formData, setFormData] = useState<Partial<Address>>({
    label: "Home", firstName: "", lastName: "", phone: "", street: "", city: "", state: "", pincode: "", country: "", lat: "", lng: "", isDefault: false
  });

  const handleOpenForm = (address?: Address) => {
    if (address) {
      setEditingId(address.id);
      setFormData(address);
    } else {
      setEditingId(null);
      setFormData({ label: "Home", firstName: "", lastName: "", phone: "", street: "", city: "", state: "", pincode: "", country: "", lat: "", lng: "", isDefault: false });
    }
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await addressRepository.delete(id.toString());
      toast.success("Address deleted");
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete address");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await addressRepository.update(editingId.toString(), formData);
        toast.success("Address updated");
      } else {
        await addressRepository.create(formData);
        toast.success("Address added");
      }
      setIsFormOpen(false);
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || "Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelect = (loc: any) => {
    setFormData({
      ...formData,
      lat: loc.lat,
      lng: loc.lng,
      street: loc.street || formData.street,
      city: loc.city || formData.city,
      state: loc.state || formData.state,
      pincode: loc.pincode || formData.pincode,
      country: loc.country || formData.country,
    });
    setIsMapOpen(false);
    toast.success("Location extracted from map!");
  };

  if (isFormOpen) {
    return (
      <div className="bg-card border rounded-xl p-6 shadow-sm max-w-2xl relative">
        {isMapOpen && <MapSelector onSelect={handleMapSelect} onCancel={() => setIsMapOpen(false)} />}
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{editingId ? "Edit Address" : "Add New Address"}</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsMapOpen(true)} className="rounded-full gap-2 border-primary text-primary hover:bg-primary/5">
            <MapPin size={16} /> Choose on Map
          </Button>
        </div>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name</Label><Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required className="mt-1" /></div>
            <div><Label>Last Name</Label><Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="mt-1" /></div>
            <div>
              <Label>Address Label</Label>
              <select 
                value={formData.label} 
                onChange={e => setFormData({...formData, label: e.target.value})} 
                required 
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
              >
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div><Label>Street Address</Label><Input value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} required className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required className="mt-1" /></div>
            <div><Label>State / Province</Label><Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Pincode / ZIP</Label><Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} required className="mt-1" /></div>
            <div><Label>Country</Label><Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} required className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Latitude (Optional)</Label><Input value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} className="mt-1" placeholder="e.g. 52.3731" /></div>
            <div><Label>Longitude (Optional)</Label><Input value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} className="mt-1" placeholder="e.g. 4.8922" /></div>
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm">
            <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="rounded" />
            Set as default address
          </label>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-full">Cancel</Button>
            <Button type="submit" disabled={loading} className="rounded-full">
              {loading ? "Saving..." : "Save Address"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">My Addresses</h2>
        <Button className="rounded-full gap-2" onClick={() => handleOpenForm()}><MapPin className="h-4 w-4" /> Add Address</Button>
      </div>
      {fetching ? (
        <p className="text-muted-foreground text-sm">Loading addresses...</p>
      ) : addresses.length === 0 ? (
        <p className="text-muted-foreground text-sm">No addresses found.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.label}</span>
                  {a.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Default</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.firstName} {a.lastName} • {a.phone}</p>
                <p className="text-sm text-muted-foreground">{a.street}, {a.city}, {a.state} {a.pincode}</p>
                <p className="text-sm text-muted-foreground">{a.country}</p>
                {(a.lat || a.lng) && <p className="text-xs text-muted-foreground mt-1">GPS: {a.lat}, {a.lng}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenForm(a)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(a.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setFetching(true);
        const res = await authRepository.getProfile();
        if (res.success && res.data) {
          const d = res.data;
          setFormData({
            firstName: d.firstName || "",
            lastName: d.lastName || "",
            email: d.email || "",
            phone: d.phone || "",
          });
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load profile");
        console.error("Profile load error:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authRepository.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });
      if (res.success) {
        toast.success("Profile updated successfully!");
        // Update local storage user data as well
        const cachedUser = JSON.parse(localStorage.getItem("customer_user") || "{}");
        localStorage.setItem("customer_user", JSON.stringify({ ...cachedUser, ...res.data }));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-muted-foreground text-sm">Loading profile...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>
      <form onSubmit={handleSave} className="max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name</Label><Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="mt-1" required /></div>
          <div><Label>Last Name</Label><Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="mt-1" required /></div>
        </div>
        <div><Label>Email</Label><Input value={formData.email} disabled className="mt-1 bg-muted cursor-not-allowed text-muted-foreground" title="Email cannot be changed" /></div>
        <div><Label>Phone</Label><Input type="tel" value={formData.phone} disabled className="mt-1 bg-muted cursor-not-allowed text-muted-foreground" title="Phone number cannot be changed" /></div>
        <Button type="submit" disabled={loading} className="rounded-full">
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}

function SettingsTab() {
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const res = await authRepository.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.success) {
        toast.success("Password updated successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
      <div className="max-w-lg space-y-6">
        <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Change Password</h3>
          <div><Label>Current Password</Label><Input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} required className="mt-1" /></div>
          <div><Label>New Password</Label><Input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} required className="mt-1" minLength={6} /></div>
          <div><Label>Confirm Password</Label><Input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} required className="mt-1" minLength={6} /></div>
          <Button type="submit" disabled={loading} className="rounded-full">{loading ? "Updating..." : "Update Password"}</Button>
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