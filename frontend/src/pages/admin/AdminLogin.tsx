import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";

const AdminLogin = () => {
  const { login, isLoggedIn } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (isLoggedIn) return <Navigate to="/admin" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      toast.success("Welcome back!");
      navigate("/admin");
    } else {
      toast.error("Invalid credentials. Try super@lamp.com / admin123");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to the dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="super@lamp.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin123" className="mt-1" />
          </div>
          <Button className="w-full rounded-full" type="submit">Sign in</Button>
        </form>
        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">Demo accounts:</p>
          <p>super@lamp.com — Superadmin</p>
          <p>admin@lamp.com — Admin</p>
          <p>mod@lamp.com — Moderator</p>
          <p className="mt-1">Password: admin123</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;