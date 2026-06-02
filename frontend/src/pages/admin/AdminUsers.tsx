import { useState } from "react";
import { Search, Shield, ShieldCheck, ShieldAlert, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin } from "@/context/AdminContext";

type DemoUser = { id: string; name: string; email: string; role: string; status: "active" | "suspended"; joinDate: string };

const demoUsers: DemoUser[] = [
  { id: "u-1", name: "Sophie V.", email: "sophie@example.com", role: "customer", status: "active", joinDate: "2025-01-15" },
  { id: "u-2", name: "Mark D.", email: "mark@example.com", role: "customer", status: "active", joinDate: "2025-02-03" },
  { id: "u-3", name: "Anna J.", email: "anna@example.com", role: "customer", status: "active", joinDate: "2025-02-20" },
  { id: "u-4", name: "Jan K.", email: "jan@example.com", role: "customer", status: "suspended", joinDate: "2025-03-01" },
  { id: "u-5", name: "Lisa M.", email: "lisa@example.com", role: "customer", status: "active", joinDate: "2025-03-12" },
  { id: "u-6", name: "Super Admin", email: "super@lamp.com", role: "superadmin", status: "active", joinDate: "2024-12-01" },
  { id: "u-7", name: "Admin User", email: "admin@lamp.com", role: "admin", status: "active", joinDate: "2025-01-01" },
  { id: "u-8", name: "Moderator", email: "mod@lamp.com", role: "moderator", status: "active", joinDate: "2025-01-10" },
];

const roleIcon = (role: string) => {
  if (role === "superadmin") return <ShieldAlert className="h-4 w-4 text-primary" />;
  if (role === "admin") return <ShieldCheck className="h-4 w-4 text-blue-600" />;
  if (role === "moderator") return <Shield className="h-4 w-4 text-green-600" />;
  return null;
};

const AdminUsers = () => {
  const { hasPermission } = useAdmin();
  const [search, setSearch] = useState("");

  const filtered = demoUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{demoUsers.length} users</p>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-10" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">User</th>
              <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Role</th>
              <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Joined</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5 capitalize">
                    {roleIcon(u.role)}{u.role}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{u.joinDate}</td>
                <td className="px-4 py-3 text-right">
                  {hasPermission("superadmin") && (
                    <Select onValueChange={(v) => toast.success(`Role changed to ${v} (demo)`)}>
                      <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder={u.role} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;