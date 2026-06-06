import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { BlogCard } from "@/components/shop/BlogCard";
import { blogRepository } from "@/client/apiClient";
import { initialBlogs } from "@/data/blogs";

const Blogs = () => {
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

  const published = useMemo(() => blogs.filter((b) => b.published), [blogs]);

  return (
    <div className="container-page py-10 space-y-12">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-8 md:p-12 shadow-xs">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-primary">Schip & Ster  Journal</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Lighting stories, guides, and trends</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Discover the latest lighting inspiration, buyer guides, and room-by-room ideas curated by our team.
          </p>
        </div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Latest articles</h2>
            <p className="text-sm text-muted-foreground">Fresh ideas for every room and mood.</p>
          </div>
          <Link to="/" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Back to shop <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : published.length === 0 ? (
          <div className="rounded-2xl border bg-muted/20 p-10 text-center text-muted-foreground">
            No blog posts are published yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Blogs;
