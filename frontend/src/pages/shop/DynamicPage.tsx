import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cmsPagesRepository } from "@/client/apiClient";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { readCachedCmsPage, writeCachedCmsPage } from "@/utils/cmsLocalStorage";

export default function DynamicPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(() => (slug ? readCachedCmsPage(slug) : null));
  const [isLoading, setIsLoading] = useState(() => !(slug && readCachedCmsPage(slug)));
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        if (!slug) return;
        const cached = readCachedCmsPage(slug);
        if (cached) {
          setPage(cached);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        const res = await cmsPagesRepository.getBySlug(slug);

        if (res.success && res.page && res.page.published) {
          setPage(res.page);
          writeCachedCmsPage(slug, {
            title: res.page.title,
            body: res.page.body,
            seoTitle: res.page.seoTitle,
            seoDesc: res.page.seoDesc,
            seoKeywords: res.page.seoKeywords,
            published: res.page.published,
          });
          setError(false);
        } else if (!cached) {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic page:", err);
        if (!readCachedCmsPage(slug!)) setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  useEffect(() => {
    if (!page) return;
    document.title = page.seoTitle || page.title || "Store";

    if (page.seoDesc) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", page.seoDesc);
    }

    if (page.seoKeywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute("content", page.seoKeywords);
    }
  }, [page]);

  if (isLoading && !page) {
    return (
      <div className="container-page py-20 text-center text-muted-foreground animate-pulse">
        Loading…
      </div>
    );
  }

  if (error || !page) {
    navigate("/404", { replace: true });
    return null;
  }

  return (
    <div className="animate-fade-in">
      {page.body ? (
        <div className="py-2 md:py-6">
          <ShortcodeRenderer content={page.body} />
        </div>
      ) : (
        <div className="container-page py-6 md:py-12 prose max-w-none dark:prose-invert">
          <h1>{page.title}</h1>
          <p className="text-muted-foreground">{t("dynamic_page.no_content")}</p>
        </div>
      )}
    </div>
  );
}
