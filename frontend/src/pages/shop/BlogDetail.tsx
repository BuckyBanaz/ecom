import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { blogRepository } from "@/client/apiClient";
import { initialBlogs } from "@/data/blogs";

const BlogDetail = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const res = await blogRepository.getAll({ published: true });
        if (res.success && res.blogs) {
          setBlogs(res.blogs);
        } else {
          const saved = localStorage.getItem("blogs_data");
          if (saved) {
            setBlogs(JSON.parse(saved));
          } else {
            setBlogs(initialBlogs);
          }
        }
      } catch (err) {
        console.error("Failed to load blogs from API:", err);
        const saved = localStorage.getItem("blogs_data");
        if (saved) {
          setBlogs(JSON.parse(saved));
        } else {
          setBlogs(initialBlogs);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const blog = useMemo(() => blogs.find((b) => b.slug === slug), [blogs, slug]);

  useEffect(() => {
    if (blog) {
      document.title = blog.seoTitle || blog.title || "Blog";
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', blog.seoDescription || blog.excerpt || "");

      if (blog.seoKeywords) {
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', blog.seoKeywords);
      }
    }
  }, [blog]);

  if (loading) {
    return (
      <div className="container-page py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container-page py-12 text-center">
        <h1 className="text-2xl font-bold">{t("blog_detail.not_found_title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("blog_detail.not_found_desc")}</p>
        <Link to="/blogs" className="mt-4 inline-flex items-center gap-2 text-primary font-semibold hover:underline">
          <ArrowLeft size={16} /> {t("blog_detail.link_back_to_blogs")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <Link to="/blogs" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft size={16} /> {t("blog_detail.link_back_to_blogs")}
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-xs">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {blog.cover ? (
            <img src={blog.cover} alt={blog.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm font-semibold">{t("blog_detail.no_cover_image")}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="bg-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">{t("blog_detail.label_article")}</span>
            <h1 className="text-2xl md:text-4xl font-extrabold mt-3 tracking-tight">{blog.title}</h1>
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground border-b pb-4">
            <span className="font-semibold text-foreground">{t("blog_detail.text_by")} {blog.author || t("blog_detail.fallback_author")}</span>
            <span>{t("blog_detail.text_published_on")} {blog.date}</span>
          </div>
          {blog.excerpt && (
            <p className="text-lg text-foreground/90 font-medium italic border-l-4 border-primary pl-4 py-1 bg-muted/30 rounded-r-md">
              {blog.excerpt}
            </p>
          )}
          <div className="prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: blog.body || "" }} />
          </div>
        </div>
      </article>
    </div>
  );
};

export default BlogDetail;
