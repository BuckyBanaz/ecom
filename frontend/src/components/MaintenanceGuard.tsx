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

const readCachedMaintenanceStatus = (): MaintenanceStatus => {
  try {
    const raw = localStorage.getItem("maintenance_status");
    if (!raw) return { maintenanceMode: false, maintenanceMessage: "", storeName: "" };
    const parsed = JSON.parse(raw);
    return {
      maintenanceMode: !!parsed.maintenanceMode,
      maintenanceMessage: parsed.maintenanceMessage || "",
      storeName: parsed.storeName || "",
    };
  } catch {
    return { maintenanceMode: false, maintenanceMessage: "", storeName: "" };
  }
};

export const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const [status, setStatus] = useState<MaintenanceStatus>(readCachedMaintenanceStatus);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await adminSettingsRepository.getMaintenanceStatus();
        if (cancelled) return;
        const nextStatus: MaintenanceStatus = res?.success && res.data
          ? {
              maintenanceMode: !!res.data.maintenanceMode,
              maintenanceMessage: res.data.maintenanceMessage || "",
              storeName: res.data.storeName || "",
            }
          : { maintenanceMode: false, maintenanceMessage: "", storeName: "" };
        setStatus(nextStatus);
        localStorage.setItem("maintenance_status", JSON.stringify(nextStatus));
      } catch {
        if (!cancelled) {
          setStatus({ maintenanceMode: false, maintenanceMessage: "", storeName: "" });
        }
      }
    };
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const isAdminRoute = location.pathname.startsWith("/admin");

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
