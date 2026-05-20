import { createContext, useContext, useState, ReactNode } from "react";

export type AdminRole = "superadmin" | "admin" | "moderator";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
};

type AdminContextType = {
  user: AdminUser | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  hasPermission: (requiredRole: AdminRole) => boolean;
};

const demoAdmins: Record<string, AdminUser & { password: string }> = {
  "super@lamp.com": { id: "a-1", name: "Super Admin", email: "super@lamp.com", role: "superadmin", password: "admin123" },
  "admin@lamp.com": { id: "a-2", name: "Admin User", email: "admin@lamp.com", role: "admin", password: "admin123" },
  "mod@lamp.com": { id: "a-3", name: "Moderator", email: "mod@lamp.com", role: "moderator", password: "admin123" },
};

const roleLevel: Record<AdminRole, number> = { superadmin: 3, admin: 2, moderator: 1 };

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem("admin_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, _password: string) => {
    const found = demoAdmins[email.toLowerCase()];
    if (found) {
      const { password: _, ...u } = found;
      setUser(u);
      localStorage.setItem("admin_user", JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("admin_user");
  };

  const hasPermission = (requiredRole: AdminRole) => {
    if (!user) return false;
    return roleLevel[user.role] >= roleLevel[requiredRole];
  };

  return (
    <AdminContext.Provider value={{ user, isLoggedIn: !!user, login, logout, hasPermission }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};