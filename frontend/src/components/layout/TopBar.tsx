import { useTranslation } from "react-i18next";
import { Star, Truck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { cmsHeaderFooterRepository } from "@/client/apiClient";
import { useCmsData } from "@/hooks/useCmsData";

/** Fallback announcement bar — hidden when CMS header/footer provides topLeft/topRight. */
export function TopBar() {
  const { t } = useTranslation();
  const { data: headerFooterData } = useCmsData("header_footer_data", () =>
    cmsHeaderFooterRepository.get(),
  );

  const topLeft = headerFooterData?.topLeft || [];
  const topRight = headerFooterData?.topRight || [];
  if (topLeft.length > 0 || topRight.length > 0) return null;

  return (
    <div className="hidden w-full min-w-0 border-b bg-topbar text-xs text-foreground notranslate md:block" translate="no">
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
