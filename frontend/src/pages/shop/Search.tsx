import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { products } from "@/data/products";
import { ProductCard } from "@/components/shop/ProductCard";

const Search = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim().toLowerCase();

  const savedProducts = localStorage.getItem("products_data");
  let allProductsList = products;
  if (savedProducts) {
    try { allProductsList = JSON.parse(savedProducts); } catch (e) {}
  }

  const results = q
    ? allProductsList.filter((p: any) =>
        [p.name, p.brand, p.category, p.color, p.material, p.style].join(" ").toLowerCase().includes(q),
      )
    : [];
  return (
    <div className="container-page py-6">
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">{t("breadcrumb.home")}</Link> / <span className="text-foreground">{t("search.breadcrumb_search")}</span>
      </nav>
      <h1 className="text-3xl font-bold">{t("search.heading_results", { query: q })}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("search.count_results", { count: results.length })}</p>
      {results.length === 0 ? (
        <div className="mt-10 rounded-xl border bg-muted/30 p-10 text-center text-muted-foreground">
          {t("search.no_results")}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};
export default Search;