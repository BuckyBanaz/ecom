import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, Truck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export function TopBar() {
  const { t } = useTranslation();
  const [hasCmsTopBar, setHasCmsTopBar] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("header_footer_data");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const hasLeft = Array.isArray(parsed.topLeft) && parsed.topLeft.length > 0;
      const hasRight = Array.isArray(parsed.topRight) && parsed.topRight.length > 0;
      setHasCmsTopBar(hasLeft || hasRight);
    } catch {
      setHasCmsTopBar(false);
    }
  }, []);

  if (hasCmsTopBar) return null;

  return (
    <div className="hidden w-full min-w-0 border-b bg-topbar text-xs text-foreground md:block">
      <div className="container-page flex h-9 min-w-0 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/help" className="flex items-center gap-1.5 hover:text-primary">
            <Star size={14} className="fill-primary text-primary" />
            <span>{t("topbar.reviews", { count: "15,000" })}</span>
          </Link>
          <span className="flex items-center gap-1.5">
            <Truck size={14} className="text-primary" />
            {t("topbar.delivery", { time: "22:00" })}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-primary" />
            {t("topbar.returns", { days: 30 })}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/help" className="hover:text-primary">{t("header.business")}</Link>
          <Link to="/help" className="hover:text-primary">{t("header.customer_service")}</Link>
        </div>
      </div>
    </div>
  );
}