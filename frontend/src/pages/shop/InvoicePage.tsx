import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ordersRepository } from "@/client/apiClient";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/context/CartContext";
import { parseOrderMetadata } from "@/utils/formatters";
import { printInvoice } from "@/utils/printInvoice";
import { getInvoiceNumber } from "@/utils/invoice";
import { Logo } from "@/components/layout/Logo";

export default function InvoicePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      const orderParam = searchParams.get("order");
      if (orderParam) {
        setError(t("invoice.error_secure_link"));
      } else {
        setError(t("invoice.error_no_token"));
      }
      setLoading(false);
      return;
    }
    
    ordersRepository.getInvoice(token)
      .then(res => {
        if (res.success && res.data) {
          setOrder(res.data);
        } else {
          setError(t("invoice.error_load"));
        }
      })
      .catch(err => {
        setError(err.message || t("invoice.error_invalid"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, t, searchParams]);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">{t("invoice.loading")}</div>;
  }

  if (error || !order) {
    return <div className="p-12 text-center text-red-500 font-medium">{error}</div>;
  }

  const { formattedAddress, tax, discount, phone, email, firstName, lastName, street, city, state, pincode, country } = parseOrderMetadata(order.shippingAddress);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-end gap-3 no-print">
          <Button onClick={printInvoice} className="gap-2 shadow-sm rounded-full bg-primary text-primary-foreground font-semibold">
            <Printer className="h-4 w-4" /> {t("invoice.button_print")}
          </Button>
          <Button onClick={printInvoice} variant="outline" className="gap-2 shadow-sm rounded-full font-semibold">
            <Download className="h-4 w-4" /> {t("invoice.button_save_pdf")}
          </Button>
        </div>

        <div className="invoice-print-area bg-white text-black p-10 sm:p-16 rounded-2xl shadow-xl space-y-6 max-w-2xl mx-auto font-sans">
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <Logo forceLight className="mb-1 pointer-events-none" />
              <p className="text-xs text-stone-500 mt-1">{t("invoice.statement")}</p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="font-bold">{t("invoice.label_invoice")} {getInvoiceNumber(order)}</p>
              <p>{t("invoice.label_date")} {new Date(order.createdAt).toLocaleDateString()}</p>
              <p>{t("invoice.label_order_ref")} {order.orderNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">{t("invoice.label_vendor")}</h4>
              <p className="mt-1 font-semibold">Schip & Ster BV</p>
              <p>Keizersgracht 456, Amsterdam</p>
              <p>billing@schipandster.nl</p>
            </div>
            <div>
              <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">{t("invoice.label_bill_to")}</h4>
              <div className="mt-1 space-y-1">
                <p className="font-semibold">{order.customerName || `${firstName} ${lastName}`.trim()}</p>
                <p className="leading-relaxed">{street ? `${street}, ${city} ${pincode}, ${state}, ${country}` : formattedAddress}</p>
                {phone && <p>{t("invoice.label_phone")} {phone}</p>}
                <p>{t("invoice.label_email")} {order.customerEmail || email}</p>
              </div>
            </div>
          </div>

          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <th className="p-3">{t("invoice.col_product")}</th>
                  <th className="p-3 text-center">{t("invoice.col_qty")}</th>
                  <th className="p-3 text-right">{t("invoice.col_price")}</th>
                  <th className="p-3 text-right">{t("invoice.col_total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {order.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="p-3 font-semibold">{item.productName} {item.variant && `(${item.variant})`}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">{formatPrice(item.price)}</td>
                    <td className="p-3 text-right">{formatPrice(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-2 pt-3">
              <div className="border-t pt-4 space-y-2 text-sm text-foreground">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.summary_subtotal")}</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.summary_shipping")}</span><span>{order.shipping === 0 ? t("invoice.summary_free") : formatPrice(order.shipping)}</span></div>
                {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.summary_tax")}</span><span>{formatPrice(tax)}</span></div>}
                {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.summary_discount")}</span><span className="text-green-600">-{formatPrice(discount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>{t("invoice.summary_total")}</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </div>
          </div>

          <div className="text-center border-t border-stone-200 pt-6 mt-8">
            <p className="text-[10px] text-stone-400">{t("invoice.thank_you")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
