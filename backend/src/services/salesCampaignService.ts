import { prisma } from "../config/db";
import { randomUUID } from "crypto";

export const SALES_CAMPAIGNS_KEY = "sales_campaigns";

export interface SalesCampaign {
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
  originalPrices?: Record<string, { price: number; oldPrice: number | null }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Load all campaigns from CmsConfig storage
 */
export async function getAllSalesCampaigns(): Promise<SalesCampaign[]> {
  try {
    const row = await prisma.cmsConfig.findUnique({
      where: { key: SALES_CAMPAIGNS_KEY },
    });
    if (!row || !row.value) return [];
    const list = Array.isArray(row.value) ? row.value : (row.value as any).campaigns || [];
    return list as SalesCampaign[];
  } catch (error) {
    console.error("Failed to load sales campaigns:", error);
    return [];
  }
}

/**
 * Save all campaigns to CmsConfig storage
 */
export async function saveSalesCampaigns(campaigns: SalesCampaign[]): Promise<void> {
  await prisma.cmsConfig.upsert({
    where: { key: SALES_CAMPAIGNS_KEY },
    create: {
      key: SALES_CAMPAIGNS_KEY,
      value: campaigns as any,
    },
    update: {
      value: campaigns as any,
    },
  });
}

/**
 * Resolve target products matching campaign criteria
 */
export async function resolveMatchingProducts(campaign: Partial<SalesCampaign>): Promise<any[]> {
  const {
    targetScope,
    targetBrandId,
    targetSeriesSlug,
    targetSeriesName,
    targetCategoryId,
    targetSubcategoryId,
    targetProductIds,
  } = campaign;

  // Specific products directly selected
  if (targetScope === "products" && Array.isArray(targetProductIds) && targetProductIds.length > 0) {
    return prisma.product.findMany({
      where: { id: { in: targetProductIds } },
      include: { category: true, brand: true },
    });
  }

  // Build prisma query filter
  const where: any = {};

  // Brand filter
  if (targetBrandId && targetBrandId !== "all" && targetBrandId !== "none") {
    where.brandId = targetBrandId;
  }

  // Category filter (subcategory or parent category)
  const categoryToFilter = targetSubcategoryId || targetCategoryId;
  if (categoryToFilter && categoryToFilter !== "all") {
    // Check if category has children (i.e. is a parent category)
    const subcats = await prisma.category.findMany({
      where: { parentId: categoryToFilter },
      select: { id: true },
    });

    if (subcats.length > 0) {
      where.categoryId = { in: [categoryToFilter, ...subcats.map((c) => c.id)] };
    } else {
      where.categoryId = categoryToFilter;
    }
  }

  let products = await prisma.product.findMany({
    where,
    include: { category: true, brand: true },
  });

  // Series / Collection filter (inspected through specs JSON, title, and description)
  if (targetSeriesSlug && targetSeriesSlug !== "all") {
    const slugLower = targetSeriesSlug.toLowerCase();
    const nameLower = (targetSeriesName || targetSeriesSlug).toLowerCase();

    products = products.filter((p) => {
      // 1. Check specs (supports both Array and Object formats)
      if (Array.isArray(p.specs)) {
        const hasSeriesSpec = (p.specs as any[]).some((s) => {
          const k = String(s?.key || "").toLowerCase();
          const v = String(s?.value || "").toLowerCase();
          return (
            (k === "collectie" || k === "series" || k === "collection") &&
            (v.includes(slugLower) || v.includes(nameLower) || slugLower.includes(v))
          );
        });
        if (hasSeriesSpec) return true;
      } else if (p.specs && typeof p.specs === "object") {
        for (const [k, v] of Object.entries(p.specs)) {
          const kLower = k.toLowerCase();
          const vLower = String(v || "").toLowerCase();
          if (
            (kLower === "collectie" || kLower === "series" || kLower === "collection") &&
            (vLower.includes(slugLower) || vLower.includes(nameLower) || slugLower.includes(vLower))
          ) {
            return true;
          }
        }
      }

      // 2. Check title / name
      const titleLower = String(p.name || "").toLowerCase();
      if (titleLower.includes(nameLower) || titleLower.includes(slugLower)) return true;

      // 3. Check shortDescription & description
      const shortDescLower = String(p.shortDescription || "").toLowerCase();
      const descLower = String(p.description || "").toLowerCase();
      if (shortDescLower.includes(nameLower) || descLower.includes(nameLower)) return true;

      return false;
    });
  }

  return products;
}

/**
 * Preview campaign products with calculated new prices
 */
export async function previewCampaignProducts(
  campaign: Partial<SalesCampaign>
): Promise<{
  totalCount: number;
  products: Array<{
    id: string;
    name: string;
    image: string;
    currentPrice: number;
    currentOldPrice: number | null;
    salePrice: number;
    discountPercent: number;
    categoryName: string;
    brandName: string;
  }>;
}> {
  const matched = await resolveMatchingProducts(campaign);
  const discountType = campaign.discountType || "percentage";
  const discountValue = Number(campaign.discountValue) || 0;

  const previewList = matched.map((p) => {
    const original = p.price;
    let salePrice = original;

    if (discountType === "percentage") {
      const discount = (original * discountValue) / 100;
      salePrice = Math.max(1, Math.round((original - discount) * 100) / 100);
    } else {
      salePrice = Math.max(1, Math.round((original - discountValue) * 100) / 100);
    }

    const discountPercent =
      original > 0 ? Math.round(((original - salePrice) / original) * 100) : 0;

    return {
      id: p.id,
      name: p.name,
      image: p.image,
      currentPrice: original,
      currentOldPrice: p.oldPrice,
      salePrice,
      discountPercent,
      categoryName: p.category?.name || "Uncategorized",
      brandName: p.brand?.name || "Schip en Ster",
    };
  });

  return {
    totalCount: previewList.length,
    products: previewList,
  };
}

/**
 * Apply campaign discounts to database products
 */
export async function applyCampaignToProducts(
  campaign: SalesCampaign
): Promise<{ affectedCount: number; originalPrices: Record<string, { price: number; oldPrice: number | null }> }> {
  const matched = await resolveMatchingProducts(campaign);
  const originalPrices: Record<string, { price: number; oldPrice: number | null }> = {};

  const discountType = campaign.discountType;
  const discountValue = Number(campaign.discountValue) || 0;

  for (const product of matched) {
    // Record original price state for safe rollback
    originalPrices[product.id] = {
      price: product.price,
      oldPrice: product.oldPrice,
    };

    let newPrice = product.price;
    if (discountType === "percentage") {
      const discount = (product.price * discountValue) / 100;
      newPrice = Math.max(1, Math.round((product.price - discount) * 100) / 100);
    } else {
      newPrice = Math.max(1, Math.round((product.price - discountValue) * 100) / 100);
    }

    // Set oldPrice to regular price so customer sees strikethrough: €newPrice €oldPrice (-X%)
    const newOldPrice = (product.oldPrice && product.oldPrice > product.price) ? product.oldPrice : product.price;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: newPrice,
        oldPrice: newOldPrice,
      },
    });
  }

  return {
    affectedCount: matched.length,
    originalPrices,
  };
}

/**
 * Rollback / restore original prices for campaign products
 */
export async function rollbackCampaignProducts(campaign: SalesCampaign): Promise<number> {
  const originals = campaign.originalPrices || {};
  let restoredCount = 0;

  for (const [productId, saved] of Object.entries(originals)) {
    try {
      await prisma.product.update({
        where: { id: productId },
        data: {
          price: saved.price,
          oldPrice: saved.oldPrice,
        },
      });
      restoredCount++;
    } catch (e) {
      console.warn(`Could not restore price for product ${productId}:`, e);
    }
  }

  return restoredCount;
}

/**
 * Create a new campaign
 */
export async function createSalesCampaign(
  data: Omit<SalesCampaign, "id" | "createdAt" | "updatedAt">
): Promise<SalesCampaign> {
  const campaigns = await getAllSalesCampaigns();
  const id = randomUUID();

  const campaign: SalesCampaign = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalPrices: {},
  };

  if (campaign.isActive) {
    const { affectedCount, originalPrices } = await applyCampaignToProducts(campaign);
    campaign.affectedProductCount = affectedCount;
    campaign.originalPrices = originalPrices;
  } else {
    const preview = await previewCampaignProducts(campaign);
    campaign.affectedProductCount = preview.totalCount;
  }

  campaigns.unshift(campaign);
  await saveSalesCampaigns(campaigns);

  return campaign;
}

/**
 * Update an existing campaign
 */
export async function updateSalesCampaign(
  id: string,
  data: Partial<SalesCampaign>
): Promise<SalesCampaign> {
  const campaigns = await getAllSalesCampaigns();
  const index = campaigns.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error("Campaign not found");
  }

  const existing = campaigns[index];

  // If it was active and is being changed, first rollback old prices
  if (existing.isActive) {
    await rollbackCampaignProducts(existing);
  }

  const updated: SalesCampaign = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (updated.isActive) {
    const { affectedCount, originalPrices } = await applyCampaignToProducts(updated);
    updated.affectedProductCount = affectedCount;
    updated.originalPrices = originalPrices;
  } else {
    updated.originalPrices = {};
    const preview = await previewCampaignProducts(updated);
    updated.affectedProductCount = preview.totalCount;
  }

  campaigns[index] = updated;
  await saveSalesCampaigns(campaigns);

  return updated;
}

/**
 * Toggle campaign active/inactive (1-click apply/rollback)
 */
export async function toggleSalesCampaign(
  id: string,
  isActive: boolean
): Promise<SalesCampaign> {
  return updateSalesCampaign(id, { isActive });
}

/**
 * Delete a campaign (rolls back prices first)
 */
export async function deleteSalesCampaign(id: string): Promise<void> {
  const campaigns = await getAllSalesCampaigns();
  const target = campaigns.find((c) => c.id === id);

  if (target && target.isActive) {
    await rollbackCampaignProducts(target);
  }

  const filtered = campaigns.filter((c) => c.id !== id);
  await saveSalesCampaigns(filtered);
}
