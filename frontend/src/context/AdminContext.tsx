import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { authRepository } from "../client/apiClient";

export type AdminRole = "superadmin" | "admin" | "moderator";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  permissions?: string[];
};

type AdminContextType = {
  user: AdminUser | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permissionOrRole: string) => boolean;
};

const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  superadmin: [
    "dashboard", "products", "categories", "brands", "attributes", 
    "orders", "offers", "charges", "reviews", "testimonials", 
    "storage", "users", "manage_users", "cms", "email_templates", "settings"
  ],
  admin: [
    "dashboard", "products", "categories", "brands", "attributes", 
    "orders", "offers", "charges", "reviews", "testimonials", 
    "storage", "users", "email_templates"
  ],
  moderator: [
    "dashboard", "products", "orders", "reviews", "testimonials"
  ]
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem("admin_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("admin_token") || null;
  });

  useEffect(() => {
    if (token) {
      authRepository.getProfile().then(res => {
        if (res.success && res.data) {
          const updated = {
            id: res.data.id,
            name: res.data.name,
            email: res.data.email,
            role: res.data.role,
            avatar: res.data.avatar,
            permissions: res.data.permissions || []
          };
          setUser(updated);
          localStorage.setItem("admin_user", JSON.stringify(updated));
        }
      }).catch(err => console.warn("Failed to sync admin profile", err));
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
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
          if (!err.message.includes("403")) {
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

  const hasPermission = (permissionOrRole: string) => {
    if (!user) return false;
    
    // Check if checking role level
    const roleLevel: Record<string, number> = { superadmin: 3, admin: 2, moderator: 1 };
    const level = roleLevel[permissionOrRole] || 0;
    if (level > 0) {
      return roleLevel[user.role] >= level;
    }

    // Check specific permission key
    const permissions = user.permissions && user.permissions.length > 0
      ? user.permissions
      : DEFAULT_ROLE_PERMISSIONS[user.role] || [];
      
    return permissions.includes(permissionOrRole);
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