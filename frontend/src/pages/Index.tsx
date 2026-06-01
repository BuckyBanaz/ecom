import { useState, useEffect } from "react";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { cmsHomepageRepository, productRepository, categoryRepository, blogRepository } from "@/client/apiClient";
import { HomepageSkeleton } from "@/components/ui/SkeletonLoader";

const Index = () => {
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
      
      {/* Newsletter (Kept static at the bottom) */}
      <section className="container-page mt-16 mb-16">
        <div className="overflow-hidden rounded-2xl bg-secondary p-8 text-secondary-foreground md:p-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Be the first to know</h2>
            <p className="mt-2 text-secondary-foreground/80">
              Sign up and get early access to giveaways, new arrivals and exclusive deals.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                (e.target as HTMLFormElement).reset();
              }}
              className="mx-auto mt-6 flex max-w-lg flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                className="flex-1 w-full rounded-full border-0 bg-white/10 px-5 py-3 text-sm text-secondary-foreground placeholder:text-secondary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" className="shrink-0 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 whitespace-nowrap">
                Sign up
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
