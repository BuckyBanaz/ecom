import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { authRepository } from "@/client/apiClient";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      const res = await authRepository.forgotPassword({ email });
      if (res.success) {
        toast.success(res.message || "OTP sent to your email!");
        // Navigate to reset password page and pass email in state
        navigate("/reset-password", { state: { email } });
      } else {
        toast.error(res.message || "Failed to send reset email");
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
          <Link to="/account" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Forgot password?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        <div className="bg-white p-8 border rounded-2xl shadow-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="pl-10 py-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full py-6 rounded-full text-base" disabled={loading || !email}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending instructions...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
