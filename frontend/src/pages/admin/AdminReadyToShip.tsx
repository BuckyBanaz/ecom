import { useState, useEffect } from "react";
import { Package, Truck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Order } from "./AdminOrders";

import { ordersRepository } from "@/client/apiClient";

export default function AdminReadyToShip() {
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await ordersRepository.getAll();
        setOrdersList(res.data || []);
      } catch (err) {
        console.error("Failed to load orders", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Filter ONLY orders with status "paid", "processing", or "ready_to_ship"
  const readyOrders = ordersList.filter((o) => ["paid", "processing", "ready_to_ship"].includes(o.status));

  const filtered = readyOrders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Ready To Ship Queue
        </h2>
        <p className="text-sm text-muted-foreground">
          Orders packed and waiting for Sendcloud shipment creation.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order or customer..."
          className="pl-10 h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs">
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Country</th>
              <th className="p-4">Weight (est.)</th>
              <th className="p-4">Total</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No orders currently ready to ship.
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                // Determine country naively from string
                const country = o.shippingAddress.includes("Netherlands") ? "NL" : 
                                o.shippingAddress.includes("USA") ? "US" : "Other";
                
                // Estimate weight (1.5kg per item)
                const weight = (o.items.reduce((sum, i) => sum + i.quantity, 0) * 1.5).toFixed(1);

                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">{o.orderNumber}</td>
                    <td className="p-4 font-medium text-foreground">{o.customerName}</td>
                    <td className="p-4 text-muted-foreground">{country}</td>
                    <td className="p-4 text-muted-foreground">{weight} kg</td>
                    <td className="p-4 font-semibold text-foreground">€{o.total.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        className="h-8 rounded-full shadow-sm text-xs gap-1"
                        onClick={() => navigate(`/admin/orders/${o.id}`)}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Create Shipment
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
