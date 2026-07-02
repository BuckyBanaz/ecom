import { prisma } from "../config/db";

export type BlogTopicType = "offer" | "new_product" | "price_drop" | "new_arrival" | "best_seller" | "general";

export interface BlogTopicSuggestion {
  id: string;
  type: BlogTopicType;
  label: string;
  topic: string;
  meta?: Record<string, string | number>;
}

function pctDrop(price: number, oldPrice: number): number {
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export async function getBlogTopicSuggestions(): Promise<BlogTopicSuggestion[]> {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const suggestions: BlogTopicSuggestion[] = [];

  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  for (const c of coupons) {
    const discount =
      c.discountType === "percentage" ? `${c.value}% off` : `€${c.value} off`;
    suggestions.push({
      id: `offer-${c.id}`,
      type: "offer",
      label: `Offer: ${c.code} (${discount})`,
      topic: `Write a blog post promoting our active store offer: coupon code "${c.code}" gives ${discount} on orders${c.minOrderValue > 0 ? ` over €${c.minOrderValue}` : ""}. Explain the value, who it's for, and link-worthy lighting picks. Mention the code naturally.`,
      meta: { code: c.code, discount },
    });
  }

  const newProducts = await prisma.product.findMany({
    where: { createdAt: { gte: twoWeeksAgo } },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: { category: { select: { name: true } } },
  });

  for (const p of newProducts) {
    suggestions.push({
      id: `new-${p.id}`,
      type: "new_product",
      label: `New: ${p.name}`,
      topic: `Write a blog post introducing our newly added product "${p.name}" in the ${p.category.name} category (€${p.price.toFixed(2)}). Explain benefits, styling tips, and who should buy it.`,
      meta: { product: p.name, price: p.price },
    });
  }

  const withOldPrice = await prisma.product.findMany({
    where: { oldPrice: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { category: { select: { name: true } } },
  });

  for (const p of withOldPrice.filter((x) => x.oldPrice != null && x.oldPrice > x.price).slice(0, 4)) {
    const drop = pctDrop(p.price, p.oldPrice!);
    suggestions.push({
      id: `drop-${p.id}`,
      type: "price_drop",
      label: `Price drop: ${p.name} (−${drop}%)`,
      topic: `Write a blog post about our price drop on "${p.name}" — now €${p.price.toFixed(2)} (was €${p.oldPrice!.toFixed(2)}, ${drop}% off). Create urgency without being spammy; highlight value and room styling ideas.`,
      meta: { product: p.name, drop, price: p.price, oldPrice: p.oldPrice! },
    });
  }

  const newArrivals = await prisma.product.findMany({
    where: { isNewArrival: true },
    orderBy: { updatedAt: "desc" },
    take: 3,
    include: { category: { select: { name: true } } },
  });

  for (const p of newArrivals) {
    if (suggestions.some((s) => s.id === `new-${p.id}` || s.meta?.product === p.name)) continue;
    suggestions.push({
      id: `arrival-${p.id}`,
      type: "new_arrival",
      label: `New arrival: ${p.name}`,
      topic: `Write a blog post spotlighting our new arrival "${p.name}" (${p.category.name}). Focus on trends, installation tips, and why it's worth considering now.`,
      meta: { product: p.name },
    });
  }

  const bestSellers = await prisma.product.findMany({
    where: { isBestSelling: true },
    orderBy: { reviewCount: "desc" },
    take: 2,
    include: { category: { select: { name: true } } },
  });

  for (const p of bestSellers) {
    suggestions.push({
      id: `best-${p.id}`,
      type: "best_seller",
      label: `Best seller: ${p.name}`,
      topic: `Write a blog post about why "${p.name}" is one of our best-selling ${p.category.name} items — social proof, use cases, and buyer guide.`,
      meta: { product: p.name },
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "general-lighting",
      type: "general",
      label: "Lighting trends guide",
      topic: "Write an expert guide on 2026 home lighting trends for Dutch homeowners — pendant lights, LED efficiency, and room-by-room tips.",
    });
  }

  return suggestions.slice(0, 12);
}

/** Pick the best auto topic when none is provided (priority: offer → price drop → new product). */
export async function pickAutoBlogTopic(): Promise<string | undefined> {
  const list = await getBlogTopicSuggestions();
  const priority: BlogTopicType[] = ["offer", "price_drop", "new_product", "new_arrival", "best_seller", "general"];
  for (const type of priority) {
    const hit = list.find((s) => s.type === type);
    if (hit) return hit.topic;
  }
  return list[0]?.topic;
}
