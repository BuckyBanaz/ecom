import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ordersRepository } from "@/client/apiClient";
import { toast } from "sonner";

const CheckoutRetry = () => {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError(t("checkout_retry.error_no_id"));
      return;
    }

    const retryPayment = async () => {
      try {
        const res = await ordersRepository.retryPayment(orderId);
        if (res.success && res.url) {
          window.location.href = res.url;
        } else {
          setError(res.message || t("checkout_retry.error_init_failed"));
        }
      } catch (err: any) {
        setError(err.message || t("checkout_retry.error_retry"));
      }
    };

    retryPayment();
  }, [orderId, t]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("checkout_retry.title_failed")}</h1>
        <p className="text-muted-foreground max-w-md mb-6">{error}</p>
        <div className="flex gap-4">
          <Button onClick={() => navigate("/dashboard")} className="rounded-full">
            {t("checkout_retry.button_dashboard")}
          </Button>
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/">{t("checkout_retry.button_continue_shopping")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-6" />
      <h1 className="text-2xl font-bold mb-2">{t("checkout_retry.title_preparing")}</h1>
      <p className="text-muted-foreground">{t("checkout_retry.desc_preparing")}</p>
    </div>
  );
};

export default CheckoutRetry;
