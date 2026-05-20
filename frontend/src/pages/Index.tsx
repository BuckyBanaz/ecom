import { Link } from "react-router-dom";
import { ArrowRight, Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { StarRating } from "@/components/shop/StarRating";
import { categories } from "@/data/categories";
import { brandsList, dealProducts, featuredProducts, reviews } from "@/data/products";
import hero from "@/assets/hero-spring.jpg";

const Index = () => {
  return (
    <div>
      {/* Hero */}
      <section className="container-page pt-6">
        <div className="relative overflow-hidden rounded-2xl">
          <img src={hero} alt="Spring deals" width={1920} height={800} className="h-[280px] w-full object-cover md:h-[440px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <h1 className="text-5xl font-black text-primary drop-shadow-sm md:text-7xl" style={{ fontFamily: "Inter" }}>
              Spring Deals
            </h1>
            <p className="mt-2 text-lg font-medium text-foreground md:text-2xl">Up to 50% off</p>
            <Button asChild size="lg" className="mt-6 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to="/category/deals">Shop now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page mt-14">
        <h2 className="mb-6 text-2xl font-bold md:text-3xl">Categories</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 6).map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-3 text-center text-sm font-semibold">{c.name}</div>
            </Link>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(6, 12).map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-3 text-center text-sm font-semibold">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page mt-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">Bestsellers</h2>
          <Link to="/category/pendant-lamps" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featuredProducts.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* USP strip */}
      <section className="container-page mt-16">
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted p-6 md:grid-cols-4">
          {[
            { icon: Truck, title: "Fast delivery", text: "Order before 22:00, delivered next day" },
            { icon: RotateCcw, title: "30-day returns", text: "Not happy? Send it back for free" },
            { icon: ShieldCheck, title: "2-year warranty", text: "Quality you can trust" },
            { icon: Headphones, title: "Expert support", text: "7 days a week" },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon size={20} />
              </span>
              <div>
                <div className="text-sm font-bold">{title}</div>
                <div className="text-xs text-muted-foreground">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Deals */}
      {dealProducts.length > 0 && (
        <section className="container-page mt-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold md:text-3xl">Spring deals</h2>
            <Link to="/category/deals" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {dealProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Brands */}
      <section className="container-page mt-16">
        <h2 className="mb-6 text-2xl font-bold md:text-3xl">Popular brands</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {brandsList.map((b) => (
            <div key={b} className="grid h-20 place-items-center rounded-xl border bg-card text-sm font-bold uppercase tracking-wider text-muted-foreground transition hover:text-primary">
              {b}
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="container-page mt-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">What our customers say</h2>
          <span className="hidden text-sm text-muted-foreground md:block">15,000+ verified reviews</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.name} className="rounded-xl border bg-card p-5 shadow-sm">
              <StarRating value={r.rating} size={16} />
              <h3 className="mt-2 font-semibold">{r.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
              <p className="mt-4 text-xs font-semibold text-foreground">— {r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="container-page mt-16">
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
              <Button type="submit" className="rounded-full px-6">Sign up</Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
