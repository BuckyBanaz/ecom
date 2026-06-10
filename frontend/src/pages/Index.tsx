import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { cmsHomepageRepository, productRepository, categoryRepository, blogRepository } from "@/client/apiClient";
import { HomepageSkeleton } from "@/components/ui/SkeletonLoader";
import { cacheKey, getCached } from "@/lib/apiCache";
import { ENDPOINTS } from "@/utils/endpoints";

const readHomepageCache = () => {
  const cached = getCached<any>(cacheKey("GET", ENDPOINTS.CMS_HOMEPAGE));
  return cached?.success && cached?.data?.content ? cached.data.content : "";
};

const readSupplementaryCache = () => {
  const pd: { products?: any[]; categories?: any[]; blogs?: any[] } = {};
  const prod = getCached<any>(cacheKey("GET", `${ENDPOINTS.PRODUCTS}?limit=40`));
  const cats = getCached<any>(cacheKey("GET", ENDPOINTS.CATEGORIES));
  const blogs = getCached<any>(cacheKey("GET", `${ENDPOINTS.BLOGS}?published=true`));
  if (prod?.success && prod.products) pd.products = prod.products;
  if (cats?.success && cats.categories) pd.categories = cats.categories;
  if (blogs?.success && blogs.blogs) pd.blogs = blogs.blogs;
  return pd;
};

const Index = () => {
  const { t } = useTranslation();
  const initialContent = readHomepageCache();
  const initialSupplementary = readSupplementaryCache();
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(!initialContent);
  const [prefetchedData, setPrefetchedData] = useState(initialSupplementary);

  useEffect(() => {
    let active = true;

    const fetchHomepage = async () => {
      if (!initialContent) setIsLoading(true);
      try {
        const res = await cmsHomepageRepository.get();
        if (!active) return;

        if (res.success && res.data?.content) {
          setContent(res.data.content);

          if (res.data.seoTitle) document.title = res.data.seoTitle;
          if (res.data.seoDesc) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
              metaDesc = document.createElement("meta");
              metaDesc.setAttribute("name", "description");
              document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute("content", res.data.seoDesc);
          }
          if (res.data.seoKeywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
              metaKeywords = document.createElement("meta");
              metaKeywords.setAttribute("name", "keywords");
              document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute("content", res.data.seoKeywords);
          }
        }
      } catch (error) {
        console.error("Failed to load homepage data", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const fetchSupplementaryData = async () => {
      try {
        const [prodRes, catRes, blogRes] = await Promise.all([
          productRepository.getAll({ limit: 40 }),
          categoryRepository.getAll(),
          blogRepository.getAll({ published: true }).catch(() => ({ success: false })),
        ]);
        if (!active) return;

        const pd: { products?: any[]; categories?: any[]; blogs?: any[] } = {};
        if (prodRes.success && prodRes.products) pd.products = prodRes.products;
        if (catRes.success && catRes.categories) pd.categories = catRes.categories;
        if (blogRes.success && blogRes.blogs) pd.blogs = blogRes.blogs;
        setPrefetchedData(pd);
      } catch (error) {
        console.error("Failed to load homepage supplementary data", error);
      }
    };

    fetchHomepage();
    fetchSupplementaryData();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return <HomepageSkeleton />;
  }

  return (
    <div>
      <ShortcodeRenderer content={content} prefetchedData={prefetchedData} />
      
   
    </div>
  );
};

export default Index;
