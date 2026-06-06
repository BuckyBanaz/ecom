import { useState, useEffect } from 'react';
import { CheckCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Order } from './AdminOrders';

import { ordersRepository } from "@/client/apiClient";

export default function AdminDelivered() {
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

  const deliveredOrders = ordersList.filter((o) => o.status === 'delivered');
  const filtered = deliveredOrders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-primary" /> Delivered Orders
        </h2>
        <p className="text-sm text-muted-foreground">
          Orders that have reached the customer.
        </p>
      </div>

      <div className="relative max-w-md">
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
              <th className="p-4">Carrier</th>
              <th className="p-4">Tracking Number</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No delivered orders.
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">{o.orderNumber}</td>
                    <td className="p-4 font-medium text-foreground">
                      <p className="font-semibold text-foreground">{o.customerName}</p>
                      <p className="text-[10px] text-muted-foreground">{o.customerEmail}</p>
                    </td>
                    <td className="p-4 text-muted-foreground font-semibold">{o.carrier || "Sendcloud"}</td>
                    <td className="p-4 text-primary font-mono select-all">
                      {o.trackingNumber ? (
                        o.trackingUrl ? (
                          <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {o.trackingNumber}
                          </a>
                        ) : (
                          o.trackingNumber
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                        {o.shipmentStatus || o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        className="h-8 rounded-full shadow-sm text-xs gap-1"
                        onClick={() => navigate(`/admin/orders/${o.id}`)}
                      >
                        <Truck className="h-3.5 w-3.5" /> Details
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
