import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { SafeImage } from "@/components/ui/SafeImage";

export type BlogCardItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover?: string | null;
  author?: string;
  date?: string;
};

export function BlogCard({ blog }: { blog: BlogCardItem }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="group rounded-2xl border bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="aspect-video w-full overflow-hidden bg-muted relative">
          {blog.cover ? (
            <SafeImage
              src={blog.cover}
              alt={blog.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold">
              {t("blog_card.no_cover")}
            </div>
          )}
        </div>
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("blog_card.by_author", { author: blog.author || t("blog_card.fallback_author") })}</span>
            <span>{blog.date || ""}</span>
          </div>
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {blog.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {blog.excerpt}
          </p>
        </div>
      </div>
      <div className="p-5 pt-0">
        <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline">
          {t("blog_card.read_article")}
        </span>
      </div>
    </Link>
  );
}
