import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAdmin } from "@/context/AdminContext";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  const { isLoggedIn } = useAdmin();
  useEffect(() => {
    document.body.classList.add("admin-lock");
    return () => document.body.classList.remove("admin-lock");
  }, []);
  if (!isLoggedIn) return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}