import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { initialBlogs } from "@/data/blogs";

const BlogDetail = () => {
  const { slug = "" } = useParams();
  const [blogs, setBlogs] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("blogs_data");
    if (saved) {
      try {
        setBlogs(JSON.parse(saved));
        return;
      } catch {}
    }
    setBlogs(initialBlogs);
  }, []);

  const blog = useMemo(() => blogs.find((b) => b.slug === slug), [blogs, slug]);

  if (!blog) {
    return (
      <div className="container-page py-12 text-center">
        <h1 className="text-2xl font-bold">Blog not found</h1>
        <p className="mt-2 text-muted-foreground">The article you are looking for does not exist.</p>
        <Link to="/blogs" className="mt-4 inline-flex items-center gap-2 text-primary font-semibold hover:underline">
          <ArrowLeft size={16} /> Back to blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <Link to="/blogs" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft size={16} /> Back to blogs
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-xs">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {blog.cover ? (
            <img src={blog.cover} alt={blog.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm font-semibold">No cover image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="bg-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Article</span>
            <h1 className="text-2xl md:text-4xl font-extrabold mt-3 tracking-tight">{blog.title}</h1>
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground border-b pb-4">
            <span className="font-semibold text-foreground">By {blog.author || "Guest"}</span>
            <span>Published on {blog.date}</span>
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
