import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { cmsHomepageRepository, productRepository, categoryRepository, blogRepository } from "@/client/apiClient";
import { HomepageSkeleton } from "@/components/ui/SkeletonLoader";

const Index = () => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [prefetchedData, setPrefetchedData] = useState<{products?: any[], categories?: any[], blogs?: any[]}>({});

  useEffect(() => {
    const fetchHomepage = async () => {
      setIsLoading(true);
      try {
        const [res, prodRes, catRes, blogRes] = await Promise.all([
          cmsHomepageRepository.get(),
          productRepository.getAll({ limit: 40 }),
          categoryRepository.getAll(),
          blogRepository.getAll({ published: true }).catch(() => ({ success: false }))
        ]);

        if (res.success && res.data && res.data.content) {
          setContent(res.data.content);
          
          if (res.data.seoTitle) document.title = res.data.seoTitle;
          if (res.data.seoDesc) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
              metaDesc = document.createElement('meta');
              metaDesc.setAttribute('name', 'description');
              document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', res.data.seoDesc);
          }
          if (res.data.seoKeywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
              metaKeywords = document.createElement('meta');
              metaKeywords.setAttribute('name', 'keywords');
              document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute('content', res.data.seoKeywords);
          }
        }

        const pd: any = {};
        if (prodRes.success && prodRes.products) pd.products = prodRes.products;
        if (catRes.success && catRes.categories) pd.categories = catRes.categories;
        if (blogRes.success && blogRes.blogs) pd.blogs = blogRes.blogs;
        setPrefetchedData(pd);

      } catch (error) {
        console.error("Failed to load homepage data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomepage();
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
