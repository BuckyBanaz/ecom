import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Navigate } from "react-router-dom";
import { useAdmin } from "@/context/AdminContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useFcmToken } from "@/hooks/useFcmToken";

export function AdminLayout() {
  const { t } = useTranslation();
  const { isLoggedIn, logout } = useAdmin();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionMessage, setSuspensionMessage] = useState("");

  // Initialize FCM token registration
  useFcmToken();

  useEffect(() => {
    document.body.classList.add("admin-lock");
    return () => document.body.classList.remove("admin-lock");
  }, []);

  useEffect(() => {
    const handleSuspension = (e: Event) => {
      const message = (e as CustomEvent).detail || "Your account has been suspended.";
      setSuspensionMessage(message);
      setIsSuspended(true);
    };

    window.addEventListener("admin-suspended", handleSuspension);
    return () => {
      window.removeEventListener("admin-suspended", handleSuspension);
    };
  }, []);

  if (!isLoggedIn) return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar drawer for mobile & desktop */}
      <AdminSidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin Header — shown on all screen sizes */}
        <AdminHeader onMenuClick={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Centered Suspension Dialog */}
      <AlertDialog open={isSuspended} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-destructive">Account Suspended</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm text-foreground/85 leading-relaxed">
              {suspensionMessage || "Your administrator account has been suspended by a super administrator."}
              <span className="font-semibold mt-3 block text-muted-foreground">Please contact the system administrator for assistance.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction 
              onClick={() => logout()}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl px-5"
            >
              Okay, Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminLayout;
