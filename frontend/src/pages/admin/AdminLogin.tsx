import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import { ENDPOINTS } from "@/utils/endpoints";

const AdminLogin = () => {
  const { t } = useTranslation();
  const { login, isLoggedIn } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  if (isLoggedIn) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    
    if (success) {
      toast.success(t("admin_login.toast_welcome"));
      navigate("/admin");
    } else {
      toast.error(t("admin_login.toast_invalid"));
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      if (forgotStep === "email") {
        const res = await fetch(`${ENDPOINTS.AUTH}/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(t("admin_login.toast_otp_sent"));
          setForgotStep("otp");
        } else {
          toast.error(data.message || t("admin_login.toast_error"));
        }
      } else {
        const res = await fetch(`${ENDPOINTS.AUTH}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail, otp, newPassword })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(t("admin_login.toast_password_reset"));
          setShowForgotModal(false);
          setForgotStep("email");
          setOtp("");
          setNewPassword("");
        } else {
          toast.error(data.message || t("admin_login.toast_error"));
        }
      }
    } catch (err: any) {
      toast.error(t("admin_login.toast_error"));
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("admin_login.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin_login.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t("admin_login.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("admin_login.email_placeholder")} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("admin_login.password")}</Label>
              <button
                type="button"
                onClick={() => { setShowForgotModal(true); setForgotStep("email"); }}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
              >
                {t("admin_login.forgot_password")}
              </button>
            </div>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("admin_login.password_placeholder")} className="mt-1" />
          </div>
          <Button className="w-full rounded-full" type="submit" disabled={isLoading}>
            {isLoading ? t("admin_login.signing_in") : t("admin_login.sign_in")}
          </Button>
        </form>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card border shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">
                {forgotStep === "email" ? t("admin_login.forgot_password_title") : t("admin_login.reset_password_title")}
              </h2>
              <button onClick={() => setShowForgotModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleForgotSubmit} className="p-5 space-y-4">
              {forgotStep === "email" ? (
                <div>
                  <Label>{t("admin_login.email")}</Label>
                  <Input required type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="mt-1" />
                </div>
              ) : (
                <>
                  <div>
                    <Label>{t("admin_login.otp_code")}</Label>
                    <Input required type="text" value={otp} onChange={e => setOtp(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("admin_login.new_password")}</Label>
                    <Input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" />
                  </div>
                </>
              )}
              <Button type="submit" disabled={isForgotLoading} className="w-full bg-amber-600 hover:bg-amber-700">
                {isForgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin_login.submit")}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;