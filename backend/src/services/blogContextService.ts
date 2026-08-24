import { prisma } from "../config/db";
import { getAiOutputLanguage, type AiOutputLanguage } from "../utils/aiLanguage";

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

function discountLabel(lang: AiOutputLanguage, c: { discountType: string; value: number }): string {
  if (lang === "nl") {
    return c.discountType === "percentage" ? `${c.value}% korting` : `€${c.value} korting`;
  }
  if (lang === "de") {
    return c.discountType === "percentage" ? `${c.value}% Rabatt` : `€${c.value} Rabatt`;
  }
  if (lang === "fr") {
    return c.discountType === "percentage" ? `${c.value}% de réduction` : `€${c.value} de réduction`;
  }
  return c.discountType === "percentage" ? `${c.value}% off` : `€${c.value} off`;
}

function offerTopic(
  lang: AiOutputLanguage,
  code: string,
  discount: string,
  minOrderValue: number,
): string {
  const min =
    minOrderValue > 0
      ? lang === "nl"
        ? ` bij bestellingen boven €${minOrderValue}`
        : lang === "de"
          ? ` bei Bestellungen über €${minOrderValue}`
          : lang === "fr"
            ? ` pour les commandes de plus de €${minOrderValue}`
            : ` on orders over €${minOrderValue}`
      : "";

  if (lang === "nl") {
    return `Schrijf een blogartikel over onze actieve aanbieding: couponcode "${code}" geeft ${discount}${min}. Leg de waarde uit, voor wie het is, en noem relevante verlichting. Noem de code op een natuurlijke manier.`;
  }
  if (lang === "de") {
    return `Schreiben Sie einen Blogbeitrag über unser aktives Angebot: Gutscheincode "${code}" gibt ${discount}${min}. Erklären Sie den Nutzen, die Zielgruppe und passende Beleuchtung. Erwähnen Sie den Code natürlich.`;
  }
  if (lang === "fr") {
    return `Rédigez un article de blog sur notre offre active : le code "${code}" offre ${discount}${min}. Expliquez la valeur, le public visé et des produits d'éclairage pertinents. Mentionnez le code naturellement.`;
  }
  return `Write a blog post promoting our active store offer: coupon code "${code}" gives ${discount}${min}. Explain the value, who it's for, and link-worthy lighting picks. Mention the code naturally.`;
}

function newProductTopic(lang: AiOutputLanguage, name: string, category: string, price: string): string {
  if (lang === "nl") {
    return `Schrijf een blogartikel over ons nieuwe product "${name}" in de categorie ${category} (€${price}). Leg voordelen, stylingtips en voor wie het geschikt is uit.`;
  }
  if (lang === "de") {
    return `Schreiben Sie einen Blogbeitrag über unser neues Produkt "${name}" in der Kategorie ${category} (€${price}). Erklären Sie Vorteile, Styling-Tipps und die Zielgruppe.`;
  }
  if (lang === "fr") {
    return `Rédigez un article sur notre nouveau produit "${name}" dans la catégorie ${category} (€${price}). Expliquez les avantages, idées déco et le public visé.`;
  }
  return `Write a blog post introducing our newly added product "${name}" in the ${category} category (€${price}). Explain benefits, styling tips, and who should buy it.`;
}

function priceDropTopic(
  lang: AiOutputLanguage,
  name: string,
  price: string,
  oldPrice: string,
  drop: number,
): string {
  if (lang === "nl") {
    return `Schrijf een blogartikel over onze prijsdaling op "${name}" — nu €${price} (was €${oldPrice}, ${drop}% korting). Creëer urgentie zonder spam; benadruk waarde en stylingideeën.`;
  }
  if (lang === "de") {
    return `Schreiben Sie einen Blogbeitrag über unsere Preissenkung für "${name}" — jetzt €${price} (vorher €${oldPrice}, ${drop}% Rabatt). Erzeugen Sie Dringlichkeit ohne Spam; heben Sie Wert und Einrichtungsideen hervor.`;
  }
  if (lang === "fr") {
    return `Rédigez un article sur la baisse de prix de "${name}" — maintenant €${price} (était €${oldPrice}, ${drop}% de réduction). Créez de l'urgence sans spam ; mettez en avant la valeur et des idées déco.`;
  }
  return `Write a blog post about our price drop on "${name}" — now €${price} (was €${oldPrice}, ${drop}% off). Create urgency without being spammy; highlight value and room styling ideas.`;
}

function newArrivalTopic(lang: AiOutputLanguage, name: string, category: string): string {
  if (lang === "nl") {
    return `Schrijf een blogartikel over onze nieuw binnen "${name}" (${category}). Focus op trends, installatietips en waarom het nu de moeite waard is.`;
  }
  if (lang === "de") {
    return `Schreiben Sie einen Blogbeitrag über unsere Neuheit "${name}" (${category}). Fokus auf Trends, Installationstipps und warum es sich jetzt lohnt.`;
  }
  if (lang === "fr") {
    return `Rédigez un article sur notre nouveauté "${name}" (${category}). Axé sur les tendances, conseils d'installation et intérêt actuel.`;
  }
  return `Write a blog post spotlighting our new arrival "${name}" (${category}). Focus on trends, installation tips, and why it's worth considering now.`;
}

function bestSellerTopic(lang: AiOutputLanguage, name: string, category: string): string {
  if (lang === "nl") {
    return `Schrijf een blogartikel over waarom "${name}" een van onze bestsellers is in ${category} — social proof, use cases en koopgids.`;
  }
  if (lang === "de") {
    return `Schreiben Sie einen Blogbeitrag darüber, warum "${name}" ein Bestseller in ${category} ist — Social Proof, Anwendungsfälle und Kaufberatung.`;
  }
  if (lang === "fr") {
    return `Rédigez un article expliquant pourquoi "${name}" est un best-seller en ${category} — preuve sociale, usages et guide d'achat.`;
  }
  return `Write a blog post about why "${name}" is one of our best-selling ${category} items — social proof, use cases, and buyer guide.`;
}

function generalTopic(lang: AiOutputLanguage): string {
  if (lang === "nl") {
    return "Schrijf een expertgids over woontrends in verlichting 2026 voor huiseigenaren in Nederland — hanglampen, LED-efficiëntie en tips per kamer.";
  }
  if (lang === "de") {
    return "Schreiben Sie einen Expertenratgeber zu Beleuchtungstrends 2026 für Hausbesitzer in den Niederlanden — Pendelleuchten, LED-Effizienz und Raum-für-Raum-Tipps.";
  }
  if (lang === "fr") {
    return "Rédigez un guide expert sur les tendances éclairage 2026 pour les propriétaires aux Pays-Bas — suspensions, efficacité LED et conseils pièce par pièce.";
  }
  return "Write an expert guide on 2026 home lighting trends for homeowners in the Netherlands — pendant lights, LED efficiency, and room-by-room tips.";
}

export async function getBlogTopicSuggestions(): Promise<BlogTopicSuggestion[]> {
  const lang = getAiOutputLanguage();
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
    const discount = discountLabel(lang, c);
    suggestions.push({
      id: `offer-${c.id}`,
      type: "offer",
      label: `Offer: ${c.code} (${discount})`,
      topic: offerTopic(lang, c.code, discount, c.minOrderValue),
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
      topic: newProductTopic(lang, p.name, p.category.name, p.price.toFixed(2)),
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
      topic: priceDropTopic(lang, p.name, p.price.toFixed(2), p.oldPrice!.toFixed(2), drop),
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
      topic: newArrivalTopic(lang, p.name, p.category.name),
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
      topic: bestSellerTopic(lang, p.name, p.category.name),
      meta: { product: p.name },
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "general-lighting",
      type: "general",
      label: "Lighting trends guide",
      topic: generalTopic(lang),
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
