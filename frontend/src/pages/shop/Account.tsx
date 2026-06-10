import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authRepository } from "@/client/apiClient";
import { useNavigate } from "react-router-dom";

const Account = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  
  // Login State
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Register State
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return toast.error(t("account.toast_email_required"));
    try {
      setIsLoading(true);
      const res = await authRepository.login({ email: loginEmail, password: loginPassword, isAdmin: false });
      if (res.success) {
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success(t("account.toast_login_success"));
        navigate("/account/dashboard"); // Or wherever the user dashboard is
      }
    } catch (err: any) {
      toast.error(err.message || t("account.toast_login_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!loginPhone) return toast.error(t("account.toast_phone_required"));
    try {
      setIsLoading(true);
      const res = await authRepository.sendOtp({ phone: loginPhone });
      if (res.success) {
        setOtpSent(true);
        toast.success(t("account.toast_otp_sent"));
      }
    } catch (err: any) {
      toast.error(err.message || t("account.toast_otp_send_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return toast.error(t("account.toast_otp_required"));
    try {
      setIsLoading(true);
      const res = await authRepository.verifyOtp({ phone: loginPhone, otp: otpCode });
      if (res.success) {
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success(t("account.toast_login_success"));
        navigate("/account/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || t("account.toast_otp_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await authRepository.register({
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        phone: regPhone,
        password: regPassword
      });
      if (res.success) {
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success(t("account.toast_register_success"));
        navigate("/account/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || t("account.toast_register_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-page max-w-md py-12">
      <h1 className="mb-6 text-3xl font-bold">{t("account.my_account")}</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{t("account.tab_signin")}</TabsTrigger>
          <TabsTrigger value="register">{t("account.tab_register")}</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex gap-2 mb-6">
              <Button 
                variant={loginMethod === "email" ? "default" : "outline"} 
                className="w-full" 
                onClick={() => setLoginMethod("email")}
              >
                {t("account.use_email")}
              </Button>
              <Button 
                variant={loginMethod === "phone" ? "default" : "outline"} 
                className="w-full" 
                onClick={() => { setLoginMethod("phone"); setOtpSent(false); }}
              >
                {t("account.use_phone")}
              </Button>
            </div>

            {loginMethod === "email" ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <Field id="email" label={t("account.field_email")} type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                <Field id="password" label={t("account.field_password")} type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                <Button disabled={isLoading} className="w-full rounded-full">{t("account.button_signin_email")}</Button>
              </form>
            ) : (
              <form onSubmit={otpSent ? handleVerifyOtp : (e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                <Field 
                  id="phone" 
                  label={t("account.field_phone_number")} 
                  type="tel" 
                  placeholder={t("account.placeholder_phone")}
                  value={loginPhone} 
                  onChange={(e) => setLoginPhone(e.target.value)} 
                  disabled={otpSent}
                />
                
                {otpSent && (
                  <Field 
                    id="otp" 
                    label={t("account.field_enter_otp")} 
                    type="text" 
                    placeholder={t("account.placeholder_otp")}
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value)} 
                  />
                )}
                
                <Button disabled={isLoading} className="w-full rounded-full">
                  {otpSent ? t("account.button_verify_signin") : t("account.button_send_otp")}
                </Button>

                {otpSent && (
                  <Button type="button" variant="link" className="w-full mt-2" onClick={() => setOtpSent(false)}>
                    {t("account.button_change_phone")}
                  </Button>
                )}
              </form>
            )}
          </div>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleRegister} className="space-y-4 rounded-xl border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <Field id="r-firstname" label={t("account.field_first_name")} value={regFirstName} onChange={e => setRegFirstName(e.target.value)} required />
              <Field id="r-lastname" label={t("account.field_last_name")} value={regLastName} onChange={e => setRegLastName(e.target.value)} required />
            </div>
            <Field id="r-email" label={t("account.field_email")} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
            <Field id="r-phone" label={t("account.field_phone")} type="tel" placeholder={t("account.placeholder_register_phone")} value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
            <Field id="r-password" label={t("account.field_password")} type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
            <Button disabled={isLoading} className="w-full rounded-full">{t("account.button_create_account")}</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function Field({ id, label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="mt-1.5" {...rest} />
    </div>
  );
}
export default Account;