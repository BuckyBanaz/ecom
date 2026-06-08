import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ordersRepository } from "@/client/apiClient";
import { toast } from "sonner";

const CheckoutRetry = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      return;
    }

    const retryPayment = async () => {
      try {
        const res = await ordersRepository.retryPayment(orderId);
        if (res.success && res.url) {
          window.location.href = res.url;
        } else {
          setError(res.message || "Failed to initialize payment retry.");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while retrying payment.");
      }
    };

    retryPayment();
  }, [orderId]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Retry Failed</h1>
        <p className="text-muted-foreground max-w-md mb-6">{error}</p>
        <div className="flex gap-4">
          <Button onClick={() => navigate("/dashboard")} className="rounded-full">
            Go to Dashboard
          </Button>
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-6" />
      <h1 className="text-2xl font-bold mb-2">Preparing Payment...</h1>
      <p className="text-muted-foreground">Please wait while we redirect you to the secure payment gateway.</p>
    </div>
  );
};

export default CheckoutRetry;
