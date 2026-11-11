import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { ProductTranslationsBar } from "@/components/admin/ProductTranslationsBar";
import { ContentTranslationsCard } from "@/components/admin/ContentTranslationsCard";

/** CMS → Translations: AI translation status of products and all site content */
export default function AdminTranslations() {
  const { t } = useTranslation();
  const { hasPermission } = useAdmin();
  if (!hasPermission("cms") && !hasPermission("products")) {
    return <p className="text-center py-12 text-muted-foreground">{t("admin_product_form.no_permission")}</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Languages className="h-6 w-6" />
          {t("admin_translations.page_title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin_translations.page_subtitle")}</p>
      </div>
      {hasPermission("products") && <ProductTranslationsBar />}
      {hasPermission("cms") && <ContentTranslationsCard />}
    </div>
  );
}
