import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Percent,
  Gift,
  Calendar,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Loader2,
  Flame,
  Tag,
  Eye,
  SlidersHorizontal,
  Layers,
  Store,
  ChevronRight,
  Boxes,
} from "lucide-react";
import {
  couponRepository,
  salesCampaignRepository,
  brandRepository,
  seriesRepository,
  categoryRepository,
  productRepository,
} from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { SafeImage } from "@/components/ui/SafeImage";

interface Coupon {
  id: string;
  code: string;
  discountType: string; // "percentage" | "flat"
  value: number;
  minOrderValue: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SalesCampaign {
  id: string;
  name: string;
  badgeText?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  targetScope: "all" | "brand" | "series" | "category" | "subcategory" | "products";
  targetBrandId?: string | null;
  targetBrandName?: string | null;
  targetSeriesSlug?: string | null;
  targetSeriesName?: string | null;
  targetCategoryId?: string | null;
  targetCategoryName?: string | null;
  targetSubcategoryId?: string | null;
  targetSubcategoryName?: string | null;
  targetProductIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  affectedProductCount?: number;
  createdAt: string;
  updatedAt: string;
}

const AI_PRESET_CAMPAIGNS = [
  {
    label: "💎 20% Off Ambiance Crystal",
    prompt: "20% discount on all Ambiance luxury crystal chandeliers and lamps for 7 days, badge: LENTE DEAL",
  },
  {
    label: "🌸 Spring Sale: 15% Table Lamps",
    prompt: "Spring flash sale: 15% off on all table lamps (Tafellampen) across the catalog, badge: VOORJAAR 15%",
  },
  {
    label: "🔥 Black Friday: 25% Storewide",
    prompt: "Black Friday Mega Sale: 25% discount storewide on all lighting products for 14 days, badge: BLACK FRIDAY -25%",
  },
  {
    label: "✨ 20€ Flat Discount on Lisboa",
    prompt: "20 euro flat discount on all Lisboa glass globe pendant lights, badge: €20 KORTING",
  },
  {
    label: "⚡ 30% Clearance on Ceiling Fans",
    prompt: "Clearance discount: 30% off on all Iceland Tech ceiling fan lamps, badge: OPRUIMING -30%",
  },
];

export default function AdminOffers() {
  const { t } = useTranslation();
  const { hasPermission } = useAdmin();
  const [activeTab, setActiveTab] = useState<"campaigns" | "coupons">("campaigns");

  // Coupons State
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountType, setCouponDiscountType] = useState("percentage");
  const [couponValue, setCouponValue] = useState(10);
  const [couponMinOrderValue, setCouponMinOrderValue] = useState(0);
  const [isCouponActive, setIsCouponActive] = useState(true);
  const [couponExpiresAt, setCouponExpiresAt] = useState("");
  const [couponSearch, setCouponSearch] = useState("");
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);

  // Sales Campaigns State
  const [campaignsList, setCampaignsList] = useState<SalesCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SalesCampaign | null>(null);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  // Metadata for targeting
  const [brands, setBrands] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  // Campaign Form State
  const [campaignName, setCampaignName] = useState("");
  const [campaignBadge, setCampaignBadge] = useState("");
  const [campaignDiscountType, setCampaignDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [campaignDiscountValue, setCampaignDiscountValue] = useState(15);
  const [campaignTargetScope, setCampaignTargetScope] = useState<
    "all" | "brand" | "series" | "category" | "subcategory" | "products"
  >("series");
  const [campaignBrandId, setCampaignBrandId] = useState("");
  const [campaignSeriesSlug, setCampaignSeriesSlug] = useState("");
  const [campaignCategoryId, setCampaignCategoryId] = useState("");
  const [campaignSubcategoryId, setCampaignSubcategoryId] = useState("");
  const [campaignProductIds, setCampaignProductIds] = useState<string[]>([]);
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [campaignStartDate, setCampaignStartDate] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");
  const [campaignIsActive, setCampaignIsActive] = useState(true);

  // Live Matching Products Preview State
  const [previewProducts, setPreviewProducts] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // View Affected Products Dialog
  const [viewingCampaign, setViewingCampaign] = useState<SalesCampaign | null>(null);
  const [viewingProducts, setViewingProducts] = useState<any[]>([]);
  const [isLoadingViewingProducts, setIsLoadingViewingProducts] = useState(false);

  // AI Campaign Generator State
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Fetch Coupons
  const fetchCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const res = await couponRepository.getAll();
      if (res.success && res.data) {
        setCouponsList(res.data);
      } else {
        setCouponsList([]);
      }
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
      toast.error("Failed to load coupons from server");
      setCouponsList([]);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const res = await salesCampaignRepository.getAll();
      if (res.success && res.data) {
        setCampaignsList(res.data);
      } else {
        setCampaignsList([]);
      }
    } catch (err) {
      console.error("Failed to fetch sales campaigns:", err);
      toast.error("Failed to load sales campaigns");
      setCampaignsList([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Fetch Metadata (Brands, Series, Categories, Products)
  const fetchMetadata = async () => {
    try {
      const [bRes, sRes, cRes, pRes] = await Promise.all([
        brandRepository.getAll().catch(() => ({ brands: [] })),
        seriesRepository.getAll().catch(() => ({ series: [] })),
        categoryRepository.getAll().catch(() => ({ categories: [] })),
        productRepository.getAll({ limit: 500 }).catch(() => ({ products: [] })),
      ]);

      if (bRes?.brands) setBrands(bRes.brands);
      if (sRes?.series) setSeries(sRes.series);
      if (cRes?.categories) setCategories(cRes.categories);
      if (pRes?.products) setCatalogProducts(pRes.products);
    } catch (e) {
      console.warn("Failed to load catalog metadata for offers:", e);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchCampaigns();
    fetchMetadata();
  }, []);

  // Update Preview whenever targeting or discount changes in Campaign Form
  useEffect(() => {
    if (!isCampaignDialogOpen) return;

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      try {
        const payload = {
          targetScope: campaignTargetScope,
          targetBrandId: campaignBrandId,
          targetSeriesSlug: campaignSeriesSlug,
          targetCategoryId: campaignCategoryId,
          targetSubcategoryId: campaignSubcategoryId,
          targetProductIds: campaignProductIds,
          discountType: campaignDiscountType,
          discountValue: campaignDiscountValue,
        };

        const res = await salesCampaignRepository.preview(payload);
        if (res.success && res.products) {
          setPreviewProducts(res.products);
        } else {
          setPreviewProducts([]);
        }
      } catch (e) {
        console.error("Failed to preview matching products:", e);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    isCampaignDialogOpen,
    campaignTargetScope,
    campaignBrandId,
    campaignSeriesSlug,
    campaignCategoryId,
    campaignSubcategoryId,
    campaignProductIds,
    campaignDiscountType,
    campaignDiscountValue,
  ]);

  // Open Campaign Dialog for Create or Edit
  const handleOpenCampaignDialog = (c?: SalesCampaign) => {
    if (c) {
      setEditingCampaign(c);
      setCampaignName(c.name);
      setCampaignBadge(c.badgeText || "");
      setCampaignDiscountType(c.discountType);
      setCampaignDiscountValue(c.discountValue);
      setCampaignTargetScope(c.targetScope);
      setCampaignBrandId(c.targetBrandId || "");
      setCampaignSeriesSlug(c.targetSeriesSlug || "");
      setCampaignCategoryId(c.targetCategoryId || "");
      setCampaignSubcategoryId(c.targetSubcategoryId || "");
      setCampaignProductIds(c.targetProductIds || []);
      setCampaignStartDate(c.startDate ? c.startDate.split("T")[0] : "");
      setCampaignEndDate(c.endDate ? c.endDate.split("T")[0] : "");
      setCampaignIsActive(c.isActive);
    } else {
      setEditingCampaign(null);
      setCampaignName("");
      setCampaignBadge("🔥 SALE -15%");
      setCampaignDiscountType("percentage");
      setCampaignDiscountValue(15);
      setCampaignTargetScope("series");
      setCampaignBrandId("");
      setCampaignSeriesSlug(series[0]?.slug || "ambiance");
      setCampaignCategoryId("");
      setCampaignSubcategoryId("");
      setCampaignProductIds([]);
      setCampaignStartDate(new Date().toISOString().split("T")[0]);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCampaignEndDate(nextWeek.toISOString().split("T")[0]);
      setCampaignIsActive(true);
    }
    setIsCampaignDialogOpen(true);
  };

  // Save Campaign (Create or Update)
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (campaignDiscountValue <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    setIsSavingCampaign(true);
    try {
      const selectedBrandObj = brands.find((b) => b.id === campaignBrandId);
      const selectedSeriesObj = series.find((s) => s.slug === campaignSeriesSlug);
      const selectedCatObj = categories.find((c) => c.id === campaignCategoryId);
      const selectedSubcatObj = categories.find((c) => c.id === campaignSubcategoryId);

      const payload = {
        name: campaignName.trim(),
        badgeText: campaignBadge.trim(),
        discountType: campaignDiscountType,
        discountValue: Number(campaignDiscountValue),
        targetScope: campaignTargetScope,
        targetBrandId: campaignBrandId || null,
        targetBrandName: selectedBrandObj?.name || null,
        targetSeriesSlug: campaignSeriesSlug || null,
        targetSeriesName: selectedSeriesObj?.name || null,
        targetCategoryId: campaignCategoryId || null,
        targetCategoryName: selectedCatObj?.name || null,
        targetSubcategoryId: campaignSubcategoryId || null,
        targetSubcategoryName: selectedSubcatObj?.name || null,
        targetProductIds: campaignProductIds,
        startDate: campaignStartDate ? new Date(campaignStartDate).toISOString() : null,
        endDate: campaignEndDate ? new Date(campaignEndDate).toISOString() : null,
        isActive: campaignIsActive,
      };

      if (editingCampaign) {
        await salesCampaignRepository.update(editingCampaign.id, payload);
        toast.success("Sales campaign updated successfully!");
      } else {
        await salesCampaignRepository.create(payload);
        toast.success(
          campaignIsActive
            ? "Sales campaign created and applied to catalog prices!"
            : "Sales campaign saved as draft."
        );
      }

      setIsCampaignDialogOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      console.error("Failed to save campaign:", err);
      toast.error(err.message || "Failed to save campaign");
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // Toggle Campaign Active/Inactive
  const handleToggleCampaign = async (campaign: SalesCampaign) => {
    try {
      const nextState = !campaign.isActive;
      const res = await salesCampaignRepository.toggle(campaign.id, nextState);
      if (res.success) {
        toast.success(
          nextState
            ? `Campaign activated! Strikethrough prices applied to ${res.data?.affectedProductCount || 0} products.`
            : "Campaign paused. Original prices restored."
        );
        fetchCampaigns();
      }
    } catch (err: any) {
      console.error("Failed to toggle campaign:", err);
      toast.error(err.message || "Failed to toggle campaign status");
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaign: SalesCampaign) => {
    if (
      !window.confirm(
        `Are you sure you want to delete campaign "${campaign.name}"? If active, original prices will be restored.`
      )
    ) {
      return;
    }
    try {
      await salesCampaignRepository.delete(campaign.id);
      toast.success("Campaign deleted and prices restored.");
      fetchCampaigns();
    } catch (err: any) {
      console.error("Failed to delete campaign:", err);
      toast.error(err.message || "Failed to delete campaign");
    }
  };

  // View Products on Sale under a Campaign
  const handleViewCampaignProducts = async (campaign: SalesCampaign) => {
    setViewingCampaign(campaign);
    setIsLoadingViewingProducts(true);
    try {
      const res = await salesCampaignRepository.preview({
        targetScope: campaign.targetScope,
        targetBrandId: campaign.targetBrandId,
        targetSeriesSlug: campaign.targetSeriesSlug,
        targetCategoryId: campaign.targetCategoryId,
        targetSubcategoryId: campaign.targetSubcategoryId,
        targetProductIds: campaign.targetProductIds,
        discountType: campaign.discountType,
        discountValue: campaign.discountValue,
      });
      if (res.success && res.products) {
        setViewingProducts(res.products);
      } else {
        setViewingProducts([]);
      }
    } catch (e) {
      console.error("Failed to view campaign products:", e);
      setViewingProducts([]);
    } finally {
      setIsLoadingViewingProducts(false);
    }
  };

  // AI Campaign Generation
  const handleGenerateAiCampaign = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe your sales campaign idea.");
      return;
    }

    setIsGeneratingAi(true);
    try {
      const res = await salesCampaignRepository.generateAi(aiPrompt.trim());
      if (res.success && res.campaign) {
        const c = res.campaign;
        setCampaignName(c.name || "AI Generated Sale");
        setCampaignBadge(c.badgeText || "🔥 SALE");
        setCampaignDiscountType(c.discountType === "fixed" ? "fixed" : "percentage");
        setCampaignDiscountValue(Number(c.discountValue) || 15);
        setCampaignTargetScope(c.targetScope || "series");
        setCampaignBrandId(c.targetBrandId || "");
        setCampaignSeriesSlug(c.targetSeriesSlug || "");
        setCampaignCategoryId(c.targetCategoryId || "");
        setCampaignSubcategoryId(c.targetSubcategoryId || "");
        setCampaignProductIds([]);
        setCampaignStartDate(new Date().toISOString().split("T")[0]);
        const dur = Number(c.durationDays) || 7;
        const end = new Date();
        end.setDate(end.getDate() + dur);
        setCampaignEndDate(end.toISOString().split("T")[0]);
        setCampaignIsActive(true);

        setIsAiDialogOpen(false);
        setEditingCampaign(null);
        setIsCampaignDialogOpen(true);
        toast.success("AI generated campaign! Review matched products and click Save.");
      } else {
        throw new Error(res.error || "Failed to generate campaign");
      }
    } catch (err: any) {
      console.error("AI Campaign Generation Failed:", err);
      toast.error(err.message || "Failed to generate campaign with AI");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Coupon Handlers
  const handleGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomCode = "";
    for (let i = 0; i < 8; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponCode(randomCode);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (couponValue <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    const payload = {
      code: couponCode.toUpperCase().trim(),
      discountType: couponDiscountType,
      value: Number(couponValue),
      minOrderValue: Number(couponMinOrderValue) || 0,
      isActive: isCouponActive,
      expiresAt: couponExpiresAt ? new Date(couponExpiresAt).toISOString() : null,
    };

    try {
      if (editCoupon) {
        await couponRepository.update(editCoupon.id, payload);
        toast.success("Coupon updated successfully!");
      } else {
        await couponRepository.create(payload);
        toast.success("Coupon created successfully!");
      }
      setIsCouponDialogOpen(false);
      fetchCoupons();
    } catch (err: any) {
      console.error("Failed to save coupon:", err);
      toast.error(err.message || "Failed to save coupon");
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await couponRepository.delete(id);
      toast.success("Coupon deleted successfully!");
      fetchCoupons();
    } catch (err: any) {
      console.error("Failed to delete coupon:", err);
      toast.error(err.message || "Failed to delete coupon");
    }
  };

  // Filtering
  const filteredCampaigns = campaignsList.filter((c) => {
    const q = campaignSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.badgeText || "").toLowerCase().includes(q) ||
      (c.targetSeriesName || "").toLowerCase().includes(q) ||
      (c.targetCategoryName || "").toLowerCase().includes(q)
    );
  });

  const filteredCoupons = couponsList.filter((c) =>
    c.code.toLowerCase().includes(couponSearch.toLowerCase())
  );

  // Stats
  const activeCampaignsCount = campaignsList.filter((c) => c.isActive).length;
  const totalProductsOnSale = campaignsList
    .filter((c) => c.isActive)
    .reduce((acc, c) => acc + (c.affectedProductCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            Offers & Sales Campaigns
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Manage storewide sales, collection flash deals, category discounts, and checkout coupon codes.
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "campaigns" && (
            <>
              <Button
                variant="outline"
                className="rounded-full gap-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium"
                onClick={() => setIsAiDialogOpen(true)}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>AI Sales Creator</span>
              </Button>
              <Button
                className="rounded-full gap-2"
                onClick={() => handleOpenCampaignDialog()}
              >
                <Plus className="h-4 w-4" />
                <span>New Sale Campaign</span>
              </Button>
            </>
          )}

          {activeTab === "coupons" && (
            <Button
              className="rounded-full gap-2"
              onClick={() => {
                setEditCoupon(null);
                setCouponCode("");
                setCouponDiscountType("percentage");
                setCouponValue(10);
                setCouponMinOrderValue(0);
                setIsCouponActive(true);
                setCouponExpiresAt("");
                setIsCouponDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Create Coupon</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "campaigns" | "coupons")}
        className="w-full space-y-6"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger
              value="campaigns"
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold text-xs px-4 py-2"
            >
              <Flame className="h-4 w-4 text-amber-500" />
              <span>Sales & Campaigns</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                {campaignsList.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="coupons"
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold text-xs px-4 py-2"
            >
              <Gift className="h-4 w-4 text-primary" />
              <span>Coupon Codes</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/15 text-primary font-bold">
                {couponsList.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SALES & CAMPAIGNS                                                  */}
        {/* ========================================================================= */}
        <TabsContent value="campaigns" className="space-y-6 m-0">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border bg-card/65 backdrop-blur-md shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active Campaigns
              </p>
              <p className="text-2xl font-black text-amber-600 mt-1">{activeCampaignsCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Live in storefront</p>
            </div>
            <div className="p-4 rounded-2xl border bg-card/65 backdrop-blur-md shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Products On Sale
              </p>
              <p className="text-2xl font-black text-primary mt-1">{totalProductsOnSale}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">With strikethrough price</p>
            </div>
            <div className="p-4 rounded-2xl border bg-card/65 backdrop-blur-md shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Campaigns
              </p>
              <p className="text-2xl font-black text-foreground mt-1">{campaignsList.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Drafts & active</p>
            </div>
            <div className="p-4 rounded-2xl border bg-card/65 backdrop-blur-md shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Checkout Coupons
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{couponsList.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Voucher promo codes</p>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Search campaigns by name, collection, category..."
                className="pl-10 rounded-xl bg-background/50 h-10 text-xs focus-visible:ring-1 border-muted-foreground/20"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Refresh campaigns"
              onClick={fetchCampaigns}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingCampaigns ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Campaigns List */}
          {isLoadingCampaigns ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-card/65 backdrop-blur-md p-5 border rounded-2xl shadow-sm space-y-4"
                >
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card/65 backdrop-blur-md border rounded-2xl shadow-sm">
              <div className="p-4 bg-amber-500/10 rounded-full text-amber-600 mb-3">
                <Flame className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Sales Campaigns Found</h3>
              <p className="text-muted-foreground text-xs max-w-md mt-1">
                Create brand-wide, collection, category, or product discount campaigns to show strikethrough prices and sale badges across the store.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 border-amber-500/30 text-amber-700 bg-amber-500/10"
                  onClick={() => setIsAiDialogOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>AI Campaign Generator</span>
                </Button>
                <Button
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => handleOpenCampaignDialog()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Campaign</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((c) => {
                const isScheduled = c.startDate && new Date(c.startDate) > new Date();
                const isEnded = c.endDate && new Date(c.endDate) < new Date();

                return (
                  <div
                    key={c.id}
                    className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-md hover:border-amber-500/30 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-foreground line-clamp-1">{c.name}</h3>
                          {c.badgeText && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                              {c.badgeText}
                            </span>
                          )}
                        </div>

                        {/* Active Switch */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch
                            checked={c.isActive}
                            onCheckedChange={() => handleToggleCampaign(c)}
                            title={c.isActive ? "Deactivate and rollback prices" : "Activate and apply sale prices"}
                          />
                        </div>
                      </div>

                      {/* Discount & Target Info */}
                      <div className="space-y-2 pt-1 border-t">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-foreground">
                            {c.discountType === "percentage" ? `${c.discountValue}%` : `€${c.discountValue}`}
                          </span>
                          <span className="text-xs text-muted-foreground font-semibold">
                            {c.discountType === "percentage" ? "OFF" : "FLAT DISCOUNT"}
                          </span>
                        </div>

                        {/* Target Scope Tags */}
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className="px-2 py-0.5 rounded-md bg-muted font-medium text-muted-foreground capitalize">
                            Scope: {c.targetScope}
                          </span>
                          {c.targetSeriesName && (
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                              💎 {c.targetSeriesName}
                            </span>
                          )}
                          {c.targetCategoryName && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                              💡 {c.targetCategoryName}
                            </span>
                          )}
                          {c.targetBrandName && (
                            <span className="px-2 py-0.5 rounded-md bg-muted font-medium text-foreground">
                              🏷️ {c.targetBrandName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status & Validity Dates */}
                      <div className="flex flex-col text-[11px] text-muted-foreground gap-0.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <span className="font-semibold">
                            {c.isActive ? (
                              <span className="text-emerald-600 dark:text-emerald-400">● Live on Storefront</span>
                            ) : isEnded ? (
                              <span className="text-red-500">Ended</span>
                            ) : isScheduled ? (
                              <span className="text-blue-500">Scheduled</span>
                            ) : (
                              <span className="text-muted-foreground">Draft (Paused)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Products on Sale:</span>
                          <button
                            type="button"
                            onClick={() => handleViewCampaignProducts(c)}
                            className="font-bold text-primary hover:underline"
                          >
                            {c.affectedProductCount || 0} products ↗
                          </button>
                        </div>
                        {c.endDate && (
                          <div className="flex items-center justify-between">
                            <span>Ends on:</span>
                            <span className="font-medium">
                              {new Date(c.endDate).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-1.5 border-t pt-3 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleViewCampaignProducts(c)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Preview ({c.affectedProductCount || 0})
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-muted"
                        onClick={() => handleOpenCampaignDialog(c)}
                        title="Edit Campaign"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {hasPermission("offers") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCampaign(c)}
                          title="Delete Campaign"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: COUPON CODES                                                       */}
        {/* ========================================================================= */}
        <TabsContent value="coupons" className="space-y-6 m-0">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                placeholder="Search coupon codes..."
                className="pl-10 rounded-xl bg-background/50 h-10 text-xs focus-visible:ring-1 border-muted-foreground/20"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Refresh coupons"
              onClick={fetchCoupons}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingCoupons ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {isLoadingCoupons ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="bg-card/65 backdrop-blur-md p-5 border rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card/65 backdrop-blur-md border rounded-2xl shadow-sm">
              <div className="p-4 bg-primary/10 rounded-full text-primary mb-3">
                <Gift className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-foreground">No coupons found</h3>
              <p className="text-muted-foreground text-xs max-w-sm mt-1">
                Create discount coupon codes to reward users and drive sales at checkout.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCoupons.map((coupon) => {
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                return (
                  <div
                    key={coupon.id}
                    className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-md hover:border-muted-foreground/25 flex flex-col justify-between min-h-[180px]"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-mono font-extrabold text-base tracking-wider uppercase text-primary">
                          {coupon.code}
                        </h3>
                        {coupon.isActive && !isExpired ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full hover:bg-emerald-500/15">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full hover:bg-red-500/15">
                            {isExpired ? "Expired" : "Inactive"}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-2xl font-black text-foreground">
                          {coupon.discountType === "percentage" ? (
                            <span className="flex items-center gap-1">
                              {coupon.value}% <span className="text-xs text-muted-foreground font-semibold">Off</span>
                            </span>
                          ) : (
                            <span>
                              €{coupon.value} <span className="text-xs text-muted-foreground font-semibold">Flat</span>
                            </span>
                          )}
                        </p>
                        <div className="flex flex-col text-[11px] text-muted-foreground font-medium gap-0.5">
                          <span>
                            Min. Order Value: <strong className="text-foreground">€{coupon.minOrderValue}</strong>
                          </span>
                          {coupon.expiresAt ? (
                            <span className={isExpired ? "text-red-500 font-bold" : ""}>
                              Expires:{" "}
                              <strong>
                                {new Date(coupon.expiresAt).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </strong>
                            </span>
                          ) : (
                            <span>
                              Expires: <strong>Never</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 border-t pt-3 mt-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-muted"
                        onClick={() => {
                          setEditCoupon(coupon);
                          setCouponCode(coupon.code);
                          setCouponDiscountType(coupon.discountType);
                          setCouponValue(coupon.value);
                          setCouponMinOrderValue(coupon.minOrderValue);
                          setIsCouponActive(coupon.isActive);
                          setCouponExpiresAt(
                            coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split("T")[0] : ""
                          );
                          setIsCouponDialogOpen(true);
                        }}
                        title="Edit Coupon"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {hasPermission("offers") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          title="Delete Coupon"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL 1: AI SALES CAMPAIGN GENERATOR                                      */}
      {/* ========================================================================= */}
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-xl">AI Sales Campaign Creator</DialogTitle>
            </div>
            <DialogDescription>
              Describe your promotion in plain text (Hinglish, English, or Dutch). Gemini AI will identify matching collections, categories, calculate discounts, and configure the sale automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Quick Campaign Ideas
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AI_PRESET_CAMPAIGNS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAiPrompt(p.prompt)}
                    className="text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Campaign Description / Instructions <span className="text-destructive">*</span>
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. Ambiance crystal collection pe 20% discount do 7 din ke liye, badge LENTE SALE rakho."
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 resize-y"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAiDialogOpen(false)}
              disabled={isGeneratingAi}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAiCampaign}
              disabled={isGeneratingAi || !aiPrompt.trim()}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Campaign...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: CAMPAIGN EDITOR (MANUAL + AI REVIEW)                             */}
      {/* ========================================================================= */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              <DialogTitle className="text-xl">
                {editingCampaign ? "Edit Sales Campaign" : "Create New Sales Campaign"}
              </DialogTitle>
            </div>
            <DialogDescription>
              Configure discount type, target brand, collection, categories, or specific products. When active, products immediately display strikethrough prices.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCampaign} className="space-y-5 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Campaign Name *</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Ambiance Luxury Crystal Sale"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Badge Text (Displayed on Product Card)</Label>
                <Input
                  value={campaignBadge}
                  onChange={(e) => setCampaignBadge(e.target.value)}
                  placeholder="e.g. 🔥 SALE -20%, LENTE DEAL"
                />
              </div>
            </div>

            {/* Discount Configuration */}
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Discount Configuration
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Discount Type</Label>
                  <Select
                    value={campaignDiscountType}
                    onValueChange={(v: "percentage" | "fixed") => setCampaignDiscountType(v)}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Discount (% OFF)</SelectItem>
                      <SelectItem value="fixed">Fixed Price Reduction (€ OFF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {campaignDiscountType === "percentage" ? "Percentage Off (%)" : "Flat Amount (€)"}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max={campaignDiscountType === "percentage" ? "99" : "1000"}
                    value={campaignDiscountValue}
                    onChange={(e) => setCampaignDiscountValue(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Target Scope Selection */}
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Target Products Scope
              </Label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: "all", label: "Storewide (All Catalog)" },
                  { id: "series", label: "🏷️ Brand / Series / Category Cascade" },
                  { id: "products", label: "🎯 Specific Products" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCampaignTargetScope(s.id as any)}
                    className={`p-2 rounded-lg border text-center font-medium transition-all ${
                      campaignTargetScope === s.id || (s.id === "series" && ["series", "brand", "category", "subcategory"].includes(campaignTargetScope))
                        ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold shadow-2xs"
                        : "border-input bg-background/50 hover:bg-background text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Cascading dropdowns (Brand -> Collection/Series -> Category -> Subcategory) */}
              {campaignTargetScope !== "products" && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Brand selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>1. Brand Filter</span>
                        {campaignBrandId && (
                          <button
                            type="button"
                            onClick={() => setCampaignBrandId("")}
                            className="text-[10px] text-amber-600 hover:underline font-normal"
                          >
                            Reset
                          </button>
                        )}
                      </Label>
                      <Select
                        value={campaignBrandId || "all"}
                        onValueChange={(v) => setCampaignBrandId(v === "all" ? "" : v)}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue placeholder="All Brands (or select Lumio, Philips...)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Brands (Storewide or any brand)</SelectItem>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Series / Collection selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>2. Collection / Series</span>
                        {campaignSeriesSlug && (
                          <button
                            type="button"
                            onClick={() => setCampaignSeriesSlug("")}
                            className="text-[10px] text-amber-600 hover:underline font-normal"
                          >
                            Reset
                          </button>
                        )}
                      </Label>
                      <Select
                        value={campaignSeriesSlug || "all"}
                        onValueChange={(v) => setCampaignSeriesSlug(v === "all" ? "" : v)}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue placeholder="All Collections (or select Sofia, Ambiance...)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Collections / Series</SelectItem>
                          {series.map((s) => (
                            <SelectItem key={s.id} value={s.slug}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>3. Category Filter</span>
                        {campaignCategoryId && (
                          <button
                            type="button"
                            onClick={() => {
                              setCampaignCategoryId("");
                              setCampaignSubcategoryId("");
                            }}
                            className="text-[10px] text-amber-600 hover:underline font-normal"
                          >
                            Reset
                          </button>
                        )}
                      </Label>
                      <Select
                        value={campaignCategoryId || "all"}
                        onValueChange={(v) => {
                          setCampaignCategoryId(v === "all" ? "" : v);
                          setCampaignSubcategoryId("");
                        }}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories
                            .filter((c) => !c.parentId)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategory selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>4. Subcategory Filter</span>
                        {campaignSubcategoryId && (
                          <button
                            type="button"
                            onClick={() => setCampaignSubcategoryId("")}
                            className="text-[10px] text-amber-600 hover:underline font-normal"
                          >
                            Reset
                          </button>
                        )}
                      </Label>
                      <Select
                        disabled={!campaignCategoryId}
                        value={campaignSubcategoryId || "all"}
                        onValueChange={(v) => setCampaignSubcategoryId(v === "all" ? "" : v)}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue placeholder={campaignCategoryId ? "All Subcategories in Category" : "Select Category first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subcategories in Category</SelectItem>
                          {categories
                            .filter((c) => c.parentId === campaignCategoryId)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    💡 Tip: You can combine any filter (e.g. Brand: Lumio + Series: Sofia + Category: Hanglampen) or leave them as "All" to target everything.
                  </p>
                </div>
              )}

              {/* Specific Product Multi-selector */}
              {campaignTargetScope === "products" && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Select Products ({campaignProductIds.length} selected):</span>
                    {campaignProductIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCampaignProductIds([])}
                        className="text-primary hover:underline text-[11px]"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  <Input
                    placeholder="Search catalog by product name (e.g. Sofia Gold)..."
                    value={productPickerSearch}
                    onChange={(e) => setProductPickerSearch(e.target.value)}
                    className="h-8 text-xs"
                  />

                  <div className="max-h-52 overflow-y-auto rounded-lg border bg-background p-2 divide-y text-xs">
                    {catalogProducts
                      .filter((p) => {
                        const q = productPickerSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (p.name || "").toLowerCase().includes(q) ||
                          (p.brand?.name || "").toLowerCase().includes(q)
                        );
                      })
                      .map((p) => {
                        const isChecked = campaignProductIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className="flex items-center gap-3 p-1.5 hover:bg-muted/40 cursor-pointer rounded-md"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(c) => {
                                if (c) {
                                  setCampaignProductIds((prev) => [...prev, p.id]);
                                } else {
                                  setCampaignProductIds((prev) => prev.filter((id) => id !== p.id));
                                }
                              }}
                            />
                            <SafeImage
                              src={p.image}
                              alt=""
                              className="h-8 w-8 rounded object-cover border shrink-0"
                              fallbackType="product"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">€{p.price}</p>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Validity Dates & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={campaignStartDate}
                  onChange={(e) => setCampaignStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date (Optional)</Label>
                <Input
                  type="date"
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-xs font-bold block">Activate Now</Label>
                  <span className="text-[10px] text-muted-foreground">Apply sale prices immediately</span>
                </div>
                <Switch checked={campaignIsActive} onCheckedChange={setCampaignIsActive} />
              </div>
            </div>

            {/* Live Matched Products Preview Section */}
            <div className="rounded-xl border bg-background p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Matching Products Preview</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {isLoadingPreview ? "Calculating..." : `${previewProducts.length} matched`}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Prices calculate automatically based on discount
                </span>
              </div>

              {isLoadingPreview ? (
                <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span>Calculating sale prices...</span>
                </div>
              ) : previewProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No products in catalog match the chosen scope. Try choosing another collection or category.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y rounded-lg border text-xs">
                  {previewProducts.slice(0, 10).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted/20">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <SafeImage
                          src={p.image}
                          alt=""
                          className="h-8 w-8 rounded object-cover border shrink-0"
                          fallbackType="product"
                        />
                        <div className="truncate">
                          <p className="font-semibold truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.categoryName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <span className="font-bold text-amber-600">€{p.salePrice.toFixed(2)}</span>
                          <span className="ml-1 text-[11px] text-muted-foreground line-through">
                            €{p.currentPrice.toFixed(2)}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          -{p.discountPercent}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {previewProducts.length > 10 && (
                    <div className="p-2 text-center text-[11px] text-muted-foreground italic bg-muted/10">
                      + {previewProducts.length - 10} more products will be included in this sale
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCampaignDialogOpen(false)}
                disabled={isSavingCampaign}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingCampaign}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {isSavingCampaign ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving & Applying Prices...
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    {campaignIsActive ? "Save & Activate Sale" : "Save as Draft"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW AFFECTED PRODUCTS PREVIEW                                   */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(viewingCampaign)} onOpenChange={(open) => !open && setViewingCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg">
                Products in Campaign: {viewingCampaign?.name}
              </DialogTitle>
            </div>
            <DialogDescription>
              {viewingProducts.length} product(s) affected by this sale.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto divide-y rounded-xl border my-2 text-xs">
            {isLoadingViewingProducts ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading products...</span>
              </div>
            ) : viewingProducts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No products found for this campaign.</div>
            ) : (
              viewingProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <SafeImage
                      src={p.image}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover border shrink-0"
                      fallbackType="product"
                    />
                    <div className="truncate">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.categoryName} · {p.brandName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <p className="font-bold text-sm text-amber-600">€{p.salePrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground line-through">€{p.currentPrice.toFixed(2)}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      -{p.discountPercent}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingCampaign(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: COUPON CODE CREATOR / EDITOR                                     */}
      {/* ========================================================================= */}
      <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCoupon} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs font-bold">
                Coupon Code *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="e.g. SUMMER2026"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase"
                />
                <Button type="button" variant="outline" onClick={handleGenerateCode}>
                  Generate
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Discount Type</Label>
                <Select value={couponDiscountType} onValueChange={setCouponDiscountType}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="val" className="text-xs font-bold">
                  {couponDiscountType === "percentage" ? "Percentage Off (%)" : "Flat Amount (€)"} *
                </Label>
                <Input
                  id="val"
                  type="number"
                  min="1"
                  max={couponDiscountType === "percentage" ? "100" : "10000"}
                  value={couponValue}
                  onChange={(e) => setCouponValue(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minOrder" className="text-xs font-bold">
                  Min. Order Value (€)
                </Label>
                <Input
                  id="minOrder"
                  type="number"
                  min="0"
                  value={couponMinOrderValue}
                  onChange={(e) => setCouponMinOrderValue(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiry" className="text-xs font-bold">
                  Expiry Date
                </Label>
                <Input
                  id="expiry"
                  type="date"
                  value={couponExpiresAt}
                  onChange={(e) => setCouponExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
              <div>
                <Label className="text-xs font-bold block">Coupon Active</Label>
                <span className="text-[11px] text-muted-foreground">Customers can apply at checkout</span>
              </div>
              <Switch checked={isCouponActive} onCheckedChange={setIsCouponActive} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCouponDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Coupon</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
