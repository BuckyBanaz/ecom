import { useState, useEffect } from "react";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { cmsHomepageRepository, productRepository, categoryRepository, blogRepository } from "@/client/apiClient";
import { readCachedHomepage, writeCachedHomepage, detectShortcodeBlocks } from "@/utils/cmsLocalStorage";

const applyHomepageSeo = (data: { seoTitle?: string; seoDesc?: string; seoKeywords?: string }) => {
  if (data.seoTitle) document.title = data.seoTitle;
  if (data.seoDesc) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", data.seoDesc);
  }
  if (data.seoKeywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", data.seoKeywords);
  }
};

const Index = () => {
  const cached = readCachedHomepage();
  const [content, setContent] = useState(cached?.content || "");
  const [prefetchedData, setPrefetchedData] = useState<{
    products?: any[];
    categories?: any[];
    blogs?: any[];
  }>({});

  useEffect(() => {
    if (cached) applyHomepageSeo(cached);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchHomepage = async () => {
      try {
        const res = await cmsHomepageRepository.get();
        if (!active || !res.success || !res.data?.content) return;

        setContent(res.data.content);
        writeCachedHomepage({
          content: res.data.content,
          seoTitle: res.data.seoTitle,
          seoDesc: res.data.seoDesc,
          seoKeywords: res.data.seoKeywords,
        });
        applyHomepageSeo(res.data);
      } catch (error) {
        console.error("Failed to load homepage data", error);
      }
    };

    fetchHomepage();
    return () => {
      active = false;
    };
  }, []);

  // Only fetch shortcode data when the homepage actually uses shortcodes
  useEffect(() => {
    const blocks = detectShortcodeBlocks(content);
    const needsProducts = blocks.has("product-block");
    const needsCategories = blocks.has("category-block") || blocks.has("menu-category");
    const needsBlogs = blocks.has("blogs-block");

    if (!needsProducts && !needsCategories && !needsBlogs) return;

    let active = true;
    const fetchSupplementaryData = async () => {
      try {
        const tasks: Promise<any>[] = [];
        if (needsProducts) tasks.push(productRepository.getAll({ limit: 40 }));
        if (needsCategories) tasks.push(categoryRepository.getAll());
        if (needsBlogs) tasks.push(blogRepository.getAll({ published: true }).catch(() => ({ success: false })));

        const results = await Promise.all(tasks);
        if (!active) return;

        const pd: { products?: any[]; categories?: any[]; blogs?: any[] } = {};
        let i = 0;
        if (needsProducts) {
          const prodRes = results[i++];
          if (prodRes?.success && prodRes.products) pd.products = prodRes.products;
        }
        if (needsCategories) {
          const catRes = results[i++];
          if (catRes?.success && catRes.categories) pd.categories = catRes.categories;
        }
        if (needsBlogs) {
          const blogRes = results[i++];
          if (blogRes?.success && blogRes.blogs) pd.blogs = blogRes.blogs;
        }
        setPrefetchedData(pd);
      } catch (error) {
        console.error("Failed to load homepage supplementary data", error);
      }
    };

    fetchSupplementaryData();
    return () => {
      active = false;
    };
  }, [content]);

  if (!content) {
    return (
      <div className="container-page py-20 text-center text-muted-foreground animate-pulse">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <ShortcodeRenderer content={content} prefetchedData={prefetchedData} />
    </div>
  );
};

export default Index;
