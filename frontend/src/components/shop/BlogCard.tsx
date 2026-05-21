import { Link } from "react-router-dom";

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
  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="group rounded-2xl border bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="aspect-video w-full overflow-hidden bg-muted relative">
          {blog.cover ? (
            <img
              src={blog.cover}
              alt={blog.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold">
              No cover image
            </div>
          )}
        </div>
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>By {blog.author || "Guest"}</span>
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
          Read Article &rarr;
        </span>
      </div>
    </Link>
  );
}
