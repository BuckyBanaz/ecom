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
import { useDebounce } from "@/hooks/use-debounce";
import { productRepository, megaMenuRepository, cmsHeaderFooterRepository, categoryRepository } from "@/client/apiClient";
import { useCmsData } from "@/hooks/useCmsData";
import { useCmsLabel } from "@/hooks/useCmsLabel";
import { DefaultAnnouncementBar } from "./TopBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { labelT } from "@/utils/i18nLabel";
import { extractMegaMenus, fetchMegaMenusCmsPayload } from "@/utils/megaMenu";

function getMenuLink(parentSlug: string, child: any, allCategories: any[]) {
  if (child.isDynamic) {
    // Find the real parent category slug from the database categories
    const childCat = allCategories.find((c: any) => c.slug === child.slug);
    let realParentSlug = "category";
    
    if (childCat?.parentId) {
      const parentCat = allCategories.find((c: any) => c.id === childCat.parentId);
      if (parentCat) {
        realParentSlug = parentCat.slug;
      }
    } else if (childCat?.parent?.slug) {
      realParentSlug = childCat.parent.slug;
    }

    return `/${realParentSlug}/${child.slug}`;
  }
  // Custom links: assume slug is a valid path/URL
  return child.slug.startsWith('/') || child.slug.startsWith('http') 
    ? child.slug 
    : `/${child.slug}`;
}

function HeaderTopBarText({ text, icon }: { text: string; icon?: string }) {
  const label = useCmsLabel(text);
  return (
    <span className="flex items-center gap-2 font-medium text-muted-foreground">
      {icon && <FaIcon name={icon} className="h-4 w-4 text-primary" />}
      {label}
    </span>
  );
}

function HeaderTopBarLink({ label, href, className }: { label: string; href: string; className?: string }) {
  const text = useCmsLabel(label);
  return (
    <Link to={href} className={className ?? "hover:text-primary font-medium"}>
      {text}
    </Link>
  );
}

export function Header() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { count, setDrawerOpen } = useCart();
  const { ids } = useWishlist();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState<string | null>(null);

  const { data: rawMegaMenu } = useCmsData("mega_menu_data", fetchMegaMenusCmsPayload);
  const { data: headerFooterData, loading: headerFooterLoading } = useCmsData("header_footer_data", () => cmsHeaderFooterRepository.get());
  const { data: categoriesRes } = useCmsData("categories_data_v2", async () => {
    const res = await categoryRepository.getAll();
    return { success: res.success, data: res };
  });

  // Generate navigation tree from categories (fallback only)
  const tree = categoriesRes?.tree || [];
  const activeTree = tree.filter((c: any) => c.isActive !== false && c.showInNavigation !== false).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const navTreeFallback = activeTree.map((parent: any) => ({
    name: parent.name,
    slug: parent.slug,
    sections: [
      {
        title: "Categories",
        type: "custom",
        items: (parent.children || []).filter((c: any) => c.isActive !== false && c.showInNavigation !== false).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((c: any) => ({
          name: c.name,
          slug: c.slug
        }))
      }
    ]
  }));

  // Build the Final Navigation Tree from the CMS Mega Menu
  let finalNavTree: any[] = [];
  const allCategories = categoriesRes?.categories || [];
  
  if (rawMegaMenu && rawMegaMenu.length > 0) {
    finalNavTree = rawMegaMenu.map((m: any) => {
      const enhancedSections = (m.sections || []).map((section: any) => {
        if (section.type === "dynamic" && section.categoryId) {
          // Auto-populate from category
          const childCategories = allCategories
            .filter((c: any) => c.parentId === section.categoryId && c.isActive !== false && c.showInNavigation !== false)
            .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
          return {
            title: section.title,
            type: "dynamic",
            categoryId: section.categoryId,
            items: childCategories.map((c: any) => ({
              name: c.name,
              slug: c.slug,
              isDynamic: true
            }))
          };
        }
        return section;
      });

      return {
        name: m.menu,
        slug: m.slug,
        sections: enhancedSections
      };
    });
  } else {
    // Fallback if MegaMenu CMS is completely empty
    finalNavTree = navTreeFallback;
  }


  const topLeft = headerFooterData?.topLeft || [];
  const topRight = headerFooterData?.topRight || [];
  const hasCmsAnnouncement = topLeft.length > 0 || topRight.length > 0;
  const showDefaultAnnouncement = !headerFooterLoading && !hasCmsAnnouncement;

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
          (p.name || "").toLowerCase().includes(sq) || 
          (typeof p.category === 'object' ? p.category?.name || '' : p.category || '').toLowerCase().includes(sq)
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
    <header className="sticky top-0 z-40 w-full min-w-0 border-b bg-background/95 backdrop-blur notranslate" translate="no">
      <div className="w-full overflow-hidden border-b bg-muted/30 min-h-9">
        <div className="container-page min-w-0 py-2 text-xs">
          {hasCmsAnnouncement ? (
            <>
              <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  {topLeft.map((item, idx) => (
                    <HeaderTopBarText key={`desk-l-${item.text}-${idx}`} text={item.text} icon={item.icon} />
                  ))}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  {topRight.map((link, idx) => (
                    <HeaderTopBarLink key={`desk-r-${link.label}-${idx}`} label={link.label} href={link.href} />
                  ))}
                </div>
              </div>

              <div className="md:hidden w-full min-w-0 overflow-hidden">
                <div className="flex w-max animate-marquee items-center gap-6 pr-6">
                  {[...topLeft, ...topRight, ...topLeft, ...topRight].map((item: any, idx) => {
                    const isLink = item.href !== undefined;

                    return isLink ? (
                      <HeaderTopBarLink
                        key={`mob-r-${item.label}-${idx}`}
                        label={item.label}
                        href={item.href}
                        className="hover:text-primary font-medium whitespace-nowrap"
                      />
                    ) : (
                      <span key={`mob-l-${item.text}-${idx}`} className="whitespace-nowrap">
                        <HeaderTopBarText text={item.text} icon={item.icon} />
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          ) : showDefaultAnnouncement ? (
            <DefaultAnnouncementBar />
          ) : null}
        </div>
      </div>
      <div className="container-page flex min-w-0 items-center gap-2 py-3 sm:gap-3 md:gap-6 md:py-4">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 lg:hidden" aria-label={t("header.menu")}>
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto p-0">
            <SheetTitle className="sr-only">{t("header.menu")}</SheetTitle>
            <SheetDescription className="sr-only">{t("header.menu")}</SheetDescription>
            <div className="border-b p-4" onClick={() => setIsMobileMenuOpen(false)}>
              <Logo />
            </div>
            <nav className="p-2">
              <div className="px-2 pb-4 space-y-6">
                {finalNavTree.map((parent: any) => (
                  <div key={parent.slug} className="mb-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="mb-3 text-sm font-bold text-foreground uppercase tracking-wider">
                      <Link to={`/${parent.slug}`} onClick={() => setIsMobileMenuOpen(false)}>
                        {labelT(t, parent.name, i18n.language)}
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {(parent.sections || []).map((section: any, sIdx: number) => (
                        <div key={sIdx}>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">{labelT(t, section.title, i18n.language)}</h4>
                          <div className="flex flex-col space-y-2 pl-2">
                            {(section.items || []).map((child: any) => (
                              <Link
                                key={child.slug}
                                to={getMenuLink(parent.slug, child, allCategories)}
                                className="text-sm text-foreground/80 font-medium transition-colors hover:text-primary"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {labelT(t, child.name, i18n.language)}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <Logo className="min-w-0 shrink" />

        <form onSubmit={submit} className="relative ml-1 hidden min-w-0 flex-1 md:block" onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
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

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <LanguageSwitcher compact />
          <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label={t("header.account")}>
            <Link to="/account"><User /></Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="relative h-9 w-9" aria-label={t("header.wishlist")}>
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
            className="relative h-9 w-9"
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
        <div className="container-page flex items-center gap-4 py-0 flex-wrap">
          {finalNavTree.map((parent: any) => (
            <div
              key={parent.slug}
              className="group"
              onMouseEnter={() => setActiveMenu(parent.slug)}
            >
              <Link
                to={`/${parent.slug}`}
                className="flex items-center gap-1 rounded-full px-4 py-3 text-sm font-semibold transition hover:bg-muted text-foreground"
              >
                {labelT(t, parent.name, i18n.language)}
                <ChevronDown size={14} className={`opacity-70 transition-transform ${activeMenu === parent.slug ? 'rotate-180' : ''}`} />
              </Link>
              
              {activeMenu === parent.slug && (
                <div className="absolute left-0 top-full w-full bg-background border-b shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                  <div className="container-page py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      {(parent.sections || []).map((section: any, sIdx: number) => (
                        <div key={sIdx}>
                          <h3 className="mb-4 text-base font-bold text-foreground capitalize">
                            {labelT(t, section.title, i18n.language)}
                          </h3>
                          <ul className="space-y-3">
                            {(section.items || []).map((child: any) => (
                              <li key={child.slug}>
                                <Link
                                  to={getMenuLink(parent.slug, child, allCategories)}
                                  onClick={() => setActiveMenu(null)}
                                  className="text-sm transition-colors hover:text-primary hover:underline underline-offset-4 font-medium text-muted-foreground"
                                >
                                  {labelT(t, child.name, i18n.language)}
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
        </div>
      </nav>
    </header>
  );
}