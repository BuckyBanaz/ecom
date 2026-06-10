import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Mail, Phone, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authRepository } from "@/client/apiClient";
import { toast } from "sonner";

const AccountAuth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get("redirect") || "/dashboard";

  const [isMounted, setIsMounted] = useState(false);
  const [authConfig, setAuthConfig] = useState({
    emailLogin: true,
    phoneLogin: true,
    registerMethod: "both"
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // If user is already logged in, redirect to dashboard
    const token = localStorage.getItem("customer_token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
    
    // Fetch auth config
    const fetchConfig = async () => {
      try {
        const res = await authRepository.getConfig();
        if (res.success && res.data) {
          setAuthConfig(res.data);
          if (!res.data.emailLogin && res.data.phoneLogin) {
            setLoginMethod("phone");
          }
        }
      } catch (error) {
        console.error("Failed to fetch auth config", error);
      }
    };
    fetchConfig();
  }, [navigate, isMounted]);

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("+31");
  const [phone, setPhone] = useState("");
  
  // OTP State for Phone Login
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Register States
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhoneCode, setRegPhoneCode] = useState("+31");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpValue, setRegOtpValue] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authRepository.login({ email, password });
      if (res.success) {
        toast.success(res.message || t("auth_pages.login.toast_logged_in"));
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("customer_user", JSON.stringify(res.user));
        navigate(redirectTo);
      } else {
        toast.error(res.message || t("auth_pages.login.toast_login_failed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("auth_pages.login.toast_login_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error(t("auth_pages.login.toast_invalid_phone"));
      return;
    }
    
    try {
      setLoading(true);
      const fullPhone = `${phoneCode}${phone}`;
      const res = await authRepository.sendOTP(fullPhone);
      if (res.success) {
        toast.success(res.message || t("auth_pages.login.toast_otp_sent"));
        setOtpSent(true);
      } else {
        toast.error(res.message || t("auth_pages.login.toast_otp_failed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("auth_pages.login.toast_otp_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length < 6) {
      toast.error(t("auth_pages.login.toast_otp_short"));
      return;
    }
    try {
      setLoading(true);
      const fullPhone = `${phoneCode}${phone}`;
      const res = await authRepository.verifyOTP({ phone: fullPhone, otp: otpValue });
      if (res.success) {
        toast.success(res.message || t("auth_pages.login.toast_logged_in"));
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("customer_user", JSON.stringify(res.user));
        navigate(redirectTo);
      } else {
        toast.error(res.message || t("auth_pages.login.toast_otp_invalid"));
      }
    } catch (error: any) {
      toast.error(error.message || t("auth_pages.login.toast_otp_invalid"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const needsPhone = authConfig.registerMethod === "both" || authConfig.registerMethod === "phone_only";
    
    if (needsPhone && !regOtpSent) {
      // Send OTP first
      try {
        setLoading(true);
        const fullPhone = `${regPhoneCode}${regPhone}`;
        const res = await authRepository.sendOTP(fullPhone, "register");
        if (res.success) {
          toast.success(res.message || t("auth_pages.login.toast_otp_sent"));
          setRegOtpSent(true);
        } else {
          toast.error(res.message || t("auth_pages.login.toast_otp_failed"));
        }
      } catch (error: any) {
        toast.error(error.message || t("auth_pages.login.toast_otp_failed"));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Complete Registration
    try {
      setLoading(true);
      
      const payload: any = {
        firstName: regFirstName,
        lastName: regLastName,
        password: regPassword,
      };
      
      if (authConfig.registerMethod === "both" || authConfig.registerMethod === "email_only") {
        payload.email = regEmail;
      }
      if (needsPhone) {
        payload.phone = `${regPhoneCode}${regPhone}`;
        payload.otp = regOtpValue;
      }

      const res = await authRepository.register(payload);
      if (res.success) {
        toast.success(res.message || t("auth_pages.register.toast_account_created"));
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("customer_user", JSON.stringify(res.user));
        navigate(redirectTo);
      } else {
        toast.error(res.message || t("auth_pages.register.toast_register_failed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("auth_pages.register.toast_register_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] w-full bg-zinc-50 flex items-center justify-center p-4">
      {/* Clean, Centered Card */}
      <div className="w-full max-w-[480px] bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden p-8 sm:p-10">
        
        {/* Custom Tabs Toggle */}
        <div className="flex bg-zinc-100 p-1 rounded-full w-full mb-8">
          <button
            onClick={() => setActiveTab("login")}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-300",
              activeTab === "login" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            {t("auth_pages.tabs.login")}
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-300",
              activeTab === "register" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            {t("auth_pages.tabs.register")}
          </button>
        </div>

        <div>
          {/* LOGIN FORM */}
          {activeTab === "login" && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{t("auth_pages.login.welcome_title")}</h3>
                <p className="text-zinc-500 mt-2 text-sm">{t("auth_pages.login.welcome_subtitle")}</p>
              </div>

              {/* Login Method Toggle */}
              {(authConfig.emailLogin && authConfig.phoneLogin) && (
                <div className="flex items-center gap-3 mb-8">
                  <button 
                    onClick={() => { setLoginMethod("email"); setOtpSent(false); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300",
                      loginMethod === "email" ? "border-primary bg-primary/5 text-primary" : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                    )}
                  >
                    <Mail size={16} /> {t("auth_pages.login.method_email")}
                  </button>
                  <button 
                    onClick={() => { setLoginMethod("phone"); setOtpSent(false); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300",
                      loginMethod === "phone" ? "border-primary bg-primary/5 text-primary" : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                    )}
                  >
                    <Phone size={16} /> {t("auth_pages.login.method_phone")}
                  </button>
                </div>
              )}

              {/* Email Login Form */}
              {loginMethod === "email" ? (
                <form className="space-y-5" onSubmit={handleEmailLogin}>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-zinc-700">{t("auth_pages.login.email_label")}</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth_pages.login.email_placeholder")} 
                      className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all" 
                      required 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-zinc-700">{t("auth_pages.login.password_label")}</Label>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">{t("auth_pages.login.forgot_password")}</Link>
                    </div>
                    <div className="relative">
                      <Input 
                        id="login-password" 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("auth_pages.login.password_placeholder")} 
                        className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all pr-12"
                        required 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-bold rounded-xl mt-6 group">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>{t("auth_pages.login.sign_in")} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </Button>
                </form>
              ) : (
                /* Phone Login Form */
                <div>
                  {!otpSent ? (
                    <form className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300" onSubmit={handleSendOTP}>
                      <div className="space-y-1.5">
                        <Label htmlFor="login-phone" className="text-zinc-700">{t("auth_pages.login.phone_label")}</Label>
                        <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                          {isMounted && (
                            <Select value={phoneCode} onValueChange={setPhoneCode}>
                              <SelectTrigger className="w-[95px] border-0 focus:ring-0 rounded-none bg-transparent h-11 text-zinc-600 font-medium shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="+31">🇳🇱 +31</SelectItem>
                                <SelectItem value="+91">🇮🇳 +91</SelectItem>
                                <SelectItem value="+1">🇺🇸 +1</SelectItem>
                                <SelectItem value="+44">🇬🇧 +44</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <div className="w-[1px] h-6 bg-zinc-200 self-center"></div>
                          <Input 
                            id="login-phone" 
                            type="tel" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder={t("auth_pages.login.phone_placeholder")} 
                            className="flex-1 h-11 border-0 focus-visible:ring-0 rounded-none bg-transparent shadow-none" 
                            required 
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-bold rounded-xl mt-6 group">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                          <>{t("auth_pages.login.send_otp")} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300" onSubmit={handleVerifyOTPLogin}>
                      <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6">
                        <p className="text-sm text-primary font-medium flex items-center justify-center gap-2">
                          <ShieldCheck size={18} />
                          {t("auth_pages.login.otp_sent_to", { phone })}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-otp" className="text-zinc-700">{t("auth_pages.login.otp_label")}</Label>
                          <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-primary hover:underline font-medium">{t("auth_pages.login.change_number")}</button>
                        </div>
                        <Input 
                          id="login-otp" 
                          type="text" 
                          placeholder={t("auth_pages.login.otp_placeholder")} 
                          className="h-12 text-center tracking-[0.5em] text-lg font-bold bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all"
                          maxLength={6}
                          value={otpValue}
                          onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                          required 
                        />
                        <p className="text-xs text-zinc-500 mt-2 text-center">
                          <Trans i18nKey="auth_pages.login.demo_otp_hint" components={{ 1: <b /> }} />
                        </p>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-bold rounded-xl mt-6">
                         {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("auth_pages.login.verify_login")}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* REGISTER FORM */}
          {activeTab === "register" && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{t("auth_pages.register.title")}</h3>
                <p className="text-zinc-500 mt-2 text-sm">{t("auth_pages.register.subtitle")}</p>
              </div>

              {!regOtpSent ? (
                <form className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300" onSubmit={handleRegisterSubmit}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-firstname" className="text-zinc-700">{t("auth_pages.register.first_name")}</Label>
                      <Input 
                        id="reg-firstname" 
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder={t("auth_pages.register.first_name_placeholder")} 
                        className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all" 
                        required 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-lastname" className="text-zinc-700">{t("auth_pages.register.last_name")}</Label>
                      <Input 
                        id="reg-lastname" 
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder={t("auth_pages.register.last_name_placeholder")} 
                        className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all" 
                        required 
                      />
                    </div>
                  </div>
                  
                  {(authConfig.registerMethod === "both" || authConfig.registerMethod === "email_only") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-zinc-700">{t("auth_pages.register.email_label")}</Label>
                      <Input 
                        id="reg-email" 
                        type="email" 
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder={t("auth_pages.register.email_placeholder")} 
                        className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all" 
                        required 
                      />
                    </div>
                  )}
                  
                  {(authConfig.registerMethod === "both" || authConfig.registerMethod === "phone_only") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-phone" className="text-zinc-700">{t("auth_pages.register.phone_label")}</Label>
                      <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                        {isMounted && (
                          <Select value={regPhoneCode} onValueChange={setRegPhoneCode}>
                            <SelectTrigger className="w-[95px] border-0 focus:ring-0 rounded-none bg-transparent h-11 text-zinc-600 font-medium shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+31">🇳🇱 +31</SelectItem>
                              <SelectItem value="+91">🇮🇳 +91</SelectItem>
                              <SelectItem value="+1">🇺🇸 +1</SelectItem>
                              <SelectItem value="+44">🇬🇧 +44</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <div className="w-[1px] h-6 bg-zinc-200 self-center"></div>
                        <Input 
                          id="reg-phone" 
                          type="tel" 
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder={t("auth_pages.register.phone_placeholder")} 
                          className="flex-1 h-11 border-0 focus-visible:ring-0 rounded-none bg-transparent shadow-none" 
                          required 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-zinc-700">{t("auth_pages.register.password_label")}</Label>
                    <div className="relative">
                      <Input 
                        id="reg-password" 
                        type={showPassword ? "text" : "password"} 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder={t("auth_pages.register.password_placeholder")} 
                        className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all pr-12"
                        required 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-bold rounded-xl mt-6 group">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        {(authConfig.registerMethod === "both" || authConfig.registerMethod === "phone_only") ? t("auth_pages.register.send_otp") : t("auth_pages.register.create_account")} 
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300" onSubmit={handleRegisterSubmit}>
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6">
                    <p className="text-sm text-primary font-medium flex items-center justify-center gap-2">
                      <ShieldCheck size={18} />
                      {t("auth_pages.register.otp_sent_to", { phone: `${regPhoneCode}${regPhone}` })}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reg-otp" className="text-zinc-700">{t("auth_pages.register.otp_label")}</Label>
                      <button type="button" onClick={() => setRegOtpSent(false)} className="text-xs text-primary hover:underline font-medium">{t("auth_pages.register.edit_details")}</button>
                    </div>
                    <Input 
                      id="reg-otp" 
                      type="text" 
                      placeholder={t("auth_pages.register.otp_placeholder")} 
                      className="h-12 text-center tracking-[0.5em] text-lg font-bold bg-zinc-50 border-zinc-200 focus:bg-white focus:border-primary transition-all"
                      maxLength={6}
                      value={regOtpValue}
                      onChange={(e) => setRegOtpValue(e.target.value.replace(/\D/g, ''))}
                      required 
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-bold rounded-xl mt-6">
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("auth_pages.register.verify_create")}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AccountAuth;
