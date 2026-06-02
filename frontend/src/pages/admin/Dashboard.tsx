import { Package, ShoppingCart, Users, TrendingUp, DollarSign, Eye } from "lucide-react";
import { products } from "@/data/products";
import { orders } from "@/data/orders";
import { useAdmin } from "@/context/AdminContext";

const stats = [
  { label: "Total Products", value: products.length, icon: Package, color: "text-blue-600 bg-blue-100" },
  { label: "Total Orders", value: orders.length, icon: ShoppingCart, color: "text-green-600 bg-green-100" },
  { label: "Revenue", value: `€${orders.reduce((s, o) => s + o.total, 0).toFixed(0)}`, icon: DollarSign, color: "text-primary bg-primary/10" },
  { label: "Customers", value: 6, icon: Users, color: "text-purple-600 bg-purple-100" },
  { label: "Page Views", value: "12.4k", icon: Eye, color: "text-orange-600 bg-orange-100" },
  { label: "Conversion", value: "3.2%", icon: TrendingUp, color: "text-teal-600 bg-teal-100" },
];

const Dashboard = () => {
  const { user } = useAdmin();
  return (
    <div>
      <p className="text-muted-foreground text-sm mb-6">Welcome back, {user?.name}! Here's your store overview.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className={`grid h-12 w-12 place-items-center rounded-xl ${s.color}`}>
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold">{o.orderNumber}</span>
                  <span className="ml-2 text-muted-foreground">{o.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">€{o.total.toFixed(2)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    o.status === "delivered" ? "bg-green-100 text-green-700" :
                    o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                    o.status === "cancelled" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Top Products</h2>
          <div className="space-y-3">
            {products.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <img src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.brand}</p>
                </div>
                <span className="text-sm font-bold">€{p.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;