import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Search, Menu, X, Check, Settings, LogOut, User,
  Package, ShoppingCart, Users, LayoutDashboard, FolderTree,
  Tag, Sliders, Percent, Coins, Quote, HardDrive, FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";

// ─── Route → Page Title Map ──────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/products": "Products",
  "/admin/products/new": "New Product",
  "/admin/categories": "Categories",
  "/admin/brands": "Brands",
  "/admin/attributes": "Attributes",
  "/admin/offers": "Offers",
  "/admin/charges": "Charges",
  "/admin/testimonials": "Testimonials",
  "/admin/storage": "Media Library",
  "/admin/users": "Users",
  "/admin/settings": "Settings",
  "/admin/orders": "All Orders",
  "/admin/orders/invoices": "Invoices",
  "/admin/orders/labels": "Shipping Labels",
  "/admin/cms/homepage": "CMS — Homepage",
  "/admin/cms/header-footer": "CMS — Header & Footer",
  "/admin/cms/faqs": "CMS — FAQs",
  "/admin/cms/megamenu": "CMS — Mega Menu",
  "/admin/cms/relief": "CMS — Relief Page",
  "/admin/cms/blogs": "CMS — Blogs",
  "/admin/cms/seo": "CMS — SEO Settings",
  "/admin/cms/email-templates": "CMS — Email Templates",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.match(/^\/admin\/orders\/[^/]+$/)) return "Order Details";
  if (pathname.match(/^\/admin\/products\/[^/]+\/edit$/)) return "Edit Product";
  if (pathname.match(/^\/admin\/products\/[^/]+\/reviews$/)) return "Product Reviews";
  if (pathname.startsWith("/admin/cms/")) return "CMS";
  return "Admin";
}

// ─── Mock Notifications ───────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  {
    id: 1, read: false, icon: ShoppingCart, color: "text-emerald-600 bg-emerald-100",
    title: "New order received", body: "Jean Dupont placed order #INV-1001", time: "2 min ago",
    href: "/admin/orders",
  },
  {
    id: 2, read: false, icon: User, color: "text-blue-600 bg-blue-100",
    title: "New customer registered", body: "Sophie V. created an account", time: "15 min ago",
    href: "/admin/users",
  },
  {
    id: 3, read: true, icon: Package, color: "text-amber-600 bg-amber-100",
    title: "Low stock alert", body: "Vintage Amber Bulb — only 2 left", time: "1h ago",
    href: "/admin/products",
  },
  {
    id: 4, read: true, icon: Percent, color: "text-purple-600 bg-purple-100",
    title: "Coupon WELCOME20 used", body: "15 redemptions this week", time: "3h ago",
    href: "/admin/offers",
  },
];

// ─── Quick Search Links ───────────────────────────────────────────────────────
const SEARCH_LINKS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Products", icon: Package, href: "/admin/products" },
  { label: "New Product", icon: Package, href: "/admin/products/new" },
  { label: "Orders", icon: ShoppingCart, href: "/admin/orders" },
  { label: "Invoices", icon: FileText, href: "/admin/orders/invoices" },
  { label: "Shipping Labels", icon: Tag, href: "/admin/orders/labels" },
  { label: "Categories", icon: FolderTree, href: "/admin/categories" },
  { label: "Brands", icon: Tag, href: "/admin/brands" },
  { label: "Attributes", icon: Sliders, href: "/admin/attributes" },
  { label: "Offers", icon: Percent, href: "/admin/offers" },
  { label: "Charges", icon: Coins, href: "/admin/charges" },
  { label: "Testimonials", icon: Quote, href: "/admin/testimonials" },
  { label: "Media Library", icon: HardDrive, href: "/admin/storage" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAdmin();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const pageTitle = getPageTitle(pathname);

  // Search palette
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);

  // Close dropdowns on outside click
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cmd/Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  // Close panels on navigation
  useEffect(() => {
    setNotifOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const filteredLinks = searchQuery.trim()
    ? SEARCH_LINKS.filter((l) => l.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : SEARCH_LINKS;

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "SU";

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 gap-3 z-30">
        {/* Left — Hamburger (mobile) + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-8 w-8 md:hidden shrink-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="text-sm sm:text-base font-bold truncate text-foreground">
            {pageTitle}
          </h1>
        </div>

        {/* Center — Search trigger */}
        <div className="flex-1 max-w-xs sm:max-w-sm hidden sm:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Search pages…</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-[10px] font-mono border border-border">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right — Search (mobile), Notif, Profile */}
        <div className="flex items-center gap-1.5">
          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 sm:hidden"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
              className="h-8 w-8 relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold leading-none">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Notification Panel */}
            {notifOpen && (
              <div className="absolute right-0 top-10 w-80 rounded-2xl border border-border bg-white shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-bold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="divide-y max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((x) => x.id === n.id ? { ...x, read: true } : x)
                        );
                        navigate(n.href);
                      }}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", n.color)}>
                        <n.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold truncate", !n.read && "text-foreground")}>{n.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                      </div>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t px-4 py-2.5 text-center">
                  <button className="text-xs text-primary font-medium hover:underline">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-semibold truncate max-w-[100px]">{user?.name || "Admin"}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role || "admin"}</p>
              </div>
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-10 w-64 rounded-2xl border border-border bg-white shadow-2xl z-50 overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{user?.name || "Admin User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || "admin@store.com"}</p>
                      <span className="inline-block mt-1 text-[10px] capitalize font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {user?.role || "admin"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    onClick={() => navigate("/admin/settings")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => navigate("/admin/users")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Manage Users</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  </button>
                </div>

                <div className="border-t py-1.5">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Search Palette Overlay ─────────────────────────────────────────── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[10vh] px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, sections…"
                className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm p-0 h-auto bg-transparent"
              />
              <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto py-2">
              {filteredLinks.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">No results found</p>
              ) : (
                filteredLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => { navigate(link.href); setSearchOpen(false); setSearchQuery(""); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left",
                      pathname === link.href && "bg-primary/5 text-primary font-semibold"
                    )}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                      pathname === link.href ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <link.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1">{link.label}</span>
                    {pathname === link.href && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))
              )}
            </div>

            <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
              <span><kbd className="font-mono">↵</kbd> Open</span>
              <span><kbd className="font-mono">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
