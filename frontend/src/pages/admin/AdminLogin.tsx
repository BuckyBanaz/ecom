import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";

const AdminLogin = () => {
  const { t } = useTranslation();
  const { login, isLoggedIn } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

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
            <Label htmlFor="password">{t("admin_login.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("admin_login.password_placeholder")} className="mt-1" />
          </div>
          <Button className="w-full rounded-full" type="submit" disabled={isLoading}>
            {isLoading ? t("admin_login.signing_in") : t("admin_login.sign_in")}
          </Button>
        </form>
        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">{t("admin_login.demo_title")}</p>
          <p>{t("admin_login.demo_superadmin")}</p>
          <p>{t("admin_login.demo_admin")}</p>
          <p>{t("admin_login.demo_moderator")}</p>
          <p className="mt-1">{t("admin_login.demo_password")}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;