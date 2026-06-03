import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ordersRepository } from "@/client/apiClient";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseOrderMetadata } from "@/utils/formatters";
import { Logo } from "@/components/layout/Logo";

export default function InvoicePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No invoice token provided.");
      setLoading(false);
      return;
    }
    
    ordersRepository.getInvoice(token)
      .then(res => {
        if (res.success && res.data) {
          setOrder(res.data);
        } else {
          setError("Failed to load invoice.");
        }
      })
      .catch(err => {
        setError(err.message || "Invalid or expired invoice token.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading invoice...</div>;
  }

  if (error || !order) {
    return <div className="p-12 text-center text-red-500 font-medium">{error}</div>;
  }

  const { formattedAddress, tax, discount, phone, email, firstName, lastName, street, city, state, pincode, country } = parseOrderMetadata(order.shippingAddress);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Controls (Hidden when printing) */}
        <div className="mb-6 flex justify-end gap-3 print:hidden">
          <Button onClick={() => window.print()} className="gap-2 shadow-sm rounded-full bg-primary text-primary-foreground font-semibold">
            <Printer className="h-4 w-4" /> Print Invoice
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="gap-2 shadow-sm rounded-full font-semibold">
            <Download className="h-4 w-4" /> Save as PDF
          </Button>
        </div>

        {/* Invoice Document */}
        <div className="bg-white text-black p-10 sm:p-16 rounded-2xl shadow-xl space-y-6 max-w-2xl mx-auto font-sans print:shadow-none print:rounded-none print:p-0">
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <Logo forceLight className="mb-1 pointer-events-none" />
              <p className="text-xs text-stone-500 mt-1">Invoice Statement</p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="font-bold">Invoice: {order.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`}</p>
              <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
              <p>Order Reference: {order.orderNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Vendor</h4>
              <p className="mt-1 font-semibold">Schip & Ster BV</p>
              <p>Keizersgracht 456, Amsterdam</p>
              <p>billing@schipandster.nl</p>
            </div>
            <div>
              <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Bill To</h4>
              <div className="mt-1 space-y-1">
                <p className="font-semibold">{order.customerName || `${firstName} ${lastName}`.trim()}</p>
                <p className="leading-relaxed">{street ? `${street}, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                {phone && <p>Phone: {phone}</p>}
                <p>Email: {order.customerEmail || email}</p>
              </div>
            </div>
          </div>

          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {order.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="p-3 font-semibold">{item.productName} {item.variant && `(${item.variant})`}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">€{item.price.toFixed(2)}</td>
                    <td className="p-3 text-right">€{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-2 border-t pt-3">
              {/* Summary */}
              <div className="mt-6 border-t pt-4 space-y-2 text-sm text-foreground">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>€{order.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{order.shipping === 0 ? "Free" : `€${order.shipping.toFixed(2)}`}</span></div>
                {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax / GST</span><span>€{tax.toFixed(2)}</span></div>}
                {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-green-600">-€{discount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>€{order.total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          <div className="text-center border-t border-stone-200 pt-6 mt-8">
            <p className="text-[10px] text-stone-400">Thank you for shopping at Schip & Ster!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
