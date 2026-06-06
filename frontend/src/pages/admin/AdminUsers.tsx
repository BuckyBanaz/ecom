import { useState, useEffect } from "react";
import {
  Search, Mail, Phone, Calendar, DollarSign,
  MessageSquare, Plus, Star, X, User, Eye,
  Loader2, ChevronRight, ShoppingBag, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ordersRepository, reviewRepository, authRepository } from "@/client/apiClient";
import { useNavigate } from "react-router-dom";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "suspended";
  joinDate: string;
  ordersCount: number;
  totalSpent: number;
  orders: any[];
  reviews: any[];
};

/* ─── Component ─────────────────────────────────────────────────────────────── */
const AdminUsers = () => {
  const navigate = useNavigate();
  const [customers,        setCustomers]        = useState<Customer[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [openDetails,      setOpenDetails]      = useState(false);
  const [openAddModal,     setOpenAddModal]      = useState(false);
  const [isSubmitting,     setIsSubmitting]      = useState(false);
  const [newCustomer,      setNewCustomer]       = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
  });

  /* ── Data Fetching ──────────────────────────────────────────────────────── */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderRes, reviewRes] = await Promise.all([
        ordersRepository.getAll(),
        reviewRepository.getAll(),
      ]);

      const fetchedOrders  = orderRes.data || [];
      const fetchedReviews = reviewRes.success ? (reviewRes.reviews || []) : [];

      const customerMap = new Map<string, Customer>();

      fetchedOrders.forEach((o: any) => {
        if (!o.customerEmail) return;
        const email = o.customerEmail.toLowerCase().trim();

        let userPhone = o.user?.phone || "N/A";
        let parsedPhone = "N/A";
        if (o.shippingAddress) {
          try {
            const addr = JSON.parse(o.shippingAddress);
            if (addr && addr.phone) {
              parsedPhone = addr.phone;
            }
          } catch (e) {
            // Address might be a plain string
          }
        }

        const finalPhone = userPhone !== "N/A" ? userPhone : (parsedPhone !== "N/A" ? parsedPhone : (o.customerPhone || "N/A"));

        if (customerMap.has(email)) {
          const c = customerMap.get(email)!;
          c.ordersCount += 1;
          c.totalSpent  += o.total || 0;
          c.orders.push(o);
          if (new Date(o.createdAt) < new Date(c.joinDate)) c.joinDate = o.createdAt;
          if ((c.phone === "N/A" || !c.phone) && finalPhone !== "N/A") {
            c.phone = finalPhone;
          }
        } else {
          customerMap.set(email, {
            id: `c-${o.id}`,
            name:        o.customerName || "Customer",
            email,
            phone:       finalPhone,
            role:        "customer",
            status:      "active",
            joinDate:    o.createdAt,
            ordersCount: 1,
            totalSpent:  o.total || 0,
            orders:      [o],
            reviews:     [],
          });
        }
      });

      fetchedReviews.forEach((r: any) => {
        const reviewerName = (r.name || "").toLowerCase().trim();
        if (!reviewerName) return;
        for (const [, cust] of customerMap.entries()) {
          if (cust.name.toLowerCase().trim() === reviewerName) cust.reviews.push(r);
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (err) {
      console.error("Error loading customer data:", err);
      toast.error("Failed to load customer list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Add Customer ───────────────────────────────────────────────────────── */
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email || !newCustomer.phone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authRepository.register({
        firstName: newCustomer.firstName,
        lastName:  newCustomer.lastName,
        email:     newCustomer.email,
        phone:     newCustomer.phone,
        password:  newCustomer.password || "TempPass123!",
      });
      if (res.success) {
        toast.success("Customer added successfully!");
        setOpenAddModal(false);
        setNewCustomer({ firstName: "", lastName: "", email: "", phone: "", password: "" });
        await fetchData();
      } else {
        toast.error(res.message || "Failed to add customer");
      }
    } catch (err: any) {
      toast.error(err.message || "Error registering customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Customer Directory
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Manage registered store customers, view order histories and reviews.
          </p>
        </div>
        <Button
          onClick={() => setOpenAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-2 shadow-sm self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="pl-10 pr-4 py-5 sm:py-6 rounded-xl border-muted bg-card focus-visible:ring-amber-500"
        />
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total Customers",   value: customers.length,                                                            color: "text-amber-700 bg-amber-50 border-amber-200" },
            { label: "Total Revenue",     value: `€${customers.reduce((s,c)=>s+c.totalSpent,0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            { label: "Avg. Orders",       value: customers.length ? (customers.reduce((s,c)=>s+c.ordersCount,0)/customers.length).toFixed(1) : "0", color: "text-blue-700 bg-blue-50 border-blue-200" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border px-4 py-3 sm:py-4 ${s.color}`}>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-70">{s.label}</p>
              <p className="text-lg sm:text-2xl font-extrabold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Customer List ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-muted/20 rounded-2xl border border-dashed border-muted">
          <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No customers found</p>
          <p className="text-xs text-muted-foreground mt-1">Try refining your search or add a new customer.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile Card List (< sm) ─────────────────────────────────────── */}
          <div className="sm:hidden space-y-2">
            {filtered.map((c) => (
              <button
                key={c.email}
                onClick={() => { setSelectedCustomer(c); setOpenDetails(true); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border bg-card hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center font-bold text-amber-800 text-sm uppercase shrink-0">
                  {c.name.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-bold text-sm text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                      <ShoppingBag className="h-3 w-3" /> {c.ordersCount} orders
                    </span>
                    <span className="text-[10px] font-extrabold text-foreground">
                      €{c.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-green-500/10 text-green-700 border border-green-500/20 uppercase tracking-wider">
                    {c.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          {/* ── Desktop Table (≥ sm) ─────────────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-5 py-4 text-left font-bold text-muted-foreground uppercase text-xs tracking-wider">Customer</th>
                  <th className="px-5 py-4 text-left font-bold text-muted-foreground uppercase text-xs tracking-wider hidden md:table-cell">Phone</th>
                  <th className="px-5 py-4 text-center font-bold text-muted-foreground uppercase text-xs tracking-wider">Orders</th>
                  <th className="px-5 py-4 text-right font-bold text-muted-foreground uppercase text-xs tracking-wider">Spent</th>
                  <th className="px-5 py-4 text-left font-bold text-muted-foreground uppercase text-xs tracking-wider hidden lg:table-cell">Joined</th>
                  <th className="px-5 py-4 text-center font-bold text-muted-foreground uppercase text-xs tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/50">
                {filtered.map((c) => (
                  <tr
                    key={c.email}
                    onClick={() => { setSelectedCustomer(c); setOpenDetails(true); }}
                    className="hover:bg-muted/30 cursor-pointer transition-colors duration-150 group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-amber-700 text-xs uppercase shrink-0 group-hover:bg-amber-500/20 transition-colors">
                          {c.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate group-hover:text-amber-700 transition-colors">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-muted-foreground font-medium text-xs">{c.phone}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-muted px-2.5 py-1 rounded-lg text-xs font-bold text-foreground">
                        {c.ordersCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-foreground text-sm">
                      €{c.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell font-medium text-xs whitespace-nowrap">
                      {new Date(c.joinDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </td>
                    <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-green-500/10 text-green-700 border border-green-500/20 uppercase tracking-wider">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Customer Detail Sheet ─────────────────────────────────────────────── */}
      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent
          className="w-full sm:max-w-xl overflow-y-auto bg-card border-l p-0"
          aria-describedby="customer-details-description"
        >
          {selectedCustomer && (
            <div className="flex flex-col h-full">

              {/* Sheet Header */}
              <SheetHeader className="border-b px-5 py-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/20 flex items-center justify-center font-extrabold text-amber-800 text-base sm:text-lg uppercase shrink-0">
                    {selectedCustomer.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-left">
                      {selectedCustomer.name}
                    </SheetTitle>
                    <p id="customer-details-description" className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selectedCustomer.email}
                    </p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-green-500/10 text-green-700 border border-green-500/20 uppercase tracking-wider shrink-0">
                    {selectedCustomer.status}
                  </span>
                </div>
              </SheetHeader>

              {/* Tabs */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted rounded-xl p-1 mb-5">
                    <TabsTrigger value="info"    className="rounded-lg font-bold text-[11px] sm:text-xs">Info</TabsTrigger>
                    <TabsTrigger value="orders"  className="rounded-lg font-bold text-[11px] sm:text-xs">Orders ({selectedCustomer.ordersCount})</TabsTrigger>
                    <TabsTrigger value="reviews" className="rounded-lg font-bold text-[11px] sm:text-xs">Reviews ({selectedCustomer.reviews.length})</TabsTrigger>
                  </TabsList>

                  {/* ── Tab 1: Profile Info ─────────────────────────────────── */}
                  <TabsContent value="info" className="space-y-3 outline-none">
                    <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2">
                      {[
                        { label: "Email Address",   icon: Mail,     value: selectedCustomer.email,    truncate: true  },
                        { label: "Phone Number",    icon: Phone,    value: selectedCustomer.phone,    truncate: false },
                        { label: "Customer Since",  icon: Calendar, value: new Date(selectedCustomer.joinDate).toLocaleDateString(undefined, { dateStyle: "long" }), truncate: false },
                        { label: "Account Status",  icon: User,     value: selectedCustomer.status,   truncate: false, badge: true },
                      ].map(item => {
                        const IIcon = item.icon;
                        return (
                          <div key={item.label} className="border rounded-xl p-3 sm:p-4 bg-muted/10 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{item.label}</span>
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mt-0.5">
                              <IIcon className="h-4 w-4 text-amber-600 shrink-0" />
                              {item.badge
                                ? <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-green-500/10 text-green-700 border border-green-500/20 uppercase">{item.value}</span>
                                : <span className={item.truncate ? "truncate" : ""}>{item.value}</span>
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Revenue Highlight */}
                    <div className="border rounded-xl p-4 sm:p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex justify-between items-center mt-2">
                      <div>
                        <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">Total Value Contributed</p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-amber-950 mt-1">
                          €{selectedCustomer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-amber-600 text-white rounded-xl p-3">
                        <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Tab 2: Orders ───────────────────────────────────────── */}
                  <TabsContent value="orders" className="outline-none">
                    {selectedCustomer.orders.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No orders found for this customer.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedCustomer.orders.map((order) => (
                          <button
                            key={order.id}
                            onClick={() => { setOpenDetails(false); navigate(`/admin/orders/${order.id}`); }}
                            className="w-full flex items-center justify-between border rounded-xl bg-muted/10 p-3 sm:p-4 hover:bg-muted/30 transition-all cursor-pointer group text-left"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-bold text-foreground text-xs sm:text-sm group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                                {order.orderNumber}
                                <Eye className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
                              <span className="font-extrabold text-foreground text-xs sm:text-sm">
                                €{order.total.toFixed(2)}
                              </span>
                              <span className={`rounded-full px-2 sm:px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                                order.status === "delivered" ? "bg-green-500/10 text-green-700 border-green-500/20" :
                                order.status === "shipped"   ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                                order.status === "cancelled" ? "bg-red-500/10 text-red-700 border-red-500/20" :
                                                               "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                              }`}>{order.status.replace(/_/g, " ")}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Tab 3: Reviews ──────────────────────────────────────── */}
                  <TabsContent value="reviews" className="outline-none">
                    {selectedCustomer.reviews.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No reviews submitted by this customer.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedCustomer.reviews.map((r, idx) => (
                          <div key={idx} className="border rounded-xl p-3 sm:p-4 space-y-2 bg-muted/10">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center text-yellow-400">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${i < r.rating ? "fill-current" : "text-gray-300"}`} />
                                ))}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-xs">{r.title}</p>
                              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{r.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Customer Modal ─────────────────────────────────────────────────── */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl sm:max-w-md relative">

            {/* Drag handle on mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-5 sm:px-6 pt-4 pb-3 border-b flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                  Add New Customer
                </h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Create a new customer profile in the store database.
                </p>
              </div>
              <button
                onClick={() => setOpenAddModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCustomer} className="px-5 sm:px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">First Name *</label>
                  <Input required value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                    placeholder="e.g. John"
                    className="focus-visible:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Last Name *</label>
                  <Input required value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                    placeholder="e.g. Doe"
                    className="focus-visible:ring-amber-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Email Address *</label>
                <Input required type="email" value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  className="focus-visible:ring-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Phone Number *</label>
                <Input required value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+31 6 12345678"
                  className="focus-visible:ring-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Password (Optional)</label>
                <Input type="password" value={newCustomer.password}
                  onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
                  placeholder="Leave empty → TempPass123!"
                  className="focus-visible:ring-amber-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t">
                <Button type="button" variant="outline"
                  onClick={() => setOpenAddModal(false)}
                  className="rounded-xl font-bold w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm w-full sm:w-auto sm:min-w-[130px]"
                >
                  {isSubmitting
                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    : "Save Customer"
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;