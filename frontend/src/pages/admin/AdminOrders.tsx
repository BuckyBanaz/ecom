// Admin Orders Page - Manages order states and filters
import { useState, useEffect } from "react";
import { Search, Eye, FileText, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  variant?: string;
}

export interface Shipment {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  shippingCost?: number;
  shipmentStatus: string;
  createdAt: string;
}

export interface TrackingEvent {
  status: string;
  timestamp: string;
  description?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  paymentMethod: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
  invoiceNumber?: string | null;
  invoiceUrl?: string | null;
  shipment?: Shipment;
  trackingEvents?: TrackingEvent[];
}

export const DEFAULT_ORDERS: Order[] = [
  {
    id: "ord-1001",
    orderNumber: "INV-1001",
    userId: "usr-1",
    customerName: "Jean Dupont",
    customerEmail: "jean.dupont@example.com",
    items: [
      {
        productId: "p1",
        productName: "Vintage Amber Bulb",
        productImage: "https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=100&auto=format&fit=crop&q=60",
        quantity: 2,
        price: 15.99,
        variant: "Extra Warm"
      },
      {
        productId: "p2",
        productName: "Modern Minimalist Pendant Light",
        productImage: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=100&auto=format&fit=crop&q=60",
        quantity: 1,
        price: 49.99,
        variant: "Matte Black"
      }
    ],
    subtotal: 81.97,
    shipping: 5.95,
    total: 87.92,
    status: "paid",
    paymentMethod: "Credit Card",
    shippingAddress: "Main Street 123, 1011AB Amsterdam, Netherlands",
    createdAt: "2026-06-01T10:30:00Z",
    updatedAt: "2026-06-01T10:30:00Z",
    invoiceNumber: "INV-1001",
    invoiceUrl: "/invoices/INV-1001.pdf",
    labelUrl: null,
    trackingNumber: null,
    carrier: "PostNL"
  },
  {
    id: "ord-1002",
    orderNumber: "INV-1002",
    userId: "usr-2",
    customerName: "Sarah Connor",
    customerEmail: "sarah.connor@example.com",
    items: [
      {
        productId: "p3",
        productName: "Industrial Wall Sconce",
        productImage: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=100&auto=format&fit=crop&q=60",
        quantity: 1,
        price: 34.50
      }
    ],
    subtotal: 34.50,
    shipping: 0,
    total: 34.50,
    status: "pending",
    paymentMethod: "iDEAL",
    shippingAddress: "Keizersgracht 456, 1016EK Amsterdam, Netherlands",
    createdAt: "2026-06-02T08:15:00Z",
    updatedAt: "2026-06-02T08:15:00Z",
    invoiceNumber: null,
    invoiceUrl: null,
    labelUrl: null,
    trackingNumber: null,
    carrier: "DHL"
  },
  {
    id: "ord-1003",
    orderNumber: "INV-1003",
    userId: "usr-3",
    customerName: "Peter Parker",
    customerEmail: "spidey@dailybugle.com",
    items: [
      {
        productId: "p4",
        productName: "Smart LED Floor Lamp",
        productImage: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=100&auto=format&fit=crop&q=60",
        quantity: 1,
        price: 89.99,
        variant: "Silver RGB"
      }
    ],
    subtotal: 89.99,
    shipping: 9.95,
    total: 99.94,
    status: "delivered",
    paymentMethod: "PayPal",
    shippingAddress: "Queens Blvd 99, New York, USA",
    createdAt: "2026-05-28T14:20:00Z",
    updatedAt: "2026-05-30T16:45:00Z",
    invoiceNumber: "INV-1003",
    invoiceUrl: "/invoices/INV-1003.pdf",
    shipment: {
      carrier: "PostNL",
      trackingNumber: "3SABC789012",
      labelUrl: "/labels/LBL-1003.pdf",
      shipmentStatus: "delivered",
      createdAt: "2026-05-28T14:20:00Z"
    }
  }
];

export const MANUAL_STATUSES = [
  "pending",
  "payment_pending",
  "paid",
  "processing",
  "ready_to_ship",
  "cancelled"
];

export const AUTO_STATUSES = [
  "label_generated",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "payment_failed",
  "returned",
  "refunded",
  "delivery_failed",
  "lost_in_transit"
];

export const statusLabels: Record<string, string> = {
  pending: "Pending",
  payment_pending: "Payment Pending",
  paid: "Paid",
  processing: "Processing",
  ready_to_ship: "Ready to Ship",
  label_generated: "Label Generated",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment Failed",
  returned: "Returned",
  refunded: "Refunded",
  delivery_failed: "Delivery Failed",
  lost_in_transit: "Lost In Transit",
};

export const statusColors: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-600 border border-orange-500/20",
  payment_pending: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  processing: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
  ready_to_ship: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
  label_generated: "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20",
  picked_up: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
  in_transit: "bg-violet-500/10 text-violet-600 border border-violet-500/20",
  out_for_delivery: "bg-purple-500/10 text-purple-600 border border-purple-500/20",
  delivered: "bg-teal-500/10 text-teal-600 border border-teal-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
  payment_failed: "bg-red-500/10 text-red-600 border border-red-500/20",
  returned: "bg-pink-500/10 text-pink-600 border border-pink-500/20",
  refunded: "bg-gray-500/10 text-gray-600 border border-gray-500/20",
  delivery_failed: "bg-stone-500/10 text-stone-600 border border-stone-500/20",
  lost_in_transit: "bg-red-950/10 text-red-900 border border-red-950/20",
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ordersList, setOrdersList] = useState<Order[]>([]);

  useEffect(() => {
    // Load orders from localStorage or default
    const stored = localStorage.getItem("admin_orders");
    if (stored) {
      setOrdersList(JSON.parse(stored));
    } else {
      localStorage.setItem("admin_orders", JSON.stringify(DEFAULT_ORDERS));
      setOrdersList(DEFAULT_ORDERS);
    }
  }, []);

  const filtered = ordersList.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{ordersList.length} orders total</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders by number or customer..."
            className="pl-10 h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All statuses</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs">
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4 hidden md:table-cell">Payment Method</th>
              <th className="p-4">Total</th>
              <th className="p-4 hidden sm:table-cell">Status</th>
              <th className="p-4 hidden lg:table-cell">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td
                    className="p-4 font-semibold text-primary cursor-pointer hover:underline"
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                  >
                    {o.orderNumber}
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-foreground">{o.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{o.customerEmail}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{o.paymentMethod}</td>
                  <td className="p-4 font-semibold text-foreground">€{o.total.toFixed(2)}</td>
                  <td className="p-4 hidden sm:table-cell">
                    <Badge className={`${statusColors[o.status] || "bg-muted"} rounded-full shadow-none font-semibold text-[10px] uppercase py-0.5 px-2`}>
                      {statusLabels[o.status] || o.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground hidden lg:table-cell">
                    {new Date(o.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border border-border/80 bg-background/50 hover:bg-primary hover:text-primary-foreground shadow-sm transition-all"
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}