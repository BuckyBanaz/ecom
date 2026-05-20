import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Heart, Menu, Search, ShoppingCart, User, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { navGroups } from "@/data/categories";
import { megaMenuData } from "@/data/megaMenu";

export function Header() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { count, setDrawerOpen } = useCart();
  const { ids } = useWishlist();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuList, setMenuList] = useState<any[]>([]);

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem("mega_menu_data");
      if (saved) {
        try {
          setMenuList(JSON.parse(saved));
        } catch (e) {
          setMenuList(megaMenuData);
        }
      } else {
        setMenuList(megaMenuData);
      }
    };

    loadData();
    window.addEventListener("megaMenuDataChanged", loadData);
    return () => window.removeEventListener("megaMenuDataChanged", loadData);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container-page flex items-center gap-4 py-3 md:gap-6 md:py-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto p-0">
            <div className="border-b p-4">
              <Logo />
            </div>
            <nav className="p-2">
              {menuList.map((menuObj) => (
                <details key={menuObj.menu} className="border-b py-2">
                  <summary className="cursor-pointer px-2 py-2 font-semibold flex items-center justify-between">
                    {menuObj.menu}
                  </summary>
                  <ul className="pl-4 pb-2">
                    {menuObj.sections.map((section) => (
                      <li key={section.title} className="mt-2">
                        <div className="font-medium text-sm mb-1 text-muted-foreground">{section.title}</div>
                        <ul className="space-y-1">
                          {section.items.map((item) => (
                            <li key={item.slug}>
                              <Link
                                to={`/category/${item.slug}`}
                                className="block py-1 text-sm hover:text-primary"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Logo />

        <form onSubmit={submit} className="relative ml-2 hidden flex-1 md:block">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the entire store"
            className="h-12 rounded-full border-2 pl-5 pr-14 text-base"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Search size={18} />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Account">
            <Link to="/account"><User /></Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Wishlist" className="relative">
            <Link to="/wishlist">
              <Heart />
              {ids.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {ids.length}
                </span>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cart"
            className="relative"
            onClick={() => setDrawerOpen(true)}
          >
            <ShoppingCart />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile search */}
      <form onSubmit={submit} className="container-page relative pb-3 md:hidden">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="h-11 rounded-full pl-4 pr-12"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Search size={16} />
        </button>
      </form>

      {/* Mega nav (Desktop) */}
      <nav className="hidden border-t lg:block relative z-50">
        <div className="container-page flex items-center gap-4 py-0" onMouseLeave={() => setActiveMenu(null)}>
          {menuList.map((menuObj) => (
            <div
              key={menuObj.slug}
              className="group"
              onMouseEnter={() => setActiveMenu(menuObj.slug)}
            >
              <Link
                to={`/relief/${menuObj.slug}`}
                className="flex items-center gap-1 rounded-full px-4 py-3 text-sm font-semibold transition hover:bg-muted text-foreground"
              >
                {menuObj.menu}
                <ChevronDown size={14} className="opacity-70 transition-transform group-hover:rotate-180" />
              </Link>
              
              {/* Dropdown panel */}
              {activeMenu === menuObj.slug && (
                <div className="absolute left-0 top-full w-full bg-background border-b shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="container-page py-8">
                    <div className="grid grid-cols-4 gap-8">
                      {menuObj.sections.map((section) => (
                        <div key={section.title}>
                          <h3 className="mb-4 text-base font-bold text-foreground">
                            {section.title}
                          </h3>
                          <ul className="space-y-3">
                            {section.items.map((item) => (
                              <li key={item.slug}>
                                <Link
                                  to={`/category/${item.slug}`}
                                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
                                >
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link
            to="/deals"
            className="rounded-full px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 ml-auto"
            onMouseEnter={() => setActiveMenu(null)}
          >
            Deals
          </Link>
        </div>
      </nav>
    </header>
  );
}