import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cmsPagesRepository } from "@/client/apiClient";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";

export default function DynamicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setIsLoading(true);
        if (!slug) return;
        const res = await cmsPagesRepository.getBySlug(slug);
        
        if (res.success && res.page && res.page.published) {
          setPage(res.page);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic page:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  useEffect(() => {
    if (page) {
      document.title = page.seoTitle || page.title || "Store";
      
      if (page.seoDesc) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', page.seoDesc);
      }
    }
  }, [page]);

  if (isLoading) {
    return <div className="container-page py-20 text-center text-muted-foreground animate-pulse">Loading page...</div>;
  }

  if (error || !page) {
    // If not found, navigate to 404
    navigate("/404", { replace: true });
    return null;
  }

  return (
    <>
      <div className="container-page py-12 animate-fade-in">
        {page.body ? (
          <ShortcodeRenderer content={page.body} />
        ) : (
          <div className="prose max-w-none dark:prose-invert">
            <h1>{page.title}</h1>
            <p className="text-muted-foreground">This page has no content yet.</p>
          </div>
        )}
      </div>
    </>
  );
}
