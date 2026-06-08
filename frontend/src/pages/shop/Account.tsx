import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authRepository } from "@/client/apiClient";
import { useNavigate } from "react-router-dom";

const Account = () => {
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
    if (!loginEmail || !loginPassword) return toast.error("Email and password are required");
    try {
      setIsLoading(true);
      const res = await authRepository.login({ email: loginEmail, password: loginPassword, isAdmin: false });
      if (res.success) {
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success("Logged in successfully!");
        navigate("/account/dashboard"); // Or wherever the user dashboard is
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!loginPhone) return toast.error("Phone number is required");
    try {
      setIsLoading(true);
      const res = await authRepository.sendOtp({ phone: loginPhone });
      if (res.success) {
        setOtpSent(true);
        toast.success("OTP sent to your phone");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return toast.error("OTP is required");
    try {
      setIsLoading(true);
      const res = await authRepository.verifyOtp({ phone: loginPhone, otp: otpCode });
      if (res.success) {
        localStorage.setItem("customer_token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success("Logged in successfully!");
        navigate("/account/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed");
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
        toast.success("Account created successfully!");
        navigate("/account/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-page max-w-md py-12">
      <h1 className="mb-6 text-3xl font-bold">My account</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign in</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex gap-2 mb-6">
              <Button 
                variant={loginMethod === "email" ? "default" : "outline"} 
                className="w-full" 
                onClick={() => setLoginMethod("email")}
              >
                Use Email
              </Button>
              <Button 
                variant={loginMethod === "phone" ? "default" : "outline"} 
                className="w-full" 
                onClick={() => { setLoginMethod("phone"); setOtpSent(false); }}
              >
                Use Phone
              </Button>
            </div>

            {loginMethod === "email" ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <Field id="email" label="Email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                <Field id="password" label="Password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                <Button disabled={isLoading} className="w-full rounded-full">Sign in with Email</Button>
              </form>
            ) : (
              <form onSubmit={otpSent ? handleVerifyOtp : (e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                <Field 
                  id="phone" 
                  label="Phone Number" 
                  type="tel" 
                  placeholder="+31612345678"
                  value={loginPhone} 
                  onChange={(e) => setLoginPhone(e.target.value)} 
                  disabled={otpSent}
                />
                
                {otpSent && (
                  <Field 
                    id="otp" 
                    label="Enter OTP" 
                    type="text" 
                    placeholder="123456"
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value)} 
                  />
                )}
                
                <Button disabled={isLoading} className="w-full rounded-full">
                  {otpSent ? "Verify & Sign in" : "Send OTP"}
                </Button>

                {otpSent && (
                  <Button type="button" variant="link" className="w-full mt-2" onClick={() => setOtpSent(false)}>
                    Change Phone Number
                  </Button>
                )}
              </form>
            )}
          </div>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleRegister} className="space-y-4 rounded-xl border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <Field id="r-firstname" label="First name" value={regFirstName} onChange={e => setRegFirstName(e.target.value)} required />
              <Field id="r-lastname" label="Last name" value={regLastName} onChange={e => setRegLastName(e.target.value)} required />
            </div>
            <Field id="r-email" label="Email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
            <Field id="r-phone" label="Phone" type="tel" placeholder="+316..." value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
            <Field id="r-password" label="Password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
            <Button disabled={isLoading} className="w-full rounded-full">Create account</Button>
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