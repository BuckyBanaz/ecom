import { createContext, useContext, useState, ReactNode } from "react";
import { authRepository } from "../client/apiClient";

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
  token: string | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (requiredRole: AdminRole) => boolean;
};

const roleLevel: Record<AdminRole, number> = { superadmin: 3, admin: 2, moderator: 1 };

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem("admin_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("admin_token") || null;
  });

  const login = async (email: string, password: string) => {
    try {
      // Since the frontend previously didn't distinguish roles in login form, we can try logging in as superadmin first, or we need to change backend to just return the user's actual role without requiring it in request. But backend schema requires role. We will try "superadmin" and if it fails with 403 we try "admin", then "moderator".
      const roles: AdminRole[] = ["superadmin", "admin", "moderator"];
      
      for (const role of roles) {
        try {
          const response = await authRepository.loginAdmin({ email, password, role });
          if (response && response.success) {
            setUser(response.user);
            setToken(response.token);
            localStorage.setItem("admin_user", JSON.stringify(response.user));
            localStorage.setItem("admin_token", response.token);
            return true;
          }
        } catch (err: any) {
          // If error is 403 or similar, we continue to the next role
          // If it's a 401 Invalid credentials, we could break early, but let's just let it fall through
          if (!err.message.includes("403")) {
             // Not a role mismatch, so break early
             break;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Login error", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_token");
  };

  const hasPermission = (requiredRole: AdminRole) => {
    if (!user) return false;
    return roleLevel[user.role] >= roleLevel[requiredRole];
  };

  return (
    <AdminContext.Provider value={{ user, token, isLoggedIn: !!user, login, logout, hasPermission }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};