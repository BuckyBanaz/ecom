import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Settings,
  FileText, LogOut, Shield, ChevronLeft, ChevronRight, ChevronDown,
  Home, ScrollText, FileCode, Newspaper, Search, Tag, Sliders, Quote, HardDrive, Mail,
  Percent, Coins, Truck, ArrowRight, CheckCircle, RotateCcw
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", permission: "dashboard" },
  { to: "/admin/products", icon: Package, label: "Products", permission: "products" },
  { to: "/admin/categories", icon: FolderTree, label: "Categories", permission: "categories" },
  { to: "/admin/brands", icon: Tag, label: "Brands", permission: "brands" },
  { to: "/admin/attributes", icon: Sliders, label: "Attributes", permission: "attributes" },
  { to: "/admin/offers", icon: Percent, label: "Offers", permission: "offers" },
  { to: "/admin/charges", icon: Coins, label: "Charges", permission: "charges" },
  { to: "/admin/testimonials", icon: Quote, label: "Testimonials", permission: "testimonials" },
  { to: "/admin/storage", icon: HardDrive, label: "Storage", permission: "storage" },
  { to: "/admin/users", icon: Users, label: "Users", permission: "users" },
  { to: "/admin/settings", icon: Settings, label: "Settings", permission: "settings" },
];

const ordersChildren = [
  { to: "/admin/orders", icon: ShoppingCart, label: "All Orders" },
  { to: "/admin/orders/ready-to-ship", icon: Truck, label: "Ready To Ship" },
  { to: "/admin/orders/in-transit", icon: ArrowRight, label: "In Transit" },
  { to: "/admin/orders/delivered", icon: CheckCircle, label: "Delivered" },
  { to: "/admin/orders/returns", icon: RotateCcw, label: "Returns" },
  { to: "/admin/orders/labels", icon: Tag, label: "Shipping Labels" }
];

const cmsChildren = [
  { to: "/admin/cms/homepage", icon: Home, label: "Homepage" },
  { to: "/admin/cms/header-footer", icon: FileText, label: "Header & Footer" },
  { to: "/admin/cms/faqs", icon: FileText, label: "FAQs" },
  { to: "/admin/cms/megamenu", icon: FolderTree, label: "Mega Menu" },
  { to: "/admin/cms/relief", icon: FileText, label: "Relief Page" },
  { to: "/admin/cms/privacy-policy", icon: ScrollText, label: "Privacy Policy" },
  { to: "/admin/cms/terms-conditions", icon: ScrollText, label: "Terms & Conditions" },
  { to: "/admin/cms/pages", icon: FileCode, label: "Dynamic Pages" },
  { to: "/admin/cms/blogs", icon: Newspaper, label: "Blogs" },
  { to: "/admin/cms/email-templates", icon: Mail, label: "Email Templates" },
  { to: "/admin/cms/seo", icon: Search, label: "SEO Settings" },
];

export function AdminSidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const { user, logout, hasPermission } = useAdmin();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [cmsOpen, setCmsOpen] = useState(pathname.startsWith("/admin/cms"));
  const [ordersOpen, setOrdersOpen] = useState(pathname.startsWith("/admin/orders"));

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "flex h-screen flex-col border-r bg-white text-sidebar-foreground transition-all duration-300 z-50 shrink-0",
        // Desktop width
        collapsed ? "md:w-16" : "md:w-64",
        // Mobile layout & absolute drawer behaviour
        "fixed md:static left-0 top-0 bottom-0",
        mobileOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">Admin</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto h-8 w-8 hidden md:inline-flex">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          {/* Mobile Close Button */}
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="ml-auto h-8 w-8 md:hidden">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.filter((item) => hasPermission(item.permission)).slice(0, 2).map((item) => {
          const isActive = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Orders group */}
        {hasPermission("orders") && (
          <div>
            <button
              type="button"
              onClick={() => setOrdersOpen((v) => !v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/admin/orders")
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <ShoppingCart className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Orders</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", ordersOpen ? "rotate-0" : "-rotate-90")} />
                </>
              )}
            </button>
            {ordersOpen && !collapsed && (
              <div className="mt-1 ml-3 space-y-1 border-l pl-3">
                {ordersChildren.map((c) => {
                  const isActive = pathname === c.to;
                  return (
                    <NavLink
                      key={c.to}
                      to={c.to}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <c.icon className="h-4 w-4 shrink-0" />
                      <span>{c.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CMS group */}
        {hasPermission("cms") && (
          <div>
            <button
              type="button"
              onClick={() => setCmsOpen((v) => !v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/admin/cms")
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <FileText className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">CMS</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", cmsOpen ? "rotate-0" : "-rotate-90")} />
                </>
              )}
            </button>
            {cmsOpen && !collapsed && (
              <div className="mt-1 ml-3 space-y-1 border-l pl-3">
                {cmsChildren.map((c) => {
                  const isActive = pathname === c.to;
                  return (
                    <NavLink
                      key={c.to}
                      to={c.to}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <c.icon className="h-4 w-4 shrink-0" />
                      <span>{c.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {navItems.filter((item) => hasPermission(item.permission)).slice(2).map((item) => {
          const isActive = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t p-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        )}
        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={logout} className="w-full justify-start gap-2 text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </aside>
    </>
  );
}