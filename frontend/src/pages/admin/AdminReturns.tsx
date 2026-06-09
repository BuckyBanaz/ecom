import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Order } from './AdminOrders';

import { ordersRepository } from "@/client/apiClient";

export default function AdminReturns() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
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

  const returnedOrders = ordersList.filter((o) => o.status === 'returned');
  const filtered = returnedOrders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-primary" /> {t("admin_orders_returned.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin_orders_returned.subtitle")}
        </p>
      </div>

      <div className="relative max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin_orders_returned.search_placeholder")}
          className="pl-10 h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs">
              <th className="p-4">{t("admin_orders_returned.table_order_id")}</th>
              <th className="p-4">{t("admin_orders_returned.table_customer")}</th>
              <th className="p-4">{t("admin_orders_returned.table_country")}</th>
              <th className="p-4">{t("admin_orders_returned.table_weight")}</th>
              <th className="p-4 text-right">{t("admin_orders_returned.table_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {t("admin_orders_returned.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const country = o.shippingAddress.includes('Netherlands') ? 'NL' :
                                o.shippingAddress.includes('USA') ? 'US' : 'Other';
                const weight = (o.items.reduce((s, i) => s + i.quantity, 0) * 1.5).toFixed(1);
                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">{o.orderNumber}</td>
                    <td className="p-4 font-medium text-foreground">{o.customerName}</td>
                    <td className="p-4 text-muted-foreground">{country}</td>
                    <td className="p-4 text-muted-foreground">{weight} kg</td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        className="h-8 rounded-full shadow-sm text-xs gap-1"
                        onClick={() => navigate(`/admin/orders/${o.id}`)}
                      >
                        <Truck className="h-3.5 w-3.5" /> {t("admin_orders_returned.button_details")}
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
