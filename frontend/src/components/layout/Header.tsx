import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Heart, Menu, Search, ShoppingCart, User } from "lucide-react";
import { FaIcon } from "@/components/ui/FaIcon";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { navGroups } from "@/data/categories";
import { megaMenuData } from "@/data/megaMenu";
import { useDebounce } from "@/hooks/use-debounce";
import { productRepository, megaMenuRepository } from "@/client/apiClient";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { count, setDrawerOpen } = useCart();
  const { ids } = useWishlist();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuList, setMenuList] = useState<any[]>([]);
  const [topLeft, setTopLeft] = useState<any[]>([]);
  const [topRight, setTopRight] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await megaMenuRepository.getAll();
        if (res.success && res.menus && res.menus.length > 0) {
          setMenuList(res.menus);
        } else {
          // Fallback to localStorage or default
          const saved = localStorage.getItem("mega_menu_data");
          if (saved) {
            try { 
              const parsed = JSON.parse(saved);
              setMenuList(parsed.length > 0 ? parsed : megaMenuData); 
            } catch (e) { setMenuList(megaMenuData); }
          } else {
            setMenuList(megaMenuData);
          }
        }
      } catch (e) {
        console.error("Failed to load mega menu:", e);
        const saved = localStorage.getItem("mega_menu_data");
        if (saved) {
          try { 
            const parsed = JSON.parse(saved);
            setMenuList(parsed.length > 0 ? parsed : megaMenuData); 
          } catch (e) { setMenuList(megaMenuData); }
        } else {
          setMenuList(megaMenuData);
        }
      }

      const savedHeaderFooter = localStorage.getItem("header_footer_data");
      if (savedHeaderFooter) {
        try {
          const parsed = JSON.parse(savedHeaderFooter);
          setTopLeft(parsed.topLeft || []);
          setTopRight(parsed.topRight || []);
        } catch (e) {
          setTopLeft([]);
          setTopRight([]);
        }
      }
    };

    loadData();
    window.addEventListener("megaMenuDataChanged", loadData);
    return () => window.removeEventListener("megaMenuDataChanged", loadData);
  }, []);

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsSearching(true);
      try {
        const res = await productRepository.getAll({ search: debouncedQ, limit: 5 });
        if (res.success) {
          setSuggestions(res.products || []);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        // Fallback to local filtering if backend fails
        const savedProducts = localStorage.getItem("products_data");
        let allProductsList = [];
        if (savedProducts) {
          try { allProductsList = JSON.parse(savedProducts); } catch (e) {}
        } else {
          const { products } = await import("@/data/products");
          allProductsList = products;
        }
        
        const sq = debouncedQ.toLowerCase();
        const filtered = allProductsList.filter((p: any) => 
          p.name.toLowerCase().includes(sq) || 
          p.category.toLowerCase().includes(sq)
        ).slice(0, 5);
        setSuggestions(filtered);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQ]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      setShowSuggestions(false);
      navigate(`/category?search=${encodeURIComponent(q)}`);
    }
  };

  const renderDropdown = () => {
    if (!showSuggestions || q.trim().length === 0) return null;
    return (
      <div className="absolute left-0 top-[calc(100%+8px)] w-full bg-background rounded-2xl shadow-2xl border overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
        <div className="p-2">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{t("common.searching")}</div>
          ) : suggestions.length > 0 ? (
            <ul className="flex flex-col">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/category?search=${encodeURIComponent(p.name)}`}
                    onClick={() => {
                      setQ(p.name);
                      setShowSuggestions(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl transition-colors"
                  >
                    <Search size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold truncate text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground truncate capitalize">{typeof p.category === 'object' ? p.category.name : p.category?.replace(/-/g, ' ')}</span>
                    </div>
                  </Link>
                </li>
              ))}
              <li className="border-t mt-1 pt-1">
                <button
                  type="submit"
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Search size={14} />
                  {t("common.viewAllResultsFor", { query: q })}
                </button>
              </li>
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">{t("common.noResults")}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      {topLeft.length > 0 || topRight.length > 0 ? (
        <div className="border-b bg-muted/30 overflow-hidden">
          <div className="container-page py-2 text-xs">
            {/* Desktop Layout */}
            <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                {topLeft.map((item, idx) => (
                    <span key={`desk-l-${item.text}-${idx}`} className="flex items-center gap-2 font-medium text-muted-foreground">
                      {item.icon && <FaIcon name={item.icon} className="h-4 w-4 text-primary" />}
                      {item.text}
                    </span>
                  ))}
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                {topRight.map((link, idx) => (
                  <Link key={`desk-r-${link.label}-${idx}`} to={link.href} className="hover:text-primary font-medium">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Layout (Marquee) */}
            <div className="md:hidden flex">
              <div className="flex w-max animate-marquee items-center gap-6">
                {[...topLeft, ...topRight, ...topLeft, ...topRight].map((item: any, idx) => {
                  const isLink = item.href !== undefined;

                  return isLink ? (
                    <Link key={`mob-r-${item.label}-${idx}`} to={item.href} className="hover:text-primary font-medium whitespace-nowrap">
                      {item.label}
                    </Link>
                  ) : (
                    <span key={`mob-l-${item.text}-${idx}`} className="flex items-center gap-2 font-medium text-muted-foreground whitespace-nowrap">
                      {item.icon && <FaIcon name={item.icon} className="h-4 w-4 text-primary" />}
                      {item.text}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="container-page flex items-center gap-4 py-3 md:gap-6 md:py-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("header.menu")}>
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto p-0">
            <SheetTitle className="sr-only">{t("header.menu")}</SheetTitle>
            <SheetDescription className="sr-only">{t("header.menu")}</SheetDescription>
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

        <form onSubmit={submit} className="relative ml-2 hidden flex-1 md:block" onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (q.trim()) setShowSuggestions(true);
            }}
            placeholder={t("header.search_placeholder")}
            className="h-12 rounded-full border-2 pl-5 pr-14 text-base focus-visible:ring-primary/20"
          />
          <button
            type="submit"
            aria-label={t("common.search")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Search size={18} />
          </button>
          
          {/* Autocomplete Dropdown */}
          {renderDropdown()}
        </form>

        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="icon" aria-label={t("header.account")}>
            <Link to="/account"><User /></Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label={t("header.wishlist")} className="relative">
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
            aria-label={t("header.cart")}
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
      <div className="container-page pb-3 md:hidden">
        <form onSubmit={submit} className="relative" onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (q.trim()) setShowSuggestions(true);
            }}
            placeholder={t("common.search") + "\u2026"}
            className="h-11 rounded-full pl-5 pr-14 focus-visible:ring-primary/20"
          />
          <button
            type="submit"
            aria-label={t("common.search")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Search size={16} />
          </button>
          
          {/* Autocomplete Dropdown */}
          {renderDropdown()}
        </form>
      </div>

      {/* Mega nav (Desktop) */}
      <nav className="hidden border-t lg:block relative z-50 bg-background" onMouseLeave={() => setActiveMenu(null)}>
        <div className="container-page flex items-center gap-4 py-0">
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
                <ChevronDown size={14} className={`opacity-70 transition-transform ${activeMenu === menuObj.slug ? 'rotate-180' : ''}`} />
              </Link>
              
              {/* Dropdown panel */}
              {activeMenu === menuObj.slug && (
                <div className="absolute left-0 top-full w-full bg-background border-b shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
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
                                  onClick={() => setActiveMenu(null)}
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