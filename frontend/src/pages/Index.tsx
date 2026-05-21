import { useState, useEffect } from "react";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { cmsHomepageRepository } from "@/client/apiClient";



const Index = () => {
  const [content, setContent] = useState("");

  useEffect(() => {
    const fetchHomepage = async () => {
      try {
        const res = await cmsHomepageRepository.get();
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
      } catch (error) {
        console.error("Failed to load homepage data", error);
      }
    };
    fetchHomepage();
  }, []);

  return (
    <div>
      <ShortcodeRenderer content={content} />
      
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
              className="mx-auto mt-6 flex max-w-lg gap-2"
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                className="flex-1 rounded-full border-0 bg-white/10 px-5 py-3 text-sm text-secondary-foreground placeholder:text-secondary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" className="rounded-full px-6 bg-primary text-primary-foreground font-semibold h-10 hover:bg-primary/90 transition-colors">Sign up</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
