import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categoryRepository } from "@/client/apiClient";
import { categories as fallbackCategories } from "@/data/categories";
import { SafeImage } from "@/components/ui/SafeImage";
import { SectionLoader } from "@/components/ui/PageLoader";

export default function AllCategories() {
  const { t } = useTranslation();
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryRepository.getAll();
        if (res.success && res.categories) {
          setCategoriesList(res.categories);
        } else {
          const saved = localStorage.getItem("categories_data");
          if (saved) {
            setCategoriesList(JSON.parse(saved));
          } else {
            setCategoriesList(fallbackCategories);
          }
        }
      } catch (err) {
        setCategoriesList(fallbackCategories);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="container-page py-6 md:py-12 animate-fade-in">
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors">{t("breadcrumb.home")}</Link> /{" "}
        <span className="text-foreground font-medium">{t("category.categories", { defaultValue: "Categories" })}</span>
      </nav>
      <h1 className="text-3xl font-bold md:text-4xl mb-8">{t("category.all_categories", { defaultValue: "All Categories" })}</h1>
      
      {loading ? (
        <SectionLoader />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {categoriesList.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="group relative overflow-hidden rounded-xl bg-muted aspect-square border shadow-sm transition-all hover:shadow-md hover:border-primary/30">
              <div className="absolute inset-0">
                <SafeImage src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" fallbackType="category" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm text-center drop-shadow-md">{c.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
