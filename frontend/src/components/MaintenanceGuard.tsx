import { useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { adminSettingsRepository } from "@/client/apiClient";
import MaintenancePage from "@/pages/MaintenancePage";

interface MaintenanceGuardProps {
  children: ReactNode;
}

interface MaintenanceStatus {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  storeName: string;
}

export const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await adminSettingsRepository.getMaintenanceStatus();
        if (cancelled) return;
        if (res?.success && res.data) {
          setStatus({
            maintenanceMode: !!res.data.maintenanceMode,
            maintenanceMessage: res.data.maintenanceMessage || "",
            storeName: res.data.storeName || "",
          });
        } else {
          setStatus({ maintenanceMode: false, maintenanceMessage: "", storeName: "" });
        }
      } catch (error) {
        // If status can't be fetched, fail open (don't block site)
        if (!cancelled) {
          setStatus({ maintenanceMode: false, maintenanceMessage: "", storeName: "" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStatus();
    // Re-check on route change so toggling from admin reflects immediately
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Admin routes always pass through so admins can toggle maintenance off
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (loading) {
    // Avoid flashing public content; render nothing briefly
    return null;
  }

  // Check if visitor is a logged-in admin
  const adminUserRaw = localStorage.getItem("admin_user");
  const adminToken = localStorage.getItem("admin_token");
  let isLoggedInAdmin = false;
  if (adminUserRaw && adminToken) {
    try {
      const parsed = JSON.parse(adminUserRaw);
      if (parsed && (parsed.role === "admin" || parsed.role === "superadmin")) {
        isLoggedInAdmin = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (status?.maintenanceMode && !isAdminRoute && !isLoggedInAdmin) {
    return (
      <MaintenancePage
        storeName={status.storeName}
        message={status.maintenanceMessage}
      />
    );
  }

  // Show preview banner to admins browsing public site during maintenance
  const showAdminBanner = status?.maintenanceMode && !isAdminRoute && isLoggedInAdmin;

  return (
    <>
      {showAdminBanner && (
        <div className="sticky top-0 z-[100] w-full bg-amber-500 text-amber-950 text-center text-xs sm:text-sm font-medium py-1.5 px-3 shadow-md">
          ⚠️ <strong>Maintenance Mode is ON</strong> — Public visitors see the maintenance page. You can browse because you are logged in as admin.
          {" "}
          <a href="/admin/settings?tab=general" className="underline hover:no-underline ml-1">
            Disable in Settings
          </a>
        </div>
      )}
      {children}
    </>
  );
};

export default MaintenanceGuard;
