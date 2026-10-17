import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Upload, X, Save, Plus, ImageIcon, Trash2, Sparkles, Loader2, Maximize2, ZoomIn, ZoomOut, RotateCcw, Warehouse, QrCode, Boxes, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Brand, Series } from "@/data/brands";
import { Attribute } from "@/data/attributes";
import { brandRepository, categoryRepository, attributeRepository, productRepository, seriesRepository } from "@/client/apiClient";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { QrCodePreviewModal } from "@/components/admin/inventory/QrCodePreviewModal";
import { cn } from "@/lib/utils";
import { normalizeUploadedUrl, resolveImgUrl } from "@/utils/image";
import { getApiV1Url } from "@/utils/endpoints";
import { Checkbox } from "@/components/ui/checkbox";

const PRESET_ISSUES = [
  {
    label: "💎 Crystal -> Ambiance & G9",
    text: "This is a luxury crystal lamp with faceted prisms. Move to Ambiance Royale collection, set fitting to G9, and write Dutch description highlighting crystal light refraction.",
  },
  {
    label: "🏷️ Tafellamp (Table Base)",
    text: "This product is a table lamp (Tafellamp) with a tabletop base. Set category to table-lamps (Tafellampen), change title to include Tafellamp, and update specs.",
  },
  {
    label: "🔘 Hanglamp (Pendant)",
    text: "This lamp hangs from ceiling cables as a chandelier/pendant. Set category to pendant-lights (Hanglampen), ensure title has Hanglamp, and add adjustable cable height to specs.",
  },
  {
    label: "🎨 Color: Zilver / Chroom",
    text: "The finish is cool shiny silver chrome (Zilver / Chroom). Set color attribute to Silver and update titles and specs to Zilver / Chroom. Never say Gold.",
  },
  {
    label: "✨ Color: Goud / Messing",
    text: "The finish is warm brushed gold / brass (Goud / Messing). Set color attribute to Gold and update titles and specs to Goud / Messing. Never say Silver.",
  },
  {
    label: "🇳🇱 Schip en Ster SOP Standard",
    text: "Review title, description, and specs according to Schip en Ster SOP. Ensure fluent Dutch text with 'Belangrijkste kenmerken' bullet points, valid categories, and comprehensive technical specs.",
  },
  {
    label: "⚡ Fitting & Dimmer Specs",
    text: "Verify fitting (G9 for Ambiance crystal, E27 for vintage, Integrated LED for rings/Stockholm) and mark Dimbaar: Ja with dimmable specifications in specs and attributes.",
  },
];

export interface SpecItem {
  id: string;
  key: string;
  value: string;
  link?: string;
}

export interface FormProductVariant {
  id?: string;
  sizeName: string;
  price: string;
  stock: string;
  sku: string;
}

const VARIANT_SIZE_PRESETS = [
  { label: "🔘 Diameter (Ø 40cm, 60cm, 80cm)", sizes: ["Ø 40 cm", "Ø 60 cm", "Ø 80 cm"] },
  { label: "📏 Lengte (80cm, 100cm, 120cm)", sizes: ["80 cm", "100 cm", "120 cm"] },
  { label: "💍 Ringen (2-Ring, 3-Ring, 4-Ring)", sizes: ["2-Ring", "3-Ring", "4-Ring"] },
  { label: "💡 Lichts (3-Lichts, 5-Lichts, 7-Lichts)", sizes: ["3-Lichts", "5-Lichts", "7-Lichts"] },
  { label: "🏷️ Maten (S, M, L)", sizes: ["Small (S)", "Medium (M)", "Large (L)"] },
];

const CATEGORY_ALIAS_MAP: Record<string, string> = {
  "hanglampen": "pendant-lights",
  "hanglamp": "pendant-lights",
  "pendant": "pendant-lights",
  "pendant-lamps": "pendant-lights",
  "pendant-lights": "pendant-lights",
  "tafellampen": "table-lamps",
  "tafellamp": "table-lamps",
  "table-lamps": "table-lamps",
  "table-lamp": "table-lamps",
  "table-lights": "table-lamps",
  "plafondlampen": "ceiling-lights",
  "plafondlamp": "ceiling-lights",
  "ceiling-lamps": "ceiling-lights",
  "ceiling-lights": "ceiling-lights",
  "wandlampen": "wall-lights",
  "wandlamp": "wall-lights",
  "wall-lamps": "wall-lights",
  "wall-lights": "wall-lights",
  "vloerlampen": "floor-lamps",
  "vloerlamp": "floor-lamps",
  "floor-lamps": "floor-lamps",
  "floor-lights": "floor-lamps",
  "spots": "spotlights",
  "spot": "spotlights",
  "spotlights": "spotlights",
  "opbouwspots": "spotlights",
  "buitenverlichting": "outdoor-lighting",
  "outdoor-lighting": "outdoor-lighting",
  "lichtbronnen": "light-sources",
  "light-sources": "light-sources",
};

const AdminProductForm = () => {
  const { t } = useTranslation();
  const { id, draftId } = useParams<{ id?: string; draftId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAdmin();

  const isDraftMode = Boolean(draftId);
  const isEdit = id !== undefined && id !== "new" && !isDraftMode;
  const canRegenerate = Boolean(draftId || (id && id !== "new"));

  // Mount guard for portal-based components
  const [isMounted, setIsMounted] = useState(false);
  const [isDraftModeState, setIsDraftModeState] = useState(isDraftMode);

  // Regeneration prompt state
  const [regenPromptOpen, setRegenPromptOpen] = useState(false);
  const [regenPromptText, setRegenPromptText] = useState("");
  const [regenTargetIndex, setRegenTargetIndex] = useState<number | null>(null);
  const [isGlobalRegenerating, setIsGlobalRegenerating] = useState(false);
  const [regeneratingIndexes, setRegeneratingIndexes] = useState<number[]>([]);

  // Optimization states
  const [optimizePromptOpen, setOptimizePromptOpen] = useState(false);
  const [optimizePromptText, setOptimizePromptText] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [quickEditFields, setQuickEditFields] = useState({
    name: true,
    category: true,
    description: true,
    specs: true,
    attributes: true,
    seo: true,
    price: false,
  });

  // Loading states
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [isProductLoading, setIsProductLoading] = useState(isEdit || isDraftMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [mediaDialogTarget, setMediaDialogTarget] = useState<"thumbnail" | "gallery" | null>(null);

  // Lightbox & Zoom states
  const [zoomScale, setZoomScale] = useState(1);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const openLightbox = (url: string) => {
    setLightboxImage(url);
    setZoomScale(1);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  // Data states
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [inStock, setInStock] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSelling, setIsBestSelling] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Inventory & Warehouse States
  const [storageStock, setStorageStock] = useState("10");
  const [webshopStock, setWebshopStock] = useState("5");
  const [binLocation, setBinLocation] = useState("A-01-1");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [currentInventoryItem, setCurrentInventoryItem] = useState<any>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Internal Size Variants State
  const [hasVariants, setHasVariants] = useState(false);
  const [productVariants, setProductVariants] = useState<FormProductVariant[]>([]);

  const applyVariantPreset = (presetSizes: string[]) => {
    const baseP = parseFloat(price) || 89.95;
    const cleanPrefix = (name || "PROD").toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 10);
    const newItems: FormProductVariant[] = presetSizes.map((sz, idx) => {
      const multiplier = idx === 0 ? 0.85 : idx === 1 ? 1 : 1 + idx * 0.3;
      const sizeSlug = sz.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase();
      return {
        id: `var-${Date.now()}-${idx}`,
        sizeName: sz,
        price: (baseP * multiplier).toFixed(2),
        stock: storageStock || "10",
        sku: `${cleanPrefix}-${sizeSlug}`,
      };
    });
    setProductVariants(newItems);
    setHasVariants(true);
    toast.success(`Applied ${presetSizes.length} size variants!`);
  };

  const addVariantRow = () => {
    const baseP = parseFloat(price) || 89.95;
    setProductVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}`,
        sizeName: "",
        price: baseP.toFixed(2),
        stock: storageStock || "10",
        sku: "",
      },
    ]);
    setHasVariants(true);
  };

  // Color Siblings & Linked Variants States
  const [colorGroupId, setColorGroupId] = useState<string | null>(null);
  const [linkedSiblings, setLinkedSiblings] = useState<any[]>([]);
  const [siblingSearchQuery, setSiblingSearchQuery] = useState("");
  const [siblingSearchResults, setSiblingSearchResults] = useState<any[]>([]);
  const [isSearchingSiblings, setIsSearchingSiblings] = useState(false);
  const [isBrowseCatalogOpen, setIsBrowseCatalogOpen] = useState(false);
  const [catalogFilterCategory, setCatalogFilterCategory] = useState<string>("all");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [siblingFilterCategory, setSiblingFilterCategory] = useState<string>("same"); // "same" | "all"

  const searchSiblings = async (query = siblingSearchQuery, categoryMode = siblingFilterCategory) => {
    setSiblingSearchQuery(query);
    setIsSearchingSiblings(true);
    try {
      const filters: Record<string, any> = { limit: 50 };
      if (query && query.trim().length > 0) {
        filters.search = query.trim();
      }
      if (categoryMode === "same" && selectedCategory) {
        filters.category = selectedCategory;
      }
      const currentId = id || draftId || "";
      const linkedIds = new Set(linkedSiblings.map((s) => s.id));

      const [res, draftsData] = await Promise.all([
        productRepository.getAll(filters).catch(() => ({ success: false, products: [] })),
        fetch(`${getApiV1Url()}/ai/drafts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        })
          .then((r) => r.json())
          .catch(() => ({ success: false, drafts: [] })),
      ]);

      let combined: any[] = [];
      if (res.success && res.products) {
        combined = res.products.filter(
          (p: any) => p.id !== currentId && !linkedIds.has(p.id)
        );
      }

      if (draftsData.success && Array.isArray(draftsData.drafts)) {
        const queryLower = query ? query.toLowerCase().trim() : "";
        const formattedDrafts = draftsData.drafts
          .filter((d: any) => {
            if (d.id === currentId || linkedIds.has(d.id) || d.status === "published") return false;
            const p = d.payload || {};
            const dName = (d.name || p.name || "").toLowerCase();
            const dCat = (p.category || "").toLowerCase();
            if (categoryMode === "same" && selectedCategory && dCat && !dCat.includes(selectedCategory.toLowerCase()) && !selectedCategory.toLowerCase().includes(dCat)) {
              return false;
            }
            if (queryLower && !dName.includes(queryLower)) return false;
            return true;
          })
          .map((d: any) => {
            const p = d.payload || {};
            const colorVal = p.visualInspection?.finishColor || p.attributes?.color?.[0] || "";
            return {
              id: d.id,
              name: `${d.name || p.name || "Draft Product"} (Draft)`,
              slug: `drafts/${d.id}`,
              price: Number(p.price) || 0,
              image: p.image || p.images?.[0] || "",
              isDraft: true,
              category: { name: p.category || "Draft", slug: p.category || "" },
              productAttributeValues: colorVal
                ? [
                    {
                      attribute: { slug: "color", name: "Color" },
                      attributeValue: { value: colorVal, colorCode: "#333333" },
                    },
                  ]
                : [],
            };
          });

        combined = [...combined, ...formattedDrafts];
      }

      setSiblingSearchResults(combined);
    } catch (err) {
      console.error("Failed to search siblings:", err);
    } finally {
      setIsSearchingSiblings(false);
    }
  };

  const loadCatalogProducts = async (catSlug = catalogFilterCategory, search = catalogSearchQuery) => {
    setIsLoadingCatalog(true);
    try {
      const filters: Record<string, any> = { limit: 100 };
      if (catSlug && catSlug !== "all") {
        filters.category = catSlug;
      }
      if (search && search.trim()) {
        filters.search = search.trim();
      }
      const currentId = id || draftId || "";

      const [res, draftsData] = await Promise.all([
        productRepository.getAll(filters).catch(() => ({ success: false, products: [] })),
        fetch(`${getApiV1Url()}/ai/drafts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        })
          .then((r) => r.json())
          .catch(() => ({ success: false, drafts: [] })),
      ]);

      let combined: any[] = [];
      if (res.success && res.products) {
        combined = res.products.filter((p: any) => p.id !== currentId);
      }

      if (draftsData.success && Array.isArray(draftsData.drafts)) {
        const searchLower = search ? search.toLowerCase().trim() : "";
        const formattedDrafts = draftsData.drafts
          .filter((d: any) => {
            if (d.id === currentId || d.status === "published") return false;
            const p = d.payload || {};
            const dName = (d.name || p.name || "").toLowerCase();
            const dCat = (p.category || "").toLowerCase();
            if (catSlug && catSlug !== "all" && dCat && !dCat.includes(catSlug.toLowerCase()) && !catSlug.toLowerCase().includes(dCat)) {
              return false;
            }
            if (searchLower && !dName.includes(searchLower)) return false;
            return true;
          })
          .map((d: any) => {
            const p = d.payload || {};
            const colorVal = p.visualInspection?.finishColor || p.attributes?.color?.[0] || "";
            return {
              id: d.id,
              name: `${d.name || p.name || "Draft Product"} (Draft)`,
              slug: `drafts/${d.id}`,
              price: Number(p.price) || 0,
              image: p.image || p.images?.[0] || "",
              isDraft: true,
              category: { name: p.category || "Draft", slug: p.category || "" },
              productAttributeValues: colorVal
                ? [
                    {
                      attribute: { slug: "color", name: "Color" },
                      attributeValue: { value: colorVal, colorCode: "#333333" },
                    },
                  ]
                : [],
            };
          });

        combined = [...combined, ...formattedDrafts];
      }

      setCatalogProducts(combined);
    } catch (err) {
      console.error("Failed to load catalog products:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const addSibling = (productToAdd: any) => {
    const colorAttr = productToAdd.productAttributeValues?.find(
      (pav: any) =>
        pav.attribute?.slug === "color" ||
        pav.attribute?.name?.toLowerCase() === "color" ||
        pav.attribute?.name?.toLowerCase() === "kleur"
    );
    let sizeVal = productToAdd.sizeName || "";
    if (!sizeVal) {
      const sizeAttr = productToAdd.productAttributeValues?.find(
        (pav: any) =>
          pav.attribute?.slug === "size" ||
          pav.attribute?.slug === "afmeting" ||
          pav.attribute?.name?.toLowerCase() === "size" ||
          pav.attribute?.name?.toLowerCase() === "afmeting"
      );
      if (sizeAttr?.attributeValue?.value) {
        sizeVal = sizeAttr.attributeValue.value;
      } else {
        const nameMatch = productToAdd.name?.match(/(?:Ø\s*\d+\s*(?:cm|mm)?|\b\d+\s*(?:cm|mm)\b)/i);
        if (nameMatch) sizeVal = nameMatch[0].trim();
      }
    }
    const formattedSibling = {
      id: productToAdd.id,
      name: productToAdd.name,
      slug: productToAdd.slug,
      image: productToAdd.image,
      price: productToAdd.price,
      colorName: colorAttr?.attributeValue?.value || "Color",
      colorCode: colorAttr?.attributeValue?.colorCode || "#333333",
      sizeName: sizeVal || undefined,
    };
    setLinkedSiblings((prev) => [...prev, formattedSibling]);
    setSiblingSearchResults((prev) => prev.filter((p) => p.id !== productToAdd.id));
    setSiblingSearchQuery("");
  };

  const removeSibling = (siblingId: string) => {
    setLinkedSiblings((prev) => prev.filter((s) => s.id !== siblingId));
  };

  // AI Sibling Suggestion States & Methods
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const handleAiSuggestSiblings = async () => {
    if (!id || id === "new") {
      toast.info(t("admin_product_form.save_first_for_ai", "Please save this product first before running AI sibling detection."));
      return;
    }
    setIsAiSuggesting(true);
    setAiSuggestions([]);
    try {
      const apiUrl = getApiV1Url();
      const res = await fetch(`${apiUrl}/ai/products/${id}/suggest-siblings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      });
      const data = await res.json();
      if (data.success && data.suggestions) {
        if (data.suggestions.length === 0) {
          toast.info(t("admin_product_form.no_ai_siblings_found", "AI analyzed your catalog but found no matching color variations for this product."));
        } else {
          setAiSuggestions(data.suggestions);
          toast.success(t("admin_product_form.ai_siblings_found", "AI found {{count}} matching color variation(s)!", { count: data.suggestions.length }));
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to find siblings with AI");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const linkAllAiSuggestions = () => {
    aiSuggestions.forEach((s) => {
      if (!linkedSiblings.some((ls) => ls.id === s.id)) {
        addSibling(s);
      }
    });
    setAiSuggestions([]);
    toast.success(t("admin_product_form.linked_all_ai", "Linked all AI suggested siblings! Remember to click Save."));
  };
  const resolveCategorySlug = (raw: string, list: any[] = categoriesList): string => {
    if (!raw) return "";
    const clean = raw.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const aliased = CATEGORY_ALIAS_MAP[clean] || CATEGORY_ALIAS_MAP[raw.toLowerCase().trim()] || clean;

    // Check if matches by id directly
    const idMatch = list.find((c: any) => c.id === raw);
    if (idMatch) return idMatch.slug;

    // Check if directly in list by slug
    const directMatch = list.find((c: any) => c.slug?.toLowerCase() === aliased.toLowerCase());
    if (directMatch) return directMatch.slug;

    // Check if matches by name
    const nameMatch = list.find((c: any) => c.name?.toLowerCase() === raw.toLowerCase().trim() || c.name?.toLowerCase() === aliased.toLowerCase());
    if (nameMatch) return nameMatch.slug;

    // Check if partial slug match
    const partialMatch = list.find((c: any) => c.slug?.toLowerCase().includes(aliased.toLowerCase()) || aliased.toLowerCase().includes(c.slug?.toLowerCase()));
    if (partialMatch) return partialMatch.slug;

    return aliased;
  };

  // Prevent parent categories from being set — auto-resolves to first child
  const safeSetCategory = (slug: string, cats?: any[]) => {
    const list = cats || categoriesList;
    if (!slug) { setSelectedCategory(""); return; }
    const resolved = resolveCategorySlug(slug, list);
    const parent = (list as any[]).find((p: any) => p.slug === resolved || p.id === slug);
    const isParent = parent && (list as any[]).some((ch: any) => ch.parentId === parent.id);
    if (isParent) {
      const firstChild = (list as any[]).find((ch: any) => ch.parentId === parent.id);
      setSelectedCategory((firstChild as any)?.slug || "");
    } else {
      setSelectedCategory(resolved);
    }
  };
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [numberOfLights, setNumberOfLights] = useState("");
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string[]>>({});

  // Dynamic Specification states
  const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [newParamName, setNewParamName] = useState("");

  const handleStorageStockChange = (val: string) => {
    setStorageStock(val);
    const storageNum = Math.max(0, parseInt(val, 10) || 0);
    const currentWebshopNum = parseInt(webshopStock, 10) || 0;
    if (currentWebshopNum > storageNum) {
      setWebshopStock(String(storageNum));
    }
  };

  const handleWebshopStockChange = (val: string) => {
    const maxStorage = Math.max(0, parseInt(storageStock, 10) || 0);
    if (val === "") {
      setWebshopStock("");
      return;
    }
    const inputNum = parseInt(val, 10) || 0;
    if (inputNum > maxStorage) {
      toast.error(t("admin_product_form.cannot_exceed_storage", "Webshop quota cannot exceed physical storage ({{max}} units)", { max: maxStorage }));
      setWebshopStock(String(maxStorage));
    } else {
      setWebshopStock(String(Math.max(0, inputNum)));
    }
  };

  // Set mounted flag on component mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const reloadProductDetails = async () => {
    if (isDraftMode && draftId) {
      try {
        const apiUrl = getApiV1Url();
        const res = await fetch(`${apiUrl}/ai/drafts/${draftId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        });
        const data = await res.json();
        if (data.success && data.draft?.payload) {
          applyDraftToForm(data.draft.payload);
        }
      } catch (err) {
        console.error("Failed to reload draft details:", err);
      }
    } else if (id && id !== "new") {
      try {
        const data = await productRepository.getByIdOrSlug(id);
        if (data.success && data.product) {
          const p = data.product;
          setName(p.title || p.name || "");
          setPrice(String(p.price || ""));
          setOldPrice(p.oldPrice ? String(p.oldPrice) : "");
          setThumbnail(p.image || null);
          setGalleryImages(p.images || (p.image ? [p.image] : []));
          setDescription(p.description || "");
          setShortDescription(p.shortDescription || "");
          setSeoTitle(p.seoTitle || "");
          setSeoDescription(p.seoDesc || p.seoDescription || "");
          setSeoKeywords(p.seoKeywords || "");
          setInStock(p.inStock ?? true);
          setIsNewArrival(p.isNewArrival ?? false);
          setIsBestSelling(p.isBestSelling ?? false);
          safeSetCategory(p.category?.slug || "");
          setSelectedBrand(typeof p.brand === "string" ? p.brand : (p.brand?.name || ""));

          const initialAttrVals: Record<string, string[]> = {};
          if (p.productAttributeValues) {
            p.productAttributeValues.forEach((pav: any) => {
              const slug = pav.attribute.slug;
              const value = pav.attributeValue.value;
              if (!initialAttrVals[slug]) {
                initialAttrVals[slug] = [];
              }
              initialAttrVals[slug].push(value);
            });
          }
          setSelectedAttributeValues(initialAttrVals);

          let foundNumLights = "";
          let foundSeries = "";
          if (Array.isArray(p.specs)) {
            p.specs.forEach((s: any) => {
              if (s && s.key === "Number of lights") foundNumLights = String(s.value);
              if (s && s.key === "Series") foundSeries = String(s.value);
            });
          }
          setNumberOfLights(foundNumLights);
          setSelectedSeries(foundSeries || "none");

          const parsed = parseSpecs(p.specs || {});
          setSpecs(parsed.length > 0 ? parsed : DEFAULT_SPECS_STRUCTURE);

          const firstVariant = p.variants?.[0];
          const firstInv = firstVariant?.inventoryItems?.[0];
          if (firstInv) {
            setStorageStock(String(firstInv.quantityOnHand ?? 10));
            setWebshopStock(String(firstInv.webshopAllocated ?? 5));
            setBinLocation(firstInv.binLocation || "A-01-1");
            setLowStockThreshold(String(firstInv.reorderPoint ?? p.lowStockThreshold ?? 5));
            setCurrentInventoryItem({
              ...firstInv,
              variant: {
                ...firstVariant,
                product: p,
              },
            });
          } else if (firstVariant) {
            setStorageStock(String(firstVariant.stock ?? 10));
            setWebshopStock(String(firstVariant.stock ?? 5));
            setLowStockThreshold(String(p.lowStockThreshold ?? 5));
          }

          if (p.siblings && Array.isArray(p.siblings)) {
            setLinkedSiblings(p.siblings.filter((s: any) => s.id !== p.id));
          }
        }
      } catch (err) {
        console.error("Failed to reload product details:", err);
      }
    }
  };

  // Recover active AI image regeneration on refresh/mount
  useEffect(() => {
    const activeRegenStr = localStorage.getItem("active_regen");
    if (!activeRegenStr) return;
    try {
      const activeRegen = JSON.parse(activeRegenStr);
      const currentId = draftId || id;
      const isFresh = activeRegen.timestamp && Date.now() - activeRegen.timestamp < 60000;
      if (!isFresh || activeRegen.id !== currentId) {
        localStorage.removeItem("active_regen");
        return;
      }
      if (activeRegen.id === currentId) {
        if (activeRegen.targetIndex !== null) {
          setRegeneratingIndexes([activeRegen.targetIndex]);
        } else {
          setIsGlobalRegenerating(true);
        }


        let attempts = 0;
        const intervalId = setInterval(async () => {
          attempts += 1;
          if (attempts > 20) { // 60s timeout
            clearInterval(intervalId);
            localStorage.removeItem("active_regen");
            setIsGlobalRegenerating(false);
            setRegeneratingIndexes([]);
            return;
          }

          try {
            const apiUrl = getApiV1Url();
            const fetchUrl = draftId
              ? `${apiUrl}/ai/drafts/${draftId}`
              : `${apiUrl}/products/${id}`;
            const res = await fetch(fetchUrl, {
              headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
            });
            if (!res.ok) return;
            const data = await res.json();

            let serverImages: string[] = [];
            if (draftId && data.success && data.draft) {
              serverImages = data.draft.payload?.images || [];
            } else if (!draftId && data.success && data.product) {
              serverImages = data.product.images || [];
            }

            const starting = activeRegen.startingImages || [];
            const hasChanged = serverImages.length !== starting.length ||
              serverImages.some((img, idx) => img !== starting[idx]);

            if (hasChanged && serverImages.length > 0) {
              clearInterval(intervalId);
              localStorage.removeItem("active_regen");
              setGalleryImages(serverImages);
              if (serverImages[0]) {
                setThumbnail(prev => {
                  if (activeRegen.targetIndex === 0 || !prev || prev === starting[0]) {
                    return serverImages[0];
                  }
                  return prev;
                });
              }
              setIsGlobalRegenerating(false);
              setRegeneratingIndexes([]);
              toast.success("AI images regenerated successfully!");
            }
          } catch (e) {
            console.error("Error polling AI image regen status:", e);
          }
        }, 3000);

        return () => clearInterval(intervalId);
      }
    } catch (e) {
      console.error("Failed to recover AI image regeneration session:", e);
    }
  }, [id, draftId]);

  // Poll background optimization job status
  useEffect(() => {
    if (!id || id === "new") return;

    let intervalId: any;
    let toastId: string | null = null;

    const checkJobStatus = async () => {
      try {
        const apiUrl = getApiV1Url();
        const res = await fetch(`${apiUrl}/ai/seo/job`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.success && data.job) {
          const { type, status, progress, targetEntityId, error } = data.job;

          if (
            ((type === "product_optimize" || type === "bulk_product_edit") && (!targetEntityId || targetEntityId === id))
          ) {
            if (status === "queued" || status === "running") {
              setIsOptimizing(true);
              const label = progress?.label || "AI is updating product according to SOP...";

              if (!toastId) {
                toastId = "product-optimize-toast";
                toast.loading(`AI Quick Edit: ${label}`, { id: toastId });
              } else {
                toast.loading(`AI Quick Edit: ${label}`, { id: toastId });
              }
            } else if (status === "completed") {
              setIsOptimizing(false);
              if (toastId) {
                toast.success(data.job.summary || "AI Quick Edit applied successfully! Product updated.", { id: toastId });
                toastId = null;
              }
              await fetch(`${apiUrl}/ai/seo/job/dismiss`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
              });
              await reloadProductDetails();
              if (intervalId) clearInterval(intervalId);
            } else if (status === "failed") {
              setIsOptimizing(false);
              if (toastId) {
                toast.error(error || t("admin_product_form.optimize_toast_error"), { id: toastId });
                toastId = null;
              }
              await fetch(`${apiUrl}/ai/seo/job/dismiss`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
              });
              if (intervalId) clearInterval(intervalId);
            }
          } else {
            setIsOptimizing(false);
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error("Failed to check background AI job status:", err);
      }
    };

    checkJobStatus();
    intervalId = setInterval(checkJobStatus, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, draftId]);

  const handleTriggerOptimize = async () => {
    if (!optimizePromptText.trim()) {
      toast.error("Please describe what is wrong or what needs fixing.");
      return;
    }

    setOptimizePromptOpen(false);
    setIsOptimizing(true);
    const toastId = "product-optimize-toast";
    toast.loading("Queueing AI Edit in background queue...", { id: toastId });

    try {
      const apiUrl = getApiV1Url();
      const res = await fetch(`${apiUrl}/ai/products/bulk-edit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productIds: [id],
          issuePrompt: optimizePromptText.trim(),
          scope: "selected",
          fields: quickEditFields
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.alreadyRunning) {
          toast.warning("An AI job is already running in background queue. Tracking progress...", { id: toastId });
        } else {
          toast.info("AI Quick Edit queued in background queue scheme! Processing...", { id: toastId });
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setIsOptimizing(false);
      toast.error(err.message || t("admin_product_form.optimize_toast_error"), { id: toastId });
    }
  };

  // Load brands, categories, attributes, series
  useEffect(() => {
    const loadMetadata = async () => {
      setIsMetadataLoading(true);
      try {
        // 1. Brands
        try {
          const data = await brandRepository.getAll();
          if (data.success && data.brands) setBrands(data.brands);
        } catch (e) {
          const saved = localStorage.getItem("brands_data");
          if (saved) setBrands(JSON.parse(saved));
          else {
            const { brands: initialBrands } = await import("@/data/brands");
            setBrands(initialBrands);
          }
        }

        // 1.5. Series
        try {
          const data = await seriesRepository.getAll();
          if (data.success && data.series) {
            setSeriesList(data.series);
          } else {
            throw new Error("Failed to fetch series");
          }
        } catch (e) {
          const savedSeries = localStorage.getItem("series_data");
          if (savedSeries) {
            try {
              setSeriesList(JSON.parse(savedSeries));
            } catch (err) {
              const { series: initialSeries } = await import("@/data/brands");
              setSeriesList(initialSeries);
            }
          } else {
            const { series: initialSeries } = await import("@/data/brands");
            setSeriesList(initialSeries);
          }
        }


        // 2. Categories
        try {
          const data = await categoryRepository.getAll();
          if (data.success && data.categories) {
            setCategoriesList(data.categories);
            setSelectedCategory((prev) => {
              if (!prev) return prev;
              const resolved = resolveCategorySlug(prev, data.categories);
              const parent = data.categories.find((p: any) => p.slug === resolved || p.id === prev);
              const isParent = parent && data.categories.some((ch: any) => ch.parentId === parent.id);
              if (isParent) {
                const firstChild = data.categories.find((ch: any) => ch.parentId === parent.id);
                return (firstChild as any)?.slug || resolved;
              }
              return resolved;
            });
          }
        } catch (e) {
          const saved = localStorage.getItem("categories_data");
          if (saved) {
            const parsed = JSON.parse(saved);
            setCategoriesList(parsed);
            setSelectedCategory((prev) => prev ? resolveCategorySlug(prev, parsed) : prev);
          } else {
            const { categories: initialCategories } = await import("@/data/categories");
            setCategoriesList(initialCategories);
            setSelectedCategory((prev) => prev ? resolveCategorySlug(prev, initialCategories) : prev);
          }
        }

        // 3. Attributes
        try {
          const data = await attributeRepository.getAll();
          if (data.success && data.attributes) {
            const mapped = data.attributes.map((a: any) => ({
              id: a.id,
              name: a.name,
              slug: a.slug,
              type: a.type,
              values: a.attributeValues || [],
              visibility: a.visibility || "both",
            }));
            setAttributes(mapped);
          }
        } catch (e) {
          const saved = localStorage.getItem("attributes_data");
          if (saved) setAttributes(JSON.parse(saved));
          else {
            const { attributes: initialAttributes } = await import("@/data/attributes");
            setAttributes(initialAttributes);
          }
        }
      } finally {
        setIsMetadataLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Reset series when brand changes
  useEffect(() => {
    if (brands.length === 0 || seriesList.length === 0) return; // Wait for metadata to load

    if (!selectedBrand) {
      if (selectedSeries !== "") setSelectedSeries("");
      return;
    }
    const brandId = brands.find((b) => b.name === selectedBrand)?.id;
    const seriesBelongsToBrand = seriesList.some(
      (s) => s.name === selectedSeries && s.brandId === brandId
    );
    if (!seriesBelongsToBrand && selectedSeries !== "none" && selectedSeries !== "") {
      setSelectedSeries("");
    }
  }, [selectedBrand, brands, seriesList, selectedSeries]);

  const DEFAULT_SPECS_STRUCTURE: SpecItem[] = [];

  const parseSpecs = (specsObj: any): SpecItem[] => {
    if (Array.isArray(specsObj)) {
      return specsObj
        .filter(s => s.key !== "Number of lights" && s.key !== "Series")
        .map(s => ({ ...s, id: s.id || `item-${Math.random()}` }));
    }

    // Legacy support
    if (typeof specsObj === "object" && specsObj !== null) {
      const items: SpecItem[] = [];
      Object.entries(specsObj).forEach(([fullKey, val]) => {
        let key = fullKey;
        if (fullKey.includes("::")) key = fullKey.split("::")[1];
        if (key === "Number of lights" || key === "Series") return;
        items.push({ id: `item-${Math.random()}`, key, value: String(val) });
      });
      return items.length > 0 ? items : DEFAULT_SPECS_STRUCTURE;
    }
    return DEFAULT_SPECS_STRUCTURE;
  };

  const serializeSpecs = (items: SpecItem[]): any[] => {
    return items.filter(item => item.key.trim()).map(item => ({
      key: item.key.trim(),
      value: item.value.trim(),
      link: item.link?.trim() || ""
    }));
  };

  // Maps Dutch/alternative attribute names → canonical DB slug
  const ATTR_ALIAS_MAP: Record<string, string> = {
    // fitting / bulb socket
    "fitting": "fitting", "bulb-fitting": "fitting", "socket": "fitting",
    "type-lichtbron": "fitting", "lichtbron": "fitting", "fitting-type": "fitting",
    "lamp-fitting": "fitting", "lampfitting": "fitting", "fassung": "fitting",
    // color
    "color": "color", "colour": "color", "kleur": "color", "farbe": "color",
    "afwerking": "color", "finish": "color",
    // dimmable
    "dimmable": "dimmable", "dimbaar": "dimmable", "dimmbar": "dimmable",
    // material
    "material": "material", "materiaal": "material", "materials": "material",
    // style
    "style": "style", "stijl": "style", "stil": "style",
    // room
    "room": "room", "ruimte": "room", "kamer": "room", "rooms": "room",
    // ip-rating
    "ip-rating": "ip-rating", "ip": "ip-rating", "ip-waarde": "ip-rating",
    // diameter
    "diameter": "diameter",
    // length
    "length": "length", "lengte": "length",
    // width
    "width": "width", "breedte": "width",
  };

  // Normalize fitting values: G10 not in DB → closest match GU10
  const FITTING_ALIAS: Record<string, string> = {
    "g10": "GU10", "gu10": "GU10",
    "e27": "E27", "e14": "E14", "g9": "G9",
    "integrated led": "Integrated LED", "integrated-led": "Integrated LED",
    "geïntegreerd led": "Integrated LED",
  };

  const resolveAttrSlug = (raw: string): string => {
    const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return ATTR_ALIAS_MAP[slug] || ATTR_ALIAS_MAP[raw.toLowerCase()] || slug;
  };

  const normalizeAttrValue = (slug: string, val: string): string => {
    if (slug === "fitting") {
      const normalized = FITTING_ALIAS[val.toLowerCase().trim()];
      return normalized || val;
    }
    return val;
  };

  const applyDraftToForm = (draft: Record<string, any>) => {
    setName(draft.name || "");
    setPrice(String(draft.price || ""));
    setThumbnail(draft.image || null);
    setGalleryImages(Array.isArray(draft.images) ? draft.images : []);
    setDescription(draft.description || "");
    setShortDescription(draft.shortDescription || "");
    setInStock(draft.inStock ?? true);

    // Resolve category slug — match by slug, alias, id OR name (case-insensitive)
    const rawCat = (draft.category || draft.categorySlug || draft.categoryId || "").trim();
    if (rawCat) {
      safeSetCategory(rawCat);
    } else {
      safeSetCategory("");
    }

    setSelectedBrand(draft.brand || "");
    setSeoTitle(draft.seoTitle || "");
    setSeoDescription(draft.seoDescription || "");
    setSeoKeywords(draft.seoKeywords || "");

    // ── Parse EAV Attribute Values ──────────────────────────────────────────
    // Use alias map to normalize keys → DB slugs and values → allowed values
    const initialAttrVals: Record<string, string[]> = {};

    const addAttrVal = (rawKey: string, rawVals: string[]) => {
      const slug = resolveAttrSlug(rawKey);
      const normalized = rawVals.map(v => normalizeAttrValue(slug, v)).filter(Boolean);
      if (normalized.length > 0) {
        initialAttrVals[slug] = normalized;
      }
    };

    // 1. From draft.attributes (AI-generated, should now use DB slugs directly)
    if (draft.attributes && typeof draft.attributes === "object") {
      Object.entries(draft.attributes).forEach(([key, val]) => {
        const valArr = Array.isArray(val) ? val.map(String) : [String(val)];
        addAttrVal(key, valArr);
      });
    }

    // 2. From draft.specs (fallback: scan for known attribute keys)
    if (Array.isArray(draft.specs)) {
      draft.specs.forEach((s: any) => {
        if (s && s.key && s.value) {
          const slug = resolveAttrSlug(s.key);
          // Only add if slug is a known DB attribute and not already set from draft.attributes
          if (ATTR_ALIAS_MAP[slug] !== undefined || Object.values(ATTR_ALIAS_MAP).includes(slug)) {
            if (!initialAttrVals[slug]) {
              addAttrVal(s.key, [String(s.value)]);
            }
          }
        }
      });
    }

    setSelectedAttributeValues(initialAttrVals);

    const parsed = parseSpecs(draft.specs || {});
    parsed.forEach((s) => {
      if (s.key === "Number of lights") setNumberOfLights(s.value);
    });

    let draftSeries = "";
    if (draft.series) draftSeries = draft.series;
    else if (draft.seriesName) draftSeries = draft.seriesName;
    else if (draft.seriesSlug) draftSeries = draft.seriesSlug;
    else if (Array.isArray(draft.specs)) {
      const sItem = draft.specs.find((s: any) => s && (s.key === "Series" || s.key === "Collection" || s.key === "Collectie"));
      if (sItem) draftSeries = sItem.value;
    }
    if (draftSeries && draftSeries !== "null" && draftSeries !== "none") {
      setSelectedSeries(draftSeries);
    } else {
      setSelectedSeries("none");
    }

    setSpecs(parsed.length > 0 ? parsed : DEFAULT_SPECS_STRUCTURE);
    if (draft.storageStock !== undefined) setStorageStock(String(draft.storageStock));
    if (draft.webshopStock !== undefined) setWebshopStock(String(draft.webshopStock));
    if (draft.binLocation) setBinLocation(draft.binLocation);
    if (draft.lowStockThreshold !== undefined) setLowStockThreshold(String(draft.lowStockThreshold));
    if (draft.colorGroupId) setColorGroupId(draft.colorGroupId);
    if (draft.variants && Array.isArray(draft.variants) && draft.variants.length > 0) {
      setHasVariants(true);
      setProductVariants(
        draft.variants.map((v: any) => ({
          id: v.id,
          sizeName: v.sizeName || v.sku || "",
          price: v.price !== null && v.price !== undefined ? String(v.price) : "",
          stock: v.stock !== undefined ? String(v.stock) : "10",
          sku: v.sku || "",
        }))
      );
    }
    toast.info(t("admin_product_form.draft_loaded"));
  };

  // Load existing product details (if Edit mode or Draft mode)
  useEffect(() => {
    if (isDraftMode && draftId) {
      const loadDraft = async () => {
        setIsProductLoading(true);
        try {
          const apiUrl = getApiV1Url();
          const res = await fetch(`${apiUrl}/ai/drafts/${draftId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
          });
          const data = await res.json();
          if (data.success && data.draft?.payload) {
            applyDraftToForm(data.draft.payload);
          } else {
            toast.error(t("admin_product_form.draft_load_failed"));
            navigate("/admin/product-drafts");
          }
        } catch {
          toast.error(t("admin_product_form.draft_load_failed"));
        } finally {
          setIsProductLoading(false);
        }
      };
      loadDraft();
      return;
    }

    if (!isEdit) {
      const draft = location.state?.draft;
      if (draft) {
        applyDraftToForm(draft);
      } else {
        setSpecs(DEFAULT_SPECS_STRUCTURE);
        setNumberOfLights("");
        setSelectedSeries("");
      }
      return;
    }

    const loadProduct = async () => {
      setIsProductLoading(true);
      try {
        // 1. Try backend
        try {
          const data = await productRepository.getByIdOrSlug(id);
          if (data.success && data.product) {
            const p = data.product;
            setName(p.title || p.name || "");
            setPrice(String(p.price || ""));
            setOldPrice(p.oldPrice ? String(p.oldPrice) : "");
            setThumbnail(p.image || null);
            setGalleryImages(p.images || (p.image ? [p.image] : []));
            setDescription(p.description || "");
            setShortDescription(p.shortDescription || "");
            setSeoTitle(p.seoTitle || "");
            setSeoDescription(p.seoDescription || "");
            setSeoKeywords(p.seoKeywords || "");
            setInStock(p.inStock ?? true);
            setIsNewArrival(p.isNewArrival ?? false);
            setIsBestSelling(p.isBestSelling ?? false);
            safeSetCategory(p.category?.slug || "");
            setSelectedBrand(typeof p.brand === "string" ? p.brand : (p.brand?.name || ""));

            // Parse existing EAV attribute values
            const initialAttrVals: Record<string, string[]> = {};
            if (p.productAttributeValues) {
              p.productAttributeValues.forEach((pav: any) => {
                const slug = pav.attribute.slug;
                const value = pav.attributeValue.value;
                if (!initialAttrVals[slug]) {
                  initialAttrVals[slug] = [];
                }
                initialAttrVals[slug].push(value);
              });
            }
            setSelectedAttributeValues(initialAttrVals);

            // Parse specs
            let foundNumLights = "";
            let foundSeries = "";
            if (Array.isArray(p.specs)) {
              p.specs.forEach((s: any) => {
                if (s && s.key === "Number of lights") foundNumLights = String(s.value);
                if (s && s.key === "Series") foundSeries = String(s.value);
              });
            } else {
              Object.entries(p.specs || {}).forEach(([k, val]) => {
                const cleanKey = k.includes("::") ? k.split("::")[1] : k;
                if (cleanKey === "Number of lights") {
                  foundNumLights = String(val);
                }
                if (cleanKey === "Series") {
                  foundSeries = String(val);
                }
              });
            }
            setNumberOfLights(foundNumLights);
            setSelectedSeries(foundSeries || "none");

            const parsed = parseSpecs(p.specs || {});
            setSpecs(parsed.length > 0 ? parsed : DEFAULT_SPECS_STRUCTURE);

            const firstVariant = p.variants?.[0];
            const firstInv = firstVariant?.inventoryItems?.[0];
            if (firstInv) {
              setStorageStock(String(firstInv.quantityOnHand ?? 10));
              setWebshopStock(String(firstInv.webshopAllocated ?? 5));
              setBinLocation(firstInv.binLocation || "A-01-1");
              setLowStockThreshold(String(firstInv.reorderPoint ?? p.lowStockThreshold ?? 5));
              setCurrentInventoryItem({
                ...firstInv,
                variant: {
                  ...firstVariant,
                  product: p,
                },
              });
            } else if (firstVariant) {
              setStorageStock(String(firstVariant.stock ?? 10));
              setWebshopStock(String(firstVariant.stock ?? 5));
              setLowStockThreshold(String(p.lowStockThreshold ?? 5));
            }

            if (p.colorGroupId) {
              setColorGroupId(p.colorGroupId);
            }

            if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
              const hasMultipleOrSized = p.variants.length > 1 || p.variants.some((v: any) => v.sizeName && v.sizeName !== "Default");
              if (hasMultipleOrSized) {
                setHasVariants(true);
                setProductVariants(
                  p.variants.map((v: any) => ({
                    id: v.id,
                    sizeName: v.sizeName && v.sizeName !== "Default" ? v.sizeName : (v.sku || ""),
                    price: v.price !== null && v.price !== undefined ? String(v.price) : "",
                    stock: v.stock !== undefined ? String(v.stock) : "10",
                    sku: v.sku || "",
                  }))
                );
              }
            }

            if (p.siblings && Array.isArray(p.siblings)) {
              setLinkedSiblings(p.siblings.filter((s: any) => s.id !== p.id));
            }
            return;
          }
        } catch (e) {
          console.warn("Backend API not reachable for product fetch, using local fallback.");
        }

        // 2. Try localStorage / static mockup fallback
        const savedProducts = localStorage.getItem("products_data");
        let allProducts = [];
        if (savedProducts) {
          try { allProducts = JSON.parse(savedProducts); } catch (e) { }
        } else {
          const { products: initialProducts } = await import("@/data/products");
          allProducts = initialProducts;
        }

        const p = allProducts.find((x: any) => String(x.id) === id);
        if (p) {
          setName(p.name || "");
          setPrice(String(p.price || ""));
          setOldPrice(p.oldPrice ? String(p.oldPrice) : "");
          setThumbnail(p.image || null);
          setGalleryImages(p.images || (p.image ? [p.image] : []));
          setDescription(p.description || "");
          setShortDescription(p.shortDescription || "");
          setSeoTitle(p.seoTitle || "");
          setSeoDescription(p.seoDescription || "");
          setSeoKeywords(p.seoKeywords || "");
          setInStock(p.inStock ?? true);
          setIsNewArrival(p.isNewArrival ?? false);
          setIsBestSelling(p.isBestSelling ?? false);
          safeSetCategory(p.category || "");
          setSelectedBrand(p.brand || "");

          // Initialize from local flat fields
          const initialAttrVals: Record<string, string[]> = {};
          if (p.color) initialAttrVals["color"] = [p.color];
          if (p.material) initialAttrVals["material"] = [p.material];
          if (p.style) initialAttrVals["style"] = [p.style];
          if (p.fitting) initialAttrVals["fitting"] = [p.fitting];
          setSelectedAttributeValues(initialAttrVals);

          // Parse specs
          let foundNumLights = "";
          let foundSeries = "";
          if (Array.isArray(p.specs)) {
            p.specs.forEach((s: any) => {
              if (s && s.key === "Number of lights") foundNumLights = String(s.value);
              if (s && s.key === "Series") foundSeries = String(s.value);
            });
          } else {
            Object.entries(p.specs || {}).forEach(([k, val]) => {
              const cleanKey = k.includes("::") ? k.split("::")[1] : k;
              if (cleanKey === "Number of lights") {
                foundNumLights = String(val);
              }
              if (cleanKey === "Series") {
                foundSeries = String(val);
              }
            });
          }
          setNumberOfLights(foundNumLights);
          setSelectedSeries(foundSeries || "none");

          const parsed = parseSpecs(p.specs || {});
          setSpecs(parsed.length > 0 ? parsed : DEFAULT_SPECS_STRUCTURE);
        }
      } finally {
        setIsProductLoading(false);
      }
    };

    loadProduct();
  }, [id, isEdit]);

  const handleAddItem = () => {
    if (!newParamName.trim()) {
      toast.error(t("admin_product_form.toast_param_name_empty"));
      return;
    }
    setSpecs((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        key: newParamName.trim(),
        value: "",
        link: ""
      }
    ]);
    setNewParamName("");
    toast.success(t("admin_product_form.toast_param_added", { name: newParamName.trim() }));
  };

  const handleUpdateItemKey = (itemId: string, newKey: string) => {
    setSpecs((prev) => prev.map((item) => item.id === itemId ? { ...item, key: newKey } : item));
  };

  const handleUpdateItemValue = (itemId: string, newVal: string) => {
    setSpecs((prev) => prev.map((item) => item.id === itemId ? { ...item, value: newVal } : item));
  };

  const handleUpdateItemLink = (itemId: string, newLink: string) => {
    setSpecs((prev) => prev.map((item) => item.id === itemId ? { ...item, link: newLink } : item));
  };

  const handleDeleteItem = (itemId: string) => {
    setSpecs((prev) => prev.filter((item) => item.id !== itemId));
  };

  const moveSpecItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === specs.length - 1) return;

    setSpecs((prev) => {
      const newSpecs = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = newSpecs[targetIndex];
      newSpecs[targetIndex] = newSpecs[index];
      newSpecs[index] = temp;
      return newSpecs;
    });
  };

  if (!hasPermission("products")) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p>{t("admin_product_form.no_permission")}</p>
      </div>
    );
  }

  const isLoading = isMetadataLoading || (isEdit && isProductLoading);

  if (isLoading) {
    return (

      <div className="container-page space-y-8 pb-12">

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4 w-full">
            <Skeleton className="rounded-full shrink-0 h-10 w-10" />
            <div className="space-y-2 flex-grow">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT COLUMN — Main Forms (2/3 Width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-6">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-64" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </Card>

            {/* Description Card */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-4">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-72" />
              </div>
              <Skeleton className="h-48 w-full" />
            </Card>

            {/* Media & Gallery Uploads */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-4">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3.5 w-56" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <div className="md:col-span-2 space-y-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-6">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-3.5 w-60" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Filter which attributes are visible based on selected category attributes relation
  const visibleAttributes = attributes.filter((attr) => {
    if (attr.visibility === "filter") return false;

    const activeCatObj = categoriesList.find((c) => c.slug === selectedCategory);

    // DB categories attributes mapping
    if (activeCatObj?.categoryAttributes && activeCatObj.categoryAttributes.length > 0) {
      return activeCatObj.categoryAttributes.some((ca: any) => ca.attribute.slug === attr.slug);
    }

    return true; // Show all if category has no specific mappings defined
  });

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsThumbnail = (src: string) => {
    setThumbnail(src);
    toast.success(t("admin_product_form.toast_thumbnail_updated"));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submittingRef.current || isSubmitting) {
      return;
    }

    if (!name.trim()) {
      toast.error(t("admin_product_form.toast_name_required"));
      return;
    }
    if (!selectedCategory) {
      toast.error(t("admin_product_form.toast_category_required"));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const serializedSpecs = serializeSpecs(specs);
      if (numberOfLights) {
        serializedSpecs.push({ key: "Number of lights", value: numberOfLights, link: "" });
      }
      if (selectedSeries && selectedSeries !== "none") {
        serializedSpecs.push({ key: "Series", value: selectedSeries, link: "" });
      }

      // Build flat parameters payload & backend relational EAV mapping
      const finalBrand = selectedBrand && selectedBrand !== "none" ? selectedBrand : "";
      const finalBrandId = selectedBrand && selectedBrand !== "none" ? brands.find((b) => b.name === selectedBrand)?.id || null : null;

      const matchedCat = categoriesList.find(
        (c) => c.slug === selectedCategory || c.id === selectedCategory || c.name?.toLowerCase() === selectedCategory?.toLowerCase()
      );
      const finalCategoryId = matchedCat?.id || categoriesList[0]?.id || null;

      const payload = {
        title: name,
        name: name,
        brand: finalBrand,
        brandId: finalBrandId,
        category: matchedCat?.slug || selectedCategory || "",
        categoryId: finalCategoryId,
        price: parseFloat(price) || 0,
        oldPrice: oldPrice ? parseFloat(oldPrice) : null,
        inStock,
        isNewArrival,
        isBestSelling,
        storageStock: Math.max(0, parseInt(storageStock, 10) || 0),
        webshopStock: Math.min(Math.max(0, parseInt(storageStock, 10) || 0), Math.max(0, parseInt(webshopStock, 10) || 0)),
        binLocation: binLocation.trim() || "A-01-1",
        lowStockThreshold: Math.max(1, parseInt(lowStockThreshold, 10) || 5),
        description,
        shortDescription,
        seoTitle,
        seoDescription,
        seoKeywords,
        image: thumbnail || "",
        images: galleryImages,
        attributes: selectedAttributeValues, // EAV dynamic mapping
        specs: serializedSpecs,
        colorGroupId: colorGroupId || undefined,
        siblingProductIds: linkedSiblings.map((s) => s.id),
        variants: hasVariants
          ? productVariants
              .filter((v) => v.sizeName.trim().length > 0)
              .map((v) => ({
                id: v.id,
                sku: v.sku.trim() || undefined,
                price: v.price.trim() ? parseFloat(v.price) : null,
                stock: parseInt(v.stock, 10) || 0,
                sizeName: v.sizeName.trim(),
                attributes: { size: v.sizeName.trim() },
              }))
          : [],
      };

      // 1. Try saving to backend API
      try {
        const data = isEdit
          ? await productRepository.update(id, payload)
          : await productRepository.create(payload);

        if (data.success) {
          if (isDraftMode && draftId) {
            try {
              const apiUrl = getApiV1Url();
              await fetch(`${apiUrl}/ai/drafts/${draftId}/published`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
              });
            } catch {
              /* non-blocking */
            }
          }
          toast.success(isEdit ? t("admin_product_form.toast_product_updated", { name }) : t("admin_product_form.toast_product_created", { name }));
          navigate("/admin/products");
          return;
        } else {
          throw new Error(data.message || data.error || "Failed to save product");
        }
      } catch (err: any) {
        console.error("Backend API save failed:", err);
        toast.error(err.message || "Failed to save product to database. Please check required fields.");
        return;
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/products")}
            className="rounded-full shrink-0 h-10 w-10 border-border/80 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {isEdit ? t("admin_product_form.header_edit_title") : t("admin_product_form.header_create_title")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 font-medium">
              {isEdit
                ? t("admin_product_form.header_edit_subtitle")
                : t("admin_product_form.header_create_subtitle")}
            </p>
          </div>
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOptimizePromptOpen(true)}
              disabled={isOptimizing}
              className="gap-2 rounded-full border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium transition-all shadow-sm"
            >
              {isOptimizing ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              ) : (
                <Sparkles className="h-4 w-4 text-amber-500" />
              )}
              <span>{isOptimizing ? "AI Editing..." : "Quick Edit (AI)"}</span>
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* LEFT COLUMN — Main Forms (2/3 Width) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Basic Info */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">{t("admin_product_form.basic_title")}</CardTitle>
                <CardDescription className="text-xs">{t("admin_product_form.basic_subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_name")}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("admin_product_form.placeholder_name")}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="brand" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_brand")}</Label>
                    {isMounted && (
                      <Select value={selectedBrand || "none"} onValueChange={setSelectedBrand}>
                        <SelectTrigger className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                          <SelectValue placeholder={t("admin_product_form.placeholder_brand")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none" className="text-xs rounded-lg italic text-muted-foreground">
                            {t("admin_product_form.brand_none") || "None"}
                          </SelectItem>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.name} className="text-xs rounded-lg">
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="series" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_series")}</Label>
                    {isMounted && (
                      <Select
                        value={selectedSeries || "none"}
                        onValueChange={setSelectedSeries}
                        disabled={!selectedBrand || selectedBrand === "none"}
                      >
                        <SelectTrigger className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                          <SelectValue placeholder={selectedBrand ? t("admin_product_form.placeholder_series_select") : t("admin_product_form.placeholder_series_first")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none" className="text-xs rounded-lg italic text-muted-foreground">
                            {t("admin_product_form.series_none")}
                          </SelectItem>
                          {seriesList
                            .filter((s) => {
                              const brandId = brands.find((b) => b.name === selectedBrand)?.id;
                              return s.brandId === brandId;
                            })
                            .map((s) => (
                              <SelectItem key={s.id} value={s.name} className="text-xs rounded-lg">
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_price")}</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={t("admin_product_form.placeholder_price")}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oldPrice" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_old_price")}</Label>
                    <Input
                      id="oldPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={oldPrice}
                      onChange={(e) => setOldPrice(e.target.value)}
                      placeholder={t("admin_product_form.placeholder_old_price")}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numberOfLights" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_num_lights")}</Label>
                    <Input
                      id="numberOfLights"
                      value={numberOfLights}
                      onChange={(e) => setNumberOfLights(e.target.value)}
                      placeholder={t("admin_product_form.placeholder_num_lights")}
                      list="lights-list"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                    <datalist id="lights-list">
                      {["1", "2", "3", "4", "5", "6", "8", "10", "12", "15", "20"].map((num) => (
                        <option key={num} value={num} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center justify-between rounded-lg border border-muted-foreground/20 bg-background/20 px-3.5 h-10">
                      <Label htmlFor="inStock" className="text-xs font-bold text-foreground/80 cursor-pointer">{t("admin_product_form.label_in_stock")}</Label>
                      <Switch id="inStock" checked={inStock} onCheckedChange={setInStock} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between rounded-lg border border-muted-foreground/20 bg-background/20 px-3.5 h-10">
                    <Label htmlFor="isNewArrival" className="text-xs font-bold text-foreground/80 cursor-pointer">{t("admin_product_form.label_new_arrival")}</Label>
                    <Switch id="isNewArrival" checked={isNewArrival} onCheckedChange={setIsNewArrival} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-muted-foreground/20 bg-background/20 px-3.5 h-10">
                    <Label htmlFor="isBestSelling" className="text-xs font-bold text-foreground/80 cursor-pointer">{t("admin_product_form.label_best_seller")}</Label>
                    <Switch id="isBestSelling" checked={isBestSelling} onCheckedChange={setIsBestSelling} />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="shortDescription" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_short_desc")}</Label>
                  <RichTextEditor
                    value={shortDescription}
                    onChange={setShortDescription}
                    placeholder={t("admin_product_form.placeholder_short_desc")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">{t("admin_product_form.seo_title")}</CardTitle>
                <CardDescription className="text-xs">{t("admin_product_form.seo_subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="seoTitle" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_seo_title")}</Label>
                    <Input
                      id="seoTitle"
                      value={seoTitle}
                      onChange={e => setSeoTitle(e.target.value)}
                      placeholder={t("admin_product_form.placeholder_seo_title")}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="seoKeywords" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_seo_keywords")}</Label>
                    <Input
                      id="seoKeywords"
                      value={seoKeywords}
                      onChange={e => setSeoKeywords(e.target.value)}
                      placeholder={t("admin_product_form.placeholder_seo_keywords")}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 mt-4">
                  <Label htmlFor="seoDescription" className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_seo_desc")}</Label>
                  <Input
                    id="seoDescription"
                    value={seoDescription}
                    onChange={e => setSeoDescription(e.target.value)}
                    placeholder={t("admin_product_form.placeholder_seo_desc")}
                    className="h-16 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">{t("admin_product_form.desc_title")}</CardTitle>
                <CardDescription className="text-xs">{t("admin_product_form.desc_subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="prose-sm dark:prose-invert">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={t("admin_product_form.desc_placeholder")}
                />
              </CardContent>
            </Card>

            {/* Media & Gallery (Combined Thumbnail & Gallery Images) */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">{t("admin_product_form.media_title")}</CardTitle>
                <CardDescription className="text-xs">{t("admin_product_form.media_subtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Thumbnail / Cover Image */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_cover")}</Label>
                    <div
                      className={cn(
                        "relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary bg-muted/40 backdrop-blur-sm flex items-center justify-center cursor-pointer group transition-all duration-300 hover:bg-muted/60",
                        thumbnail && "border-solid border-border bg-muted/50"
                      )}
                      onClick={() => setMediaDialogTarget("thumbnail")}
                    >
                      {thumbnail ? (
                        <>
                          <img src={resolveImgUrl(thumbnail)} alt={t("admin_product_form.alt_thumbnail")} className="h-full w-full object-cover rounded-2xl" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                            <Upload className="h-5 w-5 text-white animate-bounce" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openLightbox(thumbnail); }}
                            className="absolute left-2 top-2 rounded-full bg-background/90 p-1 hover:bg-primary hover:text-white shadow-sm border border-border z-10 transition-colors"
                            title="Zoom Image"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setThumbnail(null); }}
                            className="absolute right-2 top-2 rounded-full bg-background/90 p-1 hover:bg-destructive hover:text-white shadow-sm border border-border z-10 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground p-3">
                          <Upload className="h-6 w-6 mx-auto mb-1 text-primary/80 opacity-60" />
                          <p className="text-[11px] font-semibold text-foreground/80">{t("admin_product_form.upload_cover")}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{t("admin_product_form.upload_hint")}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slider Gallery Grid */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex flex-wrap items-center justify-between pb-1 gap-2">
                      <Label className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_gallery")}</Label>
                      <div className="flex gap-2">
                        {canRegenerate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isGlobalRegenerating || regeneratingIndexes.length > 0}
                            className="h-6 text-[10px] font-bold text-amber-600 border-amber-600/30 gap-1 px-2 hover:bg-amber-600/10 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              setRegenTargetIndex(null);
                              setRegenPromptText("");
                              setRegenPromptOpen(true);
                            }}
                          >
                            {isGlobalRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {t("admin_product_form.regen_ai_images")}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] font-bold text-primary gap-1 px-2 hover:bg-primary/10 transition-colors"
                          onClick={() => setMediaDialogTarget("gallery")}
                        >
                          <Plus className="h-3 w-3" /> {t("admin_product_form.add_images")}
                        </Button>
                      </div>
                    </div>

                    {galleryImages.length === 0 ? (
                      <div
                        className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-2xl h-[120px] text-muted-foreground cursor-pointer hover:border-primary hover:bg-muted/20 transition-all duration-300"
                        onClick={() => setMediaDialogTarget("gallery")}
                      >
                        <ImageIcon className="h-6 w-6 mb-1 text-primary/70 opacity-40 animate-pulse" />
                        <p className="text-[11px] font-semibold text-foreground/80">{t("admin_product_form.no_images_title")}</p>
                        <p className="text-[9px] text-muted-foreground">{t("admin_product_form.no_images_hint")}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {galleryImages.map((src, i) => (
                          <div key={i} className="group relative aspect-square rounded-xl border overflow-hidden bg-muted/50 shadow-sm hover:shadow transition-all duration-300">
                            <img src={resolveImgUrl(src)} alt={t("admin_product_form.alt_gallery_image", { index: i + 1 })} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setAsThumbnail(src)}
                                className="w-full text-[8px] font-bold text-white bg-primary/90 hover:bg-primary rounded-md py-1 transition-colors"
                              >
                                {t("admin_product_form.set_cover")}
                              </button>
                              {canRegenerate && !isGlobalRegenerating && regeneratingIndexes.length === 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRegenTargetIndex(i);
                                    setRegenPromptText("");
                                    setRegenPromptOpen(true);
                                  }}
                                  className="absolute top-1 right-6 rounded-full bg-background/90 text-amber-500 p-0.5 hover:bg-amber-500 hover:text-white transition-colors"
                                  title="Regenerate this image"
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openLightbox(src); }}
                                className="absolute top-1 left-1 rounded-full bg-background/90 p-0.5 hover:bg-primary hover:text-white transition-colors text-foreground"
                                title="Zoom Image"
                              >
                                <Maximize2 className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeGalleryImage(i); }}
                                className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5 hover:bg-destructive hover:text-white transition-colors"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            {thumbnail === src && (
                              <div className="absolute bottom-1 left-1 rounded-md text-[8px] font-extrabold bg-primary text-primary-foreground px-1 py-0.2 shadow-sm">
                                {t("admin_product_form.cover_badge")}
                              </div>
                            )}
                            {regeneratingIndexes.includes(i) && (
                              <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all rounded-xl">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        ))}
                        <div
                          className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:bg-muted/30 transition-all duration-300"
                          onClick={() => setMediaDialogTarget("gallery")}
                        >
                          <Plus className="h-5 w-5 mb-0.5 opacity-45" />
                          <p className="text-[9px] font-semibold">{t("admin_product_form.add_short")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications (Flat Array Editor) */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4 mb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">{t("admin_product_form.specs_title")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("admin_product_form.specs_subtitle")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t("admin_product_form.specs_new_param_placeholder")}
                    value={newParamName}
                    onChange={e => setNewParamName(e.target.value)}
                    className="h-8 text-xs w-48 bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddItem())}
                  />
                  <Button type="button" size="sm" onClick={handleAddItem} className="h-8 px-3 rounded-lg text-xs gap-1 font-bold">
                    <Plus className="w-3.5 h-3.5" /> {t("admin_product_form.specs_add")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="space-y-3">
                  {specs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 italic pl-2 text-center py-4">{t("admin_product_form.specs_empty")}</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {specs.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-muted-foreground/10 group/item hover:border-muted-foreground/30 hover:bg-muted/50 transition-all duration-300">
                          <div className="flex flex-col gap-1 w-8 shrink-0">
                            <button type="button" onClick={() => moveSpecItem(index, 'up')} disabled={index === 0} className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                            <button type="button" onClick={() => moveSpecItem(index, 'down')} disabled={index === specs.length - 1} className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                          </div>

                          <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-3 flex-grow items-center">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">{t("admin_product_form.specs_label_name")}</Label>
                              <Input
                                value={item.key}
                                onChange={(e) => handleUpdateItemKey(item.id, e.target.value)}
                                placeholder={t("admin_product_form.specs_placeholder_name")}
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">{t("admin_product_form.specs_label_value")}</Label>
                              <Input
                                value={item.value}
                                onChange={(e) => handleUpdateItemValue(item.id, e.target.value)}
                                placeholder={t("admin_product_form.specs_placeholder_value")}
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">{t("admin_product_form.specs_label_link")}</Label>
                              <Input
                                value={item.link || ""}
                                onChange={(e) => handleUpdateItemLink(item.id, e.target.value)}
                                placeholder={t("admin_product_form.specs_placeholder_link")}
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg text-primary"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors ml-2"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN — Organisation, EAV Attributes & Sticky Action Panel (1/3 Width) */}
          <div className="space-y-8 lg:sticky lg:top-8">

            {/* Inventory & Warehouse Storage Card */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" />
                    <span>{t("admin_product_form.inventory_title", "Inventory & Storage")}</span>
                  </div>
                  {isEdit && currentInventoryItem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQrModalOpen(true)}
                      className="h-7 px-2 text-xs font-semibold gap-1.5 rounded-lg border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>{t("admin_product_form.btn_print_qr", "QR Label")}</span>
                    </Button>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("admin_product_form.inventory_subtitle", "Manage warehouse physical count & live webshop quota")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="storageStock" className="text-xs font-bold text-foreground/80 flex items-center gap-1">
                      <span>{t("admin_product_form.label_storage_stock", "Storage (Godown)")}</span>
                    </Label>
                    <Input
                      id="storageStock"
                      type="number"
                      min="0"
                      value={storageStock}
                      onChange={(e) => handleStorageStockChange(e.target.value)}
                      placeholder="0"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-mono font-bold"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("admin_product_form.storage_stock_hint", "Total physical units in warehouse")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="webshopStock" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>{t("admin_product_form.label_webshop_stock", "Webshop (Online)")}</span>
                    </Label>
                    <Input
                      id="webshopStock"
                      type="number"
                      min="0"
                      max={Math.max(0, parseInt(storageStock, 10) || 0)}
                      value={webshopStock}
                      onChange={(e) => handleWebshopStockChange(e.target.value)}
                      placeholder="0"
                      className="h-10 text-xs bg-emerald-50/50 dark:bg-emerald-950/20 focus-visible:ring-1 border-emerald-300/40 dark:border-emerald-700/40 rounded-lg font-mono font-bold text-emerald-700 dark:text-emerald-300"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("admin_product_form.webshop_stock_hint", "Live checkout quota for website")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="binLocation" className="text-xs font-bold text-foreground/80">
                      {t("admin_product_form.label_bin_location", "Storage Rack / Bin Location")}
                    </Label>
                    <Input
                      id="binLocation"
                      value={binLocation}
                      onChange={(e) => setBinLocation(e.target.value)}
                      placeholder="e.g. A-01-1, Shelf-B4"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lowStockThreshold" className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>{t("admin_product_form.label_low_stock_threshold", "Low Stock Alert (Threshold)")}</span>
                    </Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      placeholder="5"
                      className="h-10 text-xs bg-amber-50/50 dark:bg-amber-950/20 focus-visible:ring-1 border-amber-300/40 dark:border-amber-700/40 rounded-lg font-mono font-bold text-amber-700 dark:text-amber-300"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("admin_product_form.low_stock_threshold_hint", "Shows 'Only X left' badge when stock <= threshold")}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>{t("admin_product_form.offline_reserve", "Offline Safety Reserve:")}</span>
                    <span className="font-mono font-bold text-foreground">
                      {Math.max(0, (parseInt(storageStock, 10) || 0) - (parseInt(webshopStock, 10) || 0))} {t("admin_product_form.units", "units")}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight text-muted-foreground/80">
                    {t("admin_product_form.dual_layer_note", "Protected offline in godown. Not purchasable on webshop.")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Organisation & Category attributes */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">{t("admin_product_form.category_title")}</CardTitle>
                <CardDescription className="text-xs">{t("admin_product_form.category_subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground/80">{t("admin_product_form.label_category")}</Label>
                  {isMounted && (
                    <Select value={selectedCategory || undefined} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                        <SelectValue placeholder={t("admin_product_form.placeholder_category")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {/* First show orphan/standalone categories (no parent) that aren't parents themselves */}
                        {categoriesList
                          .filter((c: any) => !c.parentId && !categoriesList.some((ch: any) => ch.parentId === c.id))
                          .map((c) => (
                            <SelectItem key={c.slug} value={c.slug} className="text-xs rounded-lg">
                              {c.name}
                            </SelectItem>
                          ))}
                        {/* Then show parent categories with their children grouped */}
                        {categoriesList
                          .filter((c: any) => !c.parentId && categoriesList.some((ch: any) => ch.parentId === c.id))
                          .map((parent: any) => {
                            const children = categoriesList.filter((ch: any) => ch.parentId === parent.id);
                            return (
                              <SelectGroup key={parent.id}>
                                <SelectLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">
                                  {parent.name}
                                </SelectLabel>
                                {children.map((child: any) => (
                                  <SelectItem key={child.slug} value={child.slug} className="text-xs rounded-lg pl-5">
                                    ↳ {child.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="pt-4 border-t border-muted-foreground/10 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("admin_product_form.attrs_heading")}</h4>
                  {visibleAttributes.length > 0 ? (
                    <div className="space-y-4">
                      {visibleAttributes.map((attr) => {
                        const currentVals = selectedAttributeValues[attr.slug] || [];

                        return (
                          <div key={attr.id} className="space-y-2 pb-4 border-b border-muted-foreground/10 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <Label className="font-bold text-xs text-foreground/80 capitalize">{attr.name}</Label>
                              <span className="text-[9px] text-muted-foreground font-semibold uppercase bg-muted/80 px-2 py-0.5 rounded-full">
                                {attr.type}
                              </span>
                            </div>

                            {/* Boolean Field */}
                            {attr.type === "boolean" && (
                              <div className="flex items-center gap-3 pt-1">
                                <Switch
                                  id={`switch-${attr.slug}`}
                                  checked={currentVals[0] === "Yes"}
                                  onCheckedChange={(checked) => {
                                    setSelectedAttributeValues((prev) => ({
                                      ...prev,
                                      [attr.slug]: [checked ? "Yes" : "No"],
                                    }));
                                  }}
                                />
                                <Label htmlFor={`switch-${attr.slug}`} className="text-xs font-semibold text-foreground/80 cursor-pointer">
                                  {currentVals[0] === "Yes" ? t("admin_product_form.attr_boolean_yes") : t("admin_product_form.attr_boolean_no")}
                                </Label>
                              </div>
                            )}

                            {/* Color/Light Color Swatches Selection */}
                            {attr.type === "color" && (
                              <div className="flex flex-wrap gap-2 pt-1.5">
                                {attr.values.map((v) => {
                                  const isChecked = currentVals.includes(v.value);
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      className={`relative h-7 w-7 rounded-full border transition-all duration-300 ${isChecked
                                          ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-sm"
                                          : "border-muted-foreground/20 hover:scale-105"
                                        }`}
                                      style={{ background: v.colorCode || "#cccccc" }}
                                      title={v.value}
                                      onClick={() => {
                                        const updated = isChecked ? [] : [v.value];
                                        setSelectedAttributeValues((prev) => ({
                                          ...prev,
                                          [attr.slug]: updated,
                                        }));
                                      }}
                                    >
                                      {isChecked && (
                                        <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                                          ✓
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Select Dropdown (Single option) */}
                            {attr.type === "select" && isMounted && (
                              <Select
                                value={currentVals[0] || ""}
                                onValueChange={(val) => {
                                  setSelectedAttributeValues((prev) => ({
                                    ...prev,
                                    [attr.slug]: [val],
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                                  <SelectValue placeholder={t("admin_product_form.attr_select_placeholder", { name: attr.name })} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {attr.values.map((v) => (
                                    <SelectItem key={v.id} value={v.value} className="text-xs rounded-lg">
                                      <div className="flex items-center gap-2">
                                        {v.colorCode && (
                                          <span
                                            className="h-3 w-3 rounded-full border border-black/10 shadow-xs"
                                            style={{ background: v.colorCode }}
                                          />
                                        )}
                                        <span>{v.value}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Dimension Range Selector */}
                            {attr.type === "dimension" && (
                              <Select
                                value={currentVals[0] || ""}
                                onValueChange={(val) => {
                                  setSelectedAttributeValues((prev) => ({
                                    ...prev,
                                    [attr.slug]: [val],
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                                  <SelectValue placeholder={t("admin_product_form.attr_select_placeholder", { name: attr.name })} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {attr.values.map((v) => (
                                    <SelectItem key={v.id} value={v.value} className="text-xs rounded-lg">
                                      {v.value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Multi Select Checkbox Buttons */}
                            {attr.type === "multi_select" && (
                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {attr.values.map((v) => {
                                  const isChecked = currentVals.includes(v.value);
                                  return (
                                    <Button
                                      key={v.id}
                                      type="button"
                                      variant={isChecked ? "default" : "outline"}
                                      size="sm"
                                      className="h-7 px-2.5 rounded-full text-[11px] gap-1.5 font-medium border-muted-foreground/25 hover:border-primary transition-colors"
                                      onClick={() => {
                                        const updated = isChecked
                                          ? currentVals.filter((cv) => cv !== v.value)
                                          : [...currentVals, v.value];
                                        setSelectedAttributeValues((prev) => ({
                                          ...prev,
                                          [attr.slug]: updated,
                                        }));
                                      }}
                                    >
                                      {v.colorCode && (
                                        <span
                                          className="h-1.5 w-1.5 rounded-full border border-black/10"
                                          style={{ background: v.colorCode }}
                                        />
                                      )}
                                      <span>{v.value}</span>
                                    </Button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Range Slider / Text Input */}
                            {attr.type === "range" && (
                              <Input
                                value={currentVals[0] || ""}
                                onChange={(e) => {
                                  setSelectedAttributeValues((prev) => ({
                                    ...prev,
                                    [attr.slug]: [e.target.value],
                                  }));
                                }}
                                placeholder={t("admin_product_form.attr_range_placeholder")}
                                className="h-9 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      {t("admin_product_form.attrs_no_category")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Internal Product Variants (Sizes & Dimensions) Card */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span>{t("admin_product_form.variants_title", "Product Variants (Sizes / Dimensions)")}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t(
                      "admin_product_form.variants_desc",
                      "Manage different sizes/diameters for this single product (e.g. 40cm, 60cm, 80cm) with their own prices and stock, displayed as clickable size pills on the storefront."
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor="has-variants-switch" className="text-xs font-semibold cursor-pointer">
                    {hasVariants ? "Variants Enabled" : "Single Size"}
                  </Label>
                  <Switch
                    id="has-variants-switch"
                    checked={hasVariants}
                    onCheckedChange={(checked) => {
                      setHasVariants(checked);
                      if (checked && productVariants.length === 0) {
                        applyVariantPreset(VARIANT_SIZE_PRESETS[0].sizes);
                      }
                    }}
                  />
                </div>
              </CardHeader>

              {hasVariants && (
                <CardContent className="space-y-4">
                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Quick Size Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {VARIANT_SIZE_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyVariantPreset(p.sizes)}
                          className="text-[11px] rounded-full border border-border bg-muted/50 px-2.5 py-1 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors font-medium"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Variants Table */}
                  <div className="rounded-xl border border-border/80 bg-background/50 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground">
                      <div className="col-span-4">Size / Option Name</div>
                      <div className="col-span-3">Price (€)</div>
                      <div className="col-span-2">Stock</div>
                      <div className="col-span-2">SKU (Optional)</div>
                      <div className="col-span-1 text-right">Del</div>
                    </div>

                    <div className="divide-y divide-border/50">
                      {productVariants.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No variants added yet. Choose a preset above or click Add Variant.
                        </div>
                      ) : (
                        productVariants.map((v, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 items-center text-xs hover:bg-muted/20">
                            <div className="col-span-4">
                              <Input
                                value={v.sizeName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, sizeName: val } : item))
                                  );
                                }}
                                placeholder="e.g. Ø 60 cm"
                                className="h-8 text-xs font-medium"
                              />
                            </div>
                            <div className="col-span-3 relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">€</span>
                              <Input
                                value={v.price}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                                  );
                                }}
                                placeholder="89.95"
                                className="pl-6 h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                value={v.stock}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, stock: val } : item))
                                  );
                                }}
                                placeholder="10"
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                value={v.sku}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, sku: val } : item))
                                  );
                                }}
                                placeholder="Auto"
                                className="h-8 text-xs font-mono text-[11px]"
                              />
                            </div>
                            <div className="col-span-1 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => setProductVariants((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariantRow}
                      className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Size Variant</span>
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      {productVariants.length} size variant(s) defined
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Color Siblings & Linked Variants Card */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-primary" />
                    <span>{t("admin_product_form.siblings_title", "Product Siblings & Linked Variations (Color & Size)")}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("admin_product_form.siblings_desc", "Connect standalone products as color or size variations. All linked products share a sibling group ID and will display clickable size pills (afmetingen) or color swatches on their storefront pages.")}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isAiSuggesting || !id || id === "new"}
                  onClick={handleAiSuggestSiblings}
                  className="h-8 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 rounded-lg shadow-2xs shrink-0"
                  title={!id || id === "new" ? "Save product first to use AI detection" : "AI analyzes catalog to find matching color variations"}
                >
                  {isAiSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                  <span>{isAiSuggesting ? "AI Scanning..." : "✨ AI Find Siblings"}</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Suggestions Box (if matches found) */}
                {aiSuggestions.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 animate-in fade-in-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-bold text-foreground">
                          AI Detected {aiSuggestions.length} Color Variation{aiSuggestions.length > 1 ? "s" : ""}:
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-1 shadow-2xs"
                        onClick={linkAllAiSuggestions}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Link All ({aiSuggestions.length})</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiSuggestions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={resolveImgUrl(s.image)}
                              alt=""
                              className="w-8 h-8 rounded-md object-cover border border-border/40 shrink-0"
                            />
                            <div className="truncate">
                              <p className="font-semibold text-foreground truncate">{s.name}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span
                                  className="w-2 h-2 rounded-full border border-black/15 shrink-0"
                                  style={{ background: s.colorCode || "#666" }}
                                />
                                <span className="font-medium text-foreground">{s.colorName}</span>
                                <span>·</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {s.confidence}% match
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-md"
                            onClick={() => {
                              addSibling(s);
                              setAiSuggestions((prev) => prev.filter((item) => item.id !== s.id));
                            }}
                          >
                            + Link
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search & Add Sibling */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-bold text-foreground/80">
                      {t("admin_product_form.search_sibling_label", "Search or browse products to link as color:")}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsBrowseCatalogOpen(true);
                        loadCatalogProducts(selectedCategory || "all");
                      }}
                      className="h-7 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1.5 shadow-2xs"
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      <span>Browse All Products</span>
                    </Button>
                  </div>

                  {/* Quick Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground font-medium">Show:</span>
                    {selectedCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setSiblingFilterCategory("same");
                          searchSiblings(siblingSearchQuery, "same");
                        }}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full border transition-all font-medium",
                          siblingFilterCategory === "same"
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted border-border"
                        )}
                      >
                        Same Category ({selectedCategory})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSiblingFilterCategory("all");
                        searchSiblings(siblingSearchQuery, "all");
                      }}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full border transition-all font-medium",
                        siblingFilterCategory === "all"
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted border-border"
                      )}
                    >
                      All Products Catalog
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      value={siblingSearchQuery}
                      onFocus={() => {
                        if (siblingSearchResults.length === 0) {
                          searchSiblings(siblingSearchQuery, siblingFilterCategory);
                        }
                      }}
                      onChange={(e) => searchSiblings(e.target.value, siblingFilterCategory)}
                      placeholder={t("admin_product_form.search_sibling_placeholder", "Click to see products, or type name/SKU...")}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg pr-9"
                    />
                    {siblingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => searchSiblings("", siblingFilterCategory)}
                        className="absolute right-8 top-3 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isSearchingSiblings && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {siblingSearchResults.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-2 shadow-lg space-y-1 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground border-b border-border/40 font-medium">
                        <span>{siblingSearchResults.length} product(s) available to link:</span>
                        <button
                          type="button"
                          onClick={() => setSiblingSearchResults([])}
                          className="text-[10px] hover:text-foreground font-semibold"
                        >
                          ✕ Close
                        </button>
                      </div>
                      {siblingSearchResults.map((sr) => {
                        const colorVal = sr.productAttributeValues?.find(
                          (pav: any) =>
                            pav.attribute?.slug === "color" ||
                            pav.attribute?.name?.toLowerCase() === "color" ||
                            pav.attribute?.name?.toLowerCase() === "kleur"
                        )?.attributeValue;
                        return (
                          <div
                            key={sr.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={resolveImgUrl(sr.image)}
                                alt=""
                                className="w-8 h-8 rounded-md object-cover border border-border/50 shrink-0"
                              />
                              <div className="truncate">
                                <div className="flex items-center gap-1.5 truncate">
                                  <p className="font-semibold text-foreground truncate">{sr.name}</p>
                                  {sr.isDraft && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                      Draft
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  {colorVal && (
                                    <span className="flex items-center gap-1">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-black/15 inline-block shrink-0"
                                        style={{ background: colorVal.colorCode || "#666" }}
                                      />
                                      <span className="font-medium text-foreground">{colorVal.value}</span>
                                    </span>
                                  )}
                                  <span>·</span>
                                  <span>€{Number(sr.price).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs font-semibold shrink-0 gap-1 rounded-lg hover:bg-primary hover:text-white"
                              onClick={() => addSibling(sr)}
                            >
                              <Plus className="h-3 w-3" />
                              <span>{t("admin_product_form.link_btn", "Link")}</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Linked Siblings List */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                    <span>{t("admin_product_form.currently_linked", "Currently Connected Siblings:")}</span>
                    <span className="text-[11px] font-mono font-normal text-muted-foreground">
                      {linkedSiblings.length} {t("admin_product_form.products_linked", "product(s) linked")}
                    </span>
                  </Label>

                  {linkedSiblings.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-muted-foreground/20 text-center text-xs text-muted-foreground">
                      {t("admin_product_form.no_siblings_linked", "No siblings linked yet. Search above to link other size or color variations of this item.")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {linkedSiblings.map((sibling) => (
                        <div
                          key={sibling.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-background/50 hover:bg-muted/40 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={resolveImgUrl(sibling.image)}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border border-border/60 shrink-0"
                            />
                            <div className="truncate">
                              <p className="font-semibold text-xs text-foreground truncate">{sibling.name}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                                {sibling.sizeName ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    📏 {sibling.sizeName}
                                  </span>
                                ) : (
                                  <>
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                                      style={{ background: sibling.colorCode || "#666" }}
                                    />
                                    <span className="font-medium text-foreground/90">{sibling.colorName}</span>
                                  </>
                                )}
                                <span>·</span>
                                <span className="font-semibold text-foreground/80">€{Number(sibling.price).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 rounded-full"
                            onClick={() => removeSibling(sibling.id)}
                            title="Disconnect sibling"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {linkedSiblings.length > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                      ✓ {t("admin_product_form.auto_sync_hint", "2-Way Sync Active: Saving will automatically link all selected products together.")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl p-6 space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 h-10 text-xs font-bold rounded-lg shadow-sm hover:shadow transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isEdit ? (t("admin_product_form.action_saving") || "Opslaan...") : (t("admin_product_form.action_creating") || "Product aanmaken...")}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEdit ? t("admin_product_form.action_save") : t("admin_product_form.action_create")}</span>
                  </>
                )}
              </Button>
              {canRegenerate && isEdit && (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setOptimizePromptOpen(true);
                  }}
                  variant="outline"
                  className="w-full gap-2 h-10 text-xs font-bold rounded-lg border-amber-600/30 text-amber-700 bg-amber-600/5 hover:bg-amber-600/15 hover:text-amber-800 transition-all duration-300"
                  disabled={isSubmitting || isGlobalRegenerating || regeneratingIndexes.length > 0 || isOptimizing}
                >
                  {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>{isOptimizing ? "AI Editing..." : "Quick Edit (AI)"}</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="w-full h-10 text-xs font-bold rounded-lg border-muted-foreground/25 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => navigate("/admin/products")}
              >
                {t("admin_product_form.action_cancel")}
              </Button>
            </Card>

          </div>
        </div>
      </form>

      <MediaLibraryDialog
        open={mediaDialogTarget !== null}
        onOpenChange={(open) => !open && setMediaDialogTarget(null)}
        allowMultiple={mediaDialogTarget === "gallery"}
        onSelect={(url) => {
          const formattedUrl = normalizeUploadedUrl(url);
          if (mediaDialogTarget === "thumbnail") {
            setThumbnail(formattedUrl);
          } else if (mediaDialogTarget === "gallery") {
            setGalleryImages((prev) => [...prev, formattedUrl]);
          }
          setMediaDialogTarget(null);
        }}
        onSelectMultiple={(urls) => {
          if (mediaDialogTarget === "gallery") {
            const formattedUrls = urls.map(normalizeUploadedUrl);
            setGalleryImages((prev) => [...prev, ...formattedUrls]);
          }
          setMediaDialogTarget(null);
        }}
      />
      {/* Regeneration Prompt Dialog */}
      <Dialog open={regenPromptOpen} onOpenChange={setRegenPromptOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {regenTargetIndex !== null ? t("admin_product_form.regen_specific_title") : t("admin_product_form.regen_gallery_title")}
            </DialogTitle>
            <DialogDescription>
              {t("admin_product_form.regen_prompt_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={t("admin_product_form.regen_prompt_placeholder")}
              value={regenPromptText}
              onChange={(e) => setRegenPromptText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenPromptOpen(false)}>{t("admin_product_form.action_cancel")}</Button>
            <Button
              className="gap-2"
              onClick={async () => {
                setRegenPromptOpen(false);
                const toastId = regenTargetIndex !== null ? `regen-${regenTargetIndex}` : "regen-all";
                toast.info(t("admin_product_form.regen_toast_start"), { id: toastId });

                if (regenTargetIndex !== null) {
                  setRegeneratingIndexes(prev => [...prev, regenTargetIndex]);
                } else {
                  setIsGlobalRegenerating(true);
                }

                try {
                  const apiUrl = getApiV1Url();
                  const targetUrl = draftId
                    ? `${apiUrl}/ai/drafts/${draftId}/regenerate-images`
                    : `${apiUrl}/ai/products/${id}/regenerate-images`;
                  const res = await fetch(targetUrl, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      prompt: regenPromptText,
                      index: regenTargetIndex !== null ? regenTargetIndex : undefined
                    })
                  });

                  const data = await res.json();
                  if (data.success && data.images) {
                    setGalleryImages(prev => {
                      if (regenTargetIndex !== null) {
                        const next = [...prev];
                        next[regenTargetIndex] = data.images[0];
                        if (thumbnail === prev[regenTargetIndex]) setThumbnail(data.images[0]);
                        return next;
                      } else {
                        const merged = [...prev, ...data.images];
                        if (!thumbnail && merged.length > 0) setThumbnail(merged[0]);
                        return merged;
                      }
                    });
                    toast.success(regenTargetIndex !== null ? t("admin_product_form.regen_toast_success_single") : t("admin_product_form.regen_toast_success_multi"), { id: toastId });
                  } else {
                    throw new Error(data.error);
                  }
                } catch (err: any) {
                  toast.error(t("admin_product_form.regen_toast_error"), { id: toastId });
                } finally {
                  if (regenTargetIndex !== null) {
                    setRegeneratingIndexes(prev => prev.filter(idx => idx !== regenTargetIndex));
                  } else {
                    setIsGlobalRegenerating(false);
                  }
                }
              }}
            >
              <Sparkles className="h-4 w-4" />
              {t("admin_product_form.regen_generate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal with Zoom */}
      <Dialog open={Boolean(lightboxImage)} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-[70vw] lg:max-w-[50vw] max-h-[85vh] p-0 overflow-hidden bg-black/95 border-none shadow-2xl rounded-2xl flex flex-col items-center justify-between">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-white/20 bg-black/40 hover:bg-black/60 text-white hover:text-white backdrop-blur-md"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-white/20 bg-black/40 hover:bg-black/60 text-white hover:text-white backdrop-blur-md"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-white/20 bg-black/40 hover:bg-black/60 text-white hover:text-white backdrop-blur-md"
              onClick={handleResetZoom}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center p-6 overflow-hidden">
            {lightboxImage && (
              <img
                src={resolveImgUrl(lightboxImage)}
                alt=""
                className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain transition-transform duration-200 ease-out"
                style={{ transform: `scale(${zoomScale})` }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Edit (AI) Modal */}
      <Dialog open={optimizePromptOpen} onOpenChange={setOptimizePromptOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-xl">AI Quick Edit (Smart Fix)</DialogTitle>
            </div>
            <DialogDescription>
              Specify whatever needs fixing on this product. AI will inspect the photo, specs, and Schip en Ster SOP rules to edit it directly in the background job queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Product Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
              {thumbnail ? (
                <img
                  src={resolveImgUrl(thumbnail)}
                  alt={name}
                  className="h-12 w-12 rounded-lg object-cover border shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase font-bold">Target Product</p>
                <p className="font-semibold text-sm truncate">{name || "Untitled Product"}</p>
                <p className="text-xs text-muted-foreground">
                  €{price || "0.00"} · {selectedCategory ? selectedCategory.replace(/-/g, " ") : "No Category"}
                </p>
              </div>
            </div>

            {/* Quick Presets / Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Quick SOP Presets (Click to add)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ISSUES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOptimizePromptText((prev) =>
                        prev ? `${prev}\n${preset.text}` : preset.text
                      );
                    }}
                    className="text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Description Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Describe what is wrong or what to fix <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">Plain text in English, Hindi, or Dutch</span>
              </div>
              <textarea
                value={optimizePromptText}
                onChange={(e) => setOptimizePromptText(e.target.value)}
                rows={4}
                placeholder="e.g. Inka naam marbella likha hua h par ye crystal table lamp h jisme G9 bulb lagta h. Isko Ambiance collection mai move karo, category tafellamp karo, aur color gold karo."
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 resize-y"
              />
            </div>

            {/* Fields to Update Selection */}
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fields to Update by AI
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setQuickEditFields({
                      name: true,
                      category: true,
                      description: true,
                      specs: true,
                      attributes: true,
                      seo: true,
                      price: false,
                    })
                  }
                  className="text-[11px] text-amber-600 hover:underline"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.name}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, name: !!c }))
                    }
                  />
                  <span>Product Title (Name)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.category}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, category: !!c }))
                    }
                  />
                  <span>Category & Collection</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.description}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, description: !!c }))
                    }
                  />
                  <span>Dutch Descriptions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.specs}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, specs: !!c }))
                    }
                  />
                  <span>Specs Table (Fitting, etc.)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.attributes}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, attributes: !!c }))
                    }
                  />
                  <span>Color & Fitting Filters</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.seo}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, seo: !!c }))
                    }
                  />
                  <span>SEO Title & Meta</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.price}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, price: !!c }))
                    }
                  />
                  <span className="text-muted-foreground">Price (if specified)</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOptimizePromptOpen(false)}
              disabled={isOptimizing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTriggerOptimize}
              disabled={isOptimizing || !optimizePromptText.trim()}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Queueing Job...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enqueue AI Edit Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Thermal Preview Modal */}
      {currentInventoryItem && (
        <QrCodePreviewModal
          item={currentInventoryItem}
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
        />
      )}

      {/* Browse All Products Dialog for Manual Sibling Linking */}
      <Dialog open={isBrowseCatalogOpen} onOpenChange={setIsBrowseCatalogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Boxes className="h-5 w-5 text-primary" />
              Browse Product Catalog to Link as Color
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select any product from your catalog to link as a color variation sibling.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 border-b bg-background flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Filter catalog by product name or SKU..."
                value={catalogSearchQuery}
                onChange={(e) => {
                  setCatalogSearchQuery(e.target.value);
                  loadCatalogProducts(catalogFilterCategory, e.target.value);
                }}
                className="h-9 text-xs"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={catalogFilterCategory}
                onValueChange={(val) => {
                  setCatalogFilterCategory(val);
                  loadCatalogProducts(val, catalogSearchQuery);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoriesList.map((c) => (
                    <SelectItem key={c.id || c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoadingCatalog ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Loading catalog products...</span>
              </div>
            ) : catalogProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No products found in this category or search query.
              </div>
            ) : (
              catalogProducts.map((p) => {
                const isAlreadyLinked = linkedSiblings.some((ls) => ls.id === p.id);
                const colorVal = p.productAttributeValues?.find(
                  (pav: any) =>
                    pav.attribute?.slug === "color" ||
                    pav.attribute?.name?.toLowerCase() === "color" ||
                    pav.attribute?.name?.toLowerCase() === "kleur"
                )?.attributeValue;

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all text-xs",
                      isAlreadyLinked
                        ? "bg-muted/40 border-border/40 opacity-75"
                        : "bg-card hover:bg-muted/50 border-border/70 shadow-2xs"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={resolveImgUrl(p.image)}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border border-border/50 shrink-0"
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="font-semibold text-foreground truncate">{p.name}</p>
                          {p.isDraft && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                              Draft
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {colorVal && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                                style={{ background: colorVal.colorCode || "#666" }}
                              />
                              {colorVal.value}
                            </span>
                          )}
                          <span>·</span>
                          <span className="font-mono">€{Number(p.price).toFixed(2)}</span>
                          {p.category?.name && (
                            <>
                              <span>·</span>
                              <span className="text-muted-foreground/80">{p.category.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAlreadyLinked ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                        ✓ Linked
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs font-bold gap-1 rounded-lg"
                        onClick={() => addSibling(p)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Link as Color</span>
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBrowseCatalogOpen(false)}
            >
              Done Linking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductForm;
