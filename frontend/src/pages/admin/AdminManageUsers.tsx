import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldAlert, ShieldCheck, Shield, Plus, X, Loader2,
  Check, Lock, Unlock, Users, Package, ShoppingCart,
  LayoutDashboard, FolderTree, Tag, Sliders, Percent,
  Coins, MessageSquare, HardDrive, Settings,
  Globe, Star, Mail, Calendar, Trash, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAdmin } from "@/context/AdminContext";
import { authRepository } from "@/client/apiClient";
import { cn } from "@/lib/utils";

/* ─── Permission Definitions ──────────────────────────────────────────────── */
const ALL_PERMISSIONS = [
  { key: "dashboard",      label: "Dashboard",         icon: LayoutDashboard },
  { key: "products",       label: "Products",          icon: Package },
  { key: "categories",     label: "Categories",        icon: FolderTree },
  { key: "brands",         label: "Brands",            icon: Tag },
  { key: "attributes",     label: "Attributes",        icon: Sliders },
  { key: "orders",         label: "Orders",            icon: ShoppingCart },
  { key: "offers",         label: "Offers / Coupons",  icon: Percent },
  { key: "charges",        label: "Charges",           icon: Coins },
  { key: "reviews",        label: "Reviews",           icon: Star },
  { key: "testimonials",   label: "Testimonials",      icon: MessageSquare },
  { key: "storage",        label: "Media Library",     icon: HardDrive },
  { key: "users",          label: "Customers",         icon: Users },
  { key: "manage_users",   label: "Admin Users",       icon: ShieldCheck },
  { key: "cms",            label: "CMS Pages",         icon: Globe },
  { key: "email_templates",label: "Email Templates",   icon: Mail },
  { key: "settings",       label: "Settings",          icon: Settings },
];

/* ─── Role Presets ─────────────────────────────────────────────────────────── */
const ROLE_PRESETS: Record<string, {
  label: string; icon: any; color: string;
  badgeColor: string; permissions: string[]; description: string;
}> = {
  superadmin: {
    label: "Super Admin", icon: ShieldAlert,
    color: "text-red-600 bg-red-50 border-red-200",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    permissions: ALL_PERMISSIONS.map(p => p.key),
    description: "Full unrestricted access to every section. Use with caution.",
  },
  admin: {
    label: "Admin", icon: ShieldCheck,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    permissions: ["dashboard","products","categories","brands","attributes","orders","offers","charges","reviews","testimonials","storage","users","email_templates"],
    description: "All operational areas. Cannot manage admin accounts or settings.",
  },
  moderator: {
    label: "Moderator", icon: Shield,
    color: "text-green-600 bg-green-50 border-green-200",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    permissions: ["dashboard","products","orders","reviews","testimonials"],
    description: "Limited to product, order and review management only.",
  },
};

const RoleIcon = ({ role }: { role: string }) => {
  if (role === "superadmin") return <ShieldAlert className="h-3.5 w-3.5 text-red-600" />;
  if (role === "admin")      return <ShieldCheck  className="h-3.5 w-3.5 text-blue-600" />;
  return                            <Shield       className="h-3.5 w-3.5 text-green-600" />;
};

/* ─── Component ────────────────────────────────────────────────────────────── */
const AdminManageUsers = () => {
  const { t } = useTranslation();
  const { hasPermission, user } = useAdmin();
  const [adminsList,        setAdminsList]        = useState<any[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [openModal,         setOpenModal]         = useState(false);
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [selectedRole,      setSelectedRole]      = useState<"superadmin"|"admin"|"moderator">("admin");
  const [customPermissions, setCustomPermissions] = useState<string[]>(ROLE_PRESETS.admin.permissions);
  const [form,              setForm]              = useState({ email: "", password: "" });

  const [editingAdmin,      setEditingAdmin]      = useState<any | null>(null);
  const [editForm,          setEditForm]          = useState({ name: "", email: "", role: "admin", permissions: [] as string[] });

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await authRepository.getAdmins();
      if (res.success) {
        setAdminsList(res.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load admin users:", err);
      toast.error(err.message || "Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDeleteAdmin = async (id: string) => {
    if (!window.confirm(t("admin_manage_users.confirm_delete"))) return;
    try {
      const res = await authRepository.deleteAdmin(id);
      if (res.success) {
        toast.success(t("admin_manage_users.toast_deleted"));
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_manage_users.toast_failed_delete"));
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      const res = await authRepository.updateAdminRole(id, role);
      if (res.success) {
        toast.success(t("admin_manage_users.toast_role_updated"));
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_manage_users.toast_failed_update"));
    }
  };

  const handleToggleSuspend = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const confirmMsg = currentStatus === "suspended"
      ? t("admin_manage_users.confirm_unsuspend")
      : t("admin_manage_users.confirm_suspend");
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await authRepository.updateAdmin(id, { status: newStatus });
      if (res.success) {
        toast.success(newStatus === "suspended" ? t("admin_manage_users.toast_suspended") : t("admin_manage_users.toast_activated"));
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_manage_users.toast_failed_update_status"));
    }
  };

  const handleEditAdminClick = (admin: any) => {
    setEditingAdmin(admin);
    const defaultRolePerms = ROLE_PRESETS[admin.role || "admin"]?.permissions || [];
    setEditForm({
      name: admin.name || "",
      email: admin.email || "",
      role: admin.role || "admin",
      permissions: admin.permissions && admin.permissions.length > 0
        ? admin.permissions
        : defaultRolePerms
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsSubmitting(true);
    try {
      const res = await authRepository.updateAdmin(editingAdmin.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        permissions: editForm.permissions
      });
      if (res.success) {
        toast.success(t("admin_manage_users.toast_updated"));
        setEditingAdmin(null);
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_manage_users.toast_failed_create"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (role: "superadmin"|"admin"|"moderator") => {
    setSelectedRole(role);
    setCustomPermissions(ROLE_PRESETS[role].permissions);
  };

  const togglePermission = (key: string) =>
    setCustomPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error("Please fill in email and password"); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:5000/api/v1/auth/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({ email: form.email, password: form.password, role: selectedRole, permissions: customPermissions }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${ROLE_PRESETS[selectedRole].label} account created!`);
        setOpenModal(false);
        setForm({ email: "", password: "" });
        setSelectedRole("admin");
        setCustomPermissions(ROLE_PRESETS.admin.permissions);
        fetchAdmins(); // Refresh admin list
      } else {
        toast.error(data.message || "Failed to create admin account");
      }
    } catch (err: any) {
      toast.error(err.message || "Error creating admin account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const preset = ROLE_PRESETS[selectedRole];

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t("admin_manage_users.title")}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {t("admin_manage_users.subtitle")}
          </p>
        </div>
        {user?.role === "superadmin" && (
          <Button
            onClick={() => setOpenCreateModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-2 shadow-sm self-start sm:self-auto shrink-0"
          >
            <Plus className="h-4 w-4" /> {t("admin_manage_users.button_add")}
          </Button>
        )}
      </div>

      {/* ── Role Overview Cards ──────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-1 xs:grid-cols-3 sm:grid-cols-3">
        {Object.entries(ROLE_PRESETS).map(([key, p]) => {
          const Icon  = p.icon;
          const count = adminsList.filter(u => u.role === key).length;
          return (
            <div key={key} className={`rounded-2xl border p-4 sm:p-5 ${p.color} flex flex-col gap-1.5`}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="font-bold text-xs sm:text-sm">{p.label}</span>
              </div>
              <p className="text-[11px] sm:text-xs opacity-70 leading-relaxed hidden sm:block">
                {p.description}
              </p>
              <div className="font-extrabold text-2xl sm:text-2xl mt-auto">{count}</div>
              <p className="text-[10px] sm:text-xs opacity-60 font-medium">{t("admin_manage_users.stats_active")}</p>
            </div>
          );
        })}
      </div>

      {/* ── Admin Accounts — Desktop Table ──────────────────────────────────── */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-bold text-sm sm:text-base text-foreground">{t("admin_manage_users.section_accounts")}</h2>
          <span className="text-xs text-muted-foreground font-medium">{adminsList.length} {t("admin_manage_users.no_accounts")}</span>
        </div>

        {loading ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : adminsList.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            {t("admin_manage_users.no_accounts")}
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="divide-y sm:hidden">
              {adminsList.map(admin => (
                <div key={admin.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground uppercase shrink-0">
                      {(admin.name || admin.email).slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-bold text-sm text-foreground truncate">{admin.name || "Admin"}</p>
                      <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold capitalize px-2 py-0.5 rounded-full border ${
                          admin.role === "superadmin" ? "bg-red-50 text-red-700 border-red-200" :
                          admin.role === "admin"      ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                       "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          <RoleIcon role={admin.role} /> {admin.role}
                        </span>
                        {admin.status === "suspended" && (
                          <span className="inline-flex items-center text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200">
                            Suspended
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </span>
                      </div>
                      {/* Mini permission chips */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(admin.permissions && admin.permissions.length > 0 ? admin.permissions : ROLE_PRESETS[admin.role]?.permissions || [])?.slice(0, 3).map(p => {
                          const perm = ALL_PERMISSIONS.find(x => x.key === p);
                          if (!perm) return null;
                          const PIcon = perm.icon;
                          return (
                            <span key={p} className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                              <PIcon className="h-2.5 w-2.5" /> {perm.label}
                            </span>
                          );
                        })}
                        {(admin.permissions && admin.permissions.length > 0 ? admin.permissions : ROLE_PRESETS[admin.role]?.permissions || [])?.length > 3 && (
                          <span className="text-[9px] font-bold text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                            +{(admin.permissions && admin.permissions.length > 0 ? admin.permissions : ROLE_PRESETS[admin.role]?.permissions || []).length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasPermission("superadmin") && admin.id !== useAdmin().user?.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 w-8 rounded-full"
                          onClick={() => handleEditAdminClick(admin)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 rounded-full",
                            admin.status === "suspended" ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                          )}
                          onClick={() => handleToggleSuspend(admin.id, admin.status)}
                        >
                          {admin.status === "suspended" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Permissions</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Created</th>
                    {hasPermission("superadmin") && <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/50">
                  {adminsList.map(admin => (
                    <tr key={admin.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground uppercase shrink-0">
                            {(admin.name || admin.email).slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{admin.name || "Admin"}</p>
                            <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {hasPermission("superadmin") && admin.id !== useAdmin().user?.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={admin.role}
                              onChange={(e) => handleUpdateRole(admin.id, e.target.value)}
                              className={`text-xs font-bold capitalize px-2.5 py-1 rounded-full border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500`}
                            >
                              <option value="superadmin">Super Admin</option>
                              <option value="admin">Admin</option>
                              <option value="moderator">Moderator</option>
                            </select>
                            {admin.status === "suspended" && (
                              <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200">
                                Suspended
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <RoleIcon role={admin.role} />
                            <span className={`text-xs font-bold capitalize px-2.5 py-0.5 rounded-full border ${ROLE_PRESETS[admin.role]?.badgeColor || "bg-gray-100 text-gray-700"}`}>
                              {admin.role}
                            </span>
                            {admin.status === "suspended" && (
                              <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200">
                                Suspended
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {(admin.permissions && admin.permissions.length > 0 ? admin.permissions : ROLE_PRESETS[admin.role]?.permissions || [])?.slice(0, 4).map(p => {
                            const perm = ALL_PERMISSIONS.find(x => x.key === p);
                            if (!perm) return null;
                            const PIcon = perm.icon;
                            return (
                              <span key={p} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-muted text-muted-foreground rounded-md px-1.5 py-0.5">
                                <PIcon className="h-3 w-3" /> {perm.label}
                              </span>
                            );
                          })}
                          {(admin.permissions && admin.permissions.length > 0 ? admin.permissions : ROLE_PRESETS[admin.role]?.permissions || [])?.length > 4 && (
                            <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 bg-muted rounded-md">
                              +{(admin.permissions && admin.permissions.length > 0 ? admin.permissions : ROLE_PRESETS[admin.role]?.permissions || []).length - 4} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground font-medium text-xs whitespace-nowrap animate-none">
                        {new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </td>
                      {hasPermission("superadmin") && (
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {admin.id !== useAdmin().user?.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 w-8 rounded-full"
                                onClick={() => handleEditAdminClick(admin)}
                                title="Edit Admin"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 rounded-full",
                                  admin.status === "suspended" ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                )}
                                onClick={() => handleToggleSuspend(admin.id, admin.status)}
                                title={admin.status === "suspended" ? "Unsuspend Admin" : "Suspend Admin"}
                              >
                                {admin.status === "suspended" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                title="Delete Admin"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium italic pr-2">Your Account</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Create Admin Modal ───────────────────────────────────────────────── */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden">
          {/* Bottom sheet on mobile, centered dialog on sm+ */}
          <div
            className="
              bg-card w-full max-h-[92dvh] overflow-y-auto
              rounded-t-3xl sm:rounded-2xl
              border border-border shadow-2xl
              sm:max-w-2xl sm:my-4
              relative
            "
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                  Create Admin Account
                </h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Select a role and customize access permissions.
                </p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="px-5 sm:px-6 py-5 space-y-6">

                {/* Credentials */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Email Address *</label>
                    <Input required type="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="newadmin@store.com"
                      className="focus-visible:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Password *</label>
                    <Input required type="password" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-2">Select Role</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {(Object.entries(ROLE_PRESETS) as [string, typeof ROLE_PRESETS[keyof typeof ROLE_PRESETS]][]).map(([key, p]) => {
                      const Icon = p.icon;
                      const isSelected = selectedRole === key;
                      return (
                        <button
                          key={key} type="button"
                          onClick={() => handleRoleSelect(key as "superadmin"|"admin"|"moderator")}
                          className={`relative rounded-xl border-2 p-2.5 sm:p-3 text-left transition-all ${
                            isSelected ? "border-amber-500 bg-amber-500/5 shadow-sm" : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-1.5 ${
                            key === "superadmin" ? "text-red-600" :
                            key === "admin"      ? "text-blue-600" : "text-green-600"
                          }`} />
                          <p className="font-bold text-[10px] sm:text-xs text-foreground leading-tight">{p.label}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 italic">{preset.description}</p>
                </div>

                {/* Permission Toggles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-muted-foreground">Access Permissions</label>
                    <div className="flex gap-2.5">
                      <button type="button"
                        onClick={() => setCustomPermissions(ALL_PERMISSIONS.map(p => p.key))}
                        className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <Unlock className="h-3 w-3" /> Grant All
                      </button>
                      <button type="button"
                        onClick={() => setCustomPermissions([])}
                        className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" /> Revoke All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {ALL_PERMISSIONS.map(perm => {
                      const granted = customPermissions.includes(perm.key);
                      const PIcon   = perm.icon;
                      return (
                        <button
                          key={perm.key} type="button"
                          onClick={() => togglePermission(perm.key)}
                          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] sm:text-xs font-semibold transition-all ${
                            granted
                              ? "border-amber-500 bg-amber-500/10 text-amber-800"
                              : "border-muted text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                        >
                          <PIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                          <span className="truncate">{perm.label}</span>
                          {granted && <Check className="h-3 w-3 ml-auto text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    <strong>{customPermissions.length}</strong> of {ALL_PERMISSIONS.length} permissions granted
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-6 py-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 bg-muted/20">
                <Button type="button" variant="outline"
                  onClick={() => setOpenModal(false)}
                  className="rounded-xl font-bold w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm w-full sm:w-auto sm:min-w-[140px]"
                >
                  {isSubmitting
                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    : <><Plus className="h-4 w-4 mr-1.5" /> Create Account</>
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Admin Modal ───────────────────────────────────────────────── */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden">
          <div
            className="
              bg-card w-full max-h-[92dvh] overflow-y-auto
              rounded-t-3xl sm:rounded-2xl
              border border-border shadow-2xl
              sm:max-w-2xl sm:my-4
              relative
            "
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                  Edit Admin Account
                </h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Update account details for {editingAdmin.name || editingAdmin.email}
                </p>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="px-5 sm:px-6 py-5 space-y-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Full Name</label>
                    <Input type="text" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="John Doe"
                      className="focus-visible:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Email Address *</label>
                    <Input required type="email" value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="admin@store.com"
                      className="focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setEditForm({ 
                        ...editForm, 
                        role: newRole,
                        permissions: ROLE_PRESETS[newRole]?.permissions || []
                      });
                    }}
                    className="w-full text-sm rounded-xl border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="superadmin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>

                {/* Edit Permission Toggles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-muted-foreground">Access Permissions</label>
                    <div className="flex gap-2.5">
                      <button type="button"
                        onClick={() => setEditForm({ ...editForm, permissions: ALL_PERMISSIONS.map(p => p.key) })}
                        className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <Unlock className="h-3 w-3" /> Grant All
                      </button>
                      <button type="button"
                        onClick={() => setEditForm({ ...editForm, permissions: [] })}
                        className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" /> Revoke All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {ALL_PERMISSIONS.map(perm => {
                      const granted = editForm.permissions.includes(perm.key);
                      const PIcon   = perm.icon;
                      return (
                        <button
                          key={perm.key} type="button"
                          onClick={() => {
                            const updated = editForm.permissions.includes(perm.key)
                              ? editForm.permissions.filter(p => p !== perm.key)
                              : [...editForm.permissions, perm.key];
                            setEditForm({ ...editForm, permissions: updated });
                          }}
                          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] sm:text-xs font-semibold transition-all ${
                            granted
                              ? "border-amber-500 bg-amber-500/10 text-amber-800"
                              : "border-muted text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                        >
                          <PIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                          <span className="truncate">{perm.label}</span>
                          {granted && <Check className="h-3 w-3 ml-auto text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    <strong>{editForm.permissions.length}</strong> of {ALL_PERMISSIONS.length} permissions granted
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-6 py-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 bg-muted/20">
                <Button type="button" variant="outline"
                  onClick={() => setEditingAdmin(null)}
                  className="rounded-xl font-bold w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm w-full sm:w-auto sm:min-w-[140px]"
                >
                  {isSubmitting
                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    : "Save Changes"
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManageUsers;
