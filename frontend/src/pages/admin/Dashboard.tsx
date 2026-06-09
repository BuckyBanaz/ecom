import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Package, ShoppingCart, Users, DollarSign, TrendingUp,
  Loader2, ShoppingBag 
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { productRepository, ordersRepository } from "@/client/apiClient";
import { Badge } from "@/components/ui/badge";
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAdmin();
  const [productsList, setProductsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const [prodRes, orderRes] = await Promise.all([
          productRepository.getAll({ limit: 100 }),
          ordersRepository.getAll(),
        ]);
        if (!active) return;
        setProductsList(prodRes.products || []);
        setOrdersList(orderRes.data || []);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  // Filter orders by current year
  const yearOrders = ordersList.filter(o => {
    const date = new Date(o.createdAt);
    return date.getFullYear() === currentYear;
  });

  // Calculate real revenue from completed/paid/shipped/delivered orders for current year
  const paidOrders = yearOrders.filter(
    (o) => o.paymentStatus === "paid" || ["paid", "processing", "label_generated", "shipped", "delivered"].includes(o.status)
  );
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Unique customers based on unique email addresses in this year
  const uniqueEmails = new Set(yearOrders.map((o) => o.customerEmail).filter(Boolean));
  const customersCount = uniqueEmails.size;

  // Average Order Value
  const aov = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

  // Format monthly chart data (EXCLUSIVELY from actual database orders)
  const getMonthlyChartData = (orders: any[], year: number) => {
    const data = months.map((month) => ({
      month,
      revenue: 0,
      orders: 0,
    }));

    orders.forEach(o => {
      const date = new Date(o.createdAt);
      const orderYear = date.getFullYear();
      const monthIdx = date.getMonth();
      const isPaid = o.paymentStatus === "paid" || ["paid", "processing", "label_generated", "shipped", "delivered"].includes(o.status);

      if (orderYear === year) {
        if (isPaid) {
          data[monthIdx].revenue += o.total || 0;
        }
        data[monthIdx].orders += 1;
      }
    });

    return data;
  };

  const monthlyData = getMonthlyChartData(ordersList, currentYear);

  // Top Selling Products Revenue (EXCLUSIVELY from actual database orders)
  const getProductPerformanceData = (orders: any[]) => {
    const prodSales: Record<string, { name: string; sales: number }> = {};
    
    orders.forEach(o => {
      const isPaid = o.paymentStatus === "paid" || ["paid", "processing", "label_generated", "shipped", "delivered"].includes(o.status);
      if (isPaid && o.items) {
        o.items.forEach((item: any) => {
          const name = item.productName || "Product";
          const itemRevenue = (item.price * item.quantity) || 0;
          if (prodSales[name]) {
            prodSales[name].sales += itemRevenue;
          } else {
            prodSales[name] = {
              name: name.substring(0, 18),
              sales: itemRevenue,
            };
          }
        });
      }
    });

    const list = Object.values(prodSales);
    return list.sort((a, b) => b.sales - a.sales).slice(0, 6);
  };

  const productPerformance = getProductPerformanceData(yearOrders);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t("admin_dashboard.page_title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("admin_dashboard.welcome_back", { name: user?.name, year: currentYear })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
          <span className="text-xs font-bold text-amber-700">{t("admin_dashboard.active_year", { year: currentYear })}</span>
        </div>
      </div>

      {/* Row 1: 4 Premium Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Revenue / Total Sales */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/5 rounded-full group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">{t("admin_dashboard.card_total_sales")}</p>
            <DollarSign className="h-4 w-4 text-blue-200" />
          </div>
          <p className="text-2xl font-bold mt-4">€{revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-blue-100">
            <TrendingUp className="h-3 w-3" />
            <span>{t("admin_dashboard.card_total_sales_desc")}</span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/5 rounded-full group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">{t("admin_dashboard.card_total_orders")}</p>
            <ShoppingCart className="h-4 w-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-bold mt-4">{paidOrders.length}</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-emerald-100">
            <ShoppingCart className="h-3 w-3" />
            <span>{t("admin_dashboard.card_total_orders_desc")}</span>
          </div>
        </div>

        {/* Card 3: Average Order Value */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/5 rounded-full group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-purple-100 uppercase tracking-wider">{t("admin_dashboard.card_aov")}</p>
            <TrendingUp className="h-4 w-4 text-purple-200" />
          </div>
          <p className="text-2xl font-bold mt-4">€{aov.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-purple-100">
            <TrendingUp className="h-3 w-3" />
            <span>{t("admin_dashboard.card_aov_desc")}</span>
          </div>
        </div>

        {/* Card 4: Unique Customers */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/5 rounded-full group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">{t("admin_dashboard.card_customers")}</p>
            <Users className="h-4 w-4 text-amber-200" />
          </div>
          <p className="text-2xl font-bold mt-4">{customersCount}</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-amber-100">
            <Users className="h-3 w-3" />
            <span>{t("admin_dashboard.card_customers_desc")}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Charts (Monthly Revenue Line Chart & Monthly Order Volume Bar Chart) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Chart: Monthly Revenue Trend */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">{t("admin_dashboard.revenue_chart_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("admin_dashboard.revenue_chart_subtitle", { year: currentYear })}</p>
            </div>
            <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-none rounded-full px-2.5 font-bold">{t("admin_dashboard.revenue_badge")}</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229, 231, 235, 0.4)" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(value) => [`€${Number(value).toLocaleString()}`, t("admin_dashboard.revenue_label")]} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
              <Line type="monotone" dataKey="revenue" name={t("admin_dashboard.revenue_line_name")} stroke="#d97706" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 3, strokeWidth: 1 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Right Chart: Monthly Order Volume */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">{t("admin_dashboard.orders_chart_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("admin_dashboard.orders_chart_subtitle")}</p>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-none rounded-full px-2.5 font-bold">{t("admin_dashboard.orders_badge")}</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229, 231, 235, 0.4)" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [Number(value), t("admin_dashboard.orders_label")]} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
              <Bar dataKey="orders" name={t("admin_dashboard.orders_bar_name")} fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Product Performance */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">{t("admin_dashboard.products_chart_title")}</h2>
            <p className="text-xs text-muted-foreground">{t("admin_dashboard.products_chart_subtitle")}</p>
          </div>
          <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-none rounded-full px-2.5 font-bold">{t("admin_dashboard.products_badge")}</Badge>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={productPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229, 231, 235, 0.4)" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
            <Tooltip formatter={(value) => [`€${Number(value).toLocaleString()}`, t("admin_dashboard.revenue_label")]} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
            <Bar dataKey="sales" name={t("admin_dashboard.products_bar_name")} fill="#d97706" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 4: Recent Orders & Store Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-base font-bold">{t("admin_dashboard.recent_orders_title")}</h2>
            <span className="text-xs text-muted-foreground font-semibold">{t("admin_dashboard.recent_orders_subtitle")}</span>
          </div>
          <div className="space-y-3">
            {yearOrders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 text-xs hover:bg-muted/50 transition border border-muted/20">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="font-bold text-foreground text-sm">{o.orderNumber}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{o.customerName} ({o.customerEmail})</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-extrabold text-foreground text-sm">€{o.total.toFixed(2)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                    o.status === "delivered" ? "bg-green-500/10 text-green-700 border-green-500/20" :
                    o.status === "shipped" ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                    o.status === "cancelled" ? "bg-red-500/10 text-red-700 border-red-500/20" :
                    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                  }`}>{o.status.replace(/_/g, " ")}</span>
                </div>
              </div>
            ))}
            {yearOrders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">{t("admin_dashboard.recent_orders_empty", { year: currentYear })}</p>
            )}
          </div>
        </div>

        {/* E-commerce Store Stats Summary */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm text-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold border-b pb-3 mb-4">{t("admin_dashboard.insights_title")}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-muted-foreground font-medium text-sm">{t("admin_dashboard.insights_aov")}</span>
                </div>
                <span className="font-extrabold text-foreground text-base">€{aov.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-muted/50 pt-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  <span className="text-muted-foreground font-medium text-sm">{t("admin_dashboard.insights_customers")}</span>
                </div>
                <span className="font-extrabold text-foreground text-base">{customersCount}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-muted/50 pt-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-muted-foreground font-medium text-sm">{t("admin_dashboard.insights_products")}</span>
                </div>
                <span className="font-extrabold text-foreground text-base">{productsList.length}</span>
              </div>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-4 text-amber-800 text-[11px] font-semibold flex items-start gap-2">
            <ShoppingBag className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{t("admin_dashboard.insights_footer")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;