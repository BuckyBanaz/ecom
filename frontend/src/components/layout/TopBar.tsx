import { useTranslation } from "react-i18next";
import { Star, Truck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

/** Default announcement bar content when CMS header/footer has no topLeft/topRight. */
export function DefaultAnnouncementBar() {
  const { t } = useTranslation();

  return (
    <>
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/help" className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-primary">
            <Star size={14} className="fill-primary text-primary shrink-0" />
            <span>{t("topbar.reviews", { count: "15,000" })}</span>
          </Link>
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Truck size={14} className="text-primary shrink-0" />
            {t("topbar.delivery", { time: "22:00" })}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Calendar size={14} className="text-primary shrink-0" />
            {t("topbar.returns", { days: 30 })}
          </span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Link to="/help" className="hover:text-primary font-medium">{t("header.business")}</Link>
          <Link to="/help" className="hover:text-primary font-medium">{t("header.customer_service")}</Link>
        </div>
      </div>

      <div className="md:hidden w-full min-w-0 overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-6 pr-6">
          {[
            { type: "link" as const, label: t("topbar.reviews", { count: "15,000" }), href: "/help" },
            { type: "text" as const, label: t("topbar.delivery", { time: "22:00" }) },
            { type: "text" as const, label: t("topbar.returns", { days: 30 }) },
            { type: "link" as const, label: t("header.business"), href: "/help" },
            { type: "link" as const, label: t("header.customer_service"), href: "/help" },
            { type: "link" as const, label: t("topbar.reviews", { count: "15,000" }), href: "/help" },
            { type: "text" as const, label: t("topbar.delivery", { time: "22:00" }) },
            { type: "text" as const, label: t("topbar.returns", { days: 30 }) },
            { type: "link" as const, label: t("header.business"), href: "/help" },
            { type: "link" as const, label: t("header.customer_service"), href: "/help" },
          ].map((item, idx) =>
            item.type === "link" ? (
              <Link
                key={`mob-${item.label}-${idx}`}
                to={item.href}
                className="hover:text-primary font-medium whitespace-nowrap text-muted-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span key={`mob-${item.label}-${idx}`} className="font-medium whitespace-nowrap text-muted-foreground">
                {item.label}
              </span>
            ),
          )}
        </div>
      </div>
    </>
  );
}
