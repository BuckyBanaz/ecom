import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { authRepository } from "@/client/apiClient";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      // If no email in state, they might have landed here directly. That's okay, they can type it.
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const res = await authRepository.resetPassword({ email, otp, newPassword });
      if (res.success) {
        toast.success(res.message || "Password reset successfully!");
        navigate("/account");
      } else {
        toast.error(res.message || "Failed to reset password");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50/50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/forgot-password" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please enter the OTP sent to your email and your new password.
          </p>
        </div>

        <div className="bg-white p-8 border rounded-2xl shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="pl-10 py-5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">6-Digit OTP</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="otp"
                  type="text"
                  required
                  placeholder="e.g. 123456"
                  className="pl-10 py-5"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  className="pl-10 py-5"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full py-6 rounded-full text-base mt-2" disabled={loading || !email || !otp || !newPassword}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
