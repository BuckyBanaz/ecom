import type { Attribute, AttributeValue } from "@prisma/client";
import { prisma } from "../config/db";
import { deriveDimensionBucketsFromSpecs, isDimensionSlug, normalizeDimensionValue } from "../utils/dimensionAttributes";

/**
 * Existing value of `attribute` that `raw` refers to, or null. Never creates values — options are
 * managed on the Attributes page only.
 */
export async function resolveAttributeValue(attribute: Attribute, raw: unknown): Promise<AttributeValue | null> {
  if (!raw) return null;
  const cleanVal = String(raw).trim();
  if (!cleanVal || /^sku[-_]/i.test(cleanVal) || /^https?:\/\//i.test(cleanVal) || cleanVal.length > 50) {
    return null;
  }

  // Length / Diameter / Width: any size ("36cm") resolves to its bucket ("20-40 cm")
  if (isDimensionSlug(attribute.slug)) {
    const label = normalizeDimensionValue(attribute.slug, cleanVal);
    if (!label) return null;
    return prisma.attributeValue.findFirst({
      where: { attributeId: attribute.id, value: { equals: label, mode: "insensitive" } },
    });
  }

  const exact = await prisma.attributeValue.findFirst({
    where: { attributeId: attribute.id, value: { equals: cleanVal, mode: "insensitive" } },
  });
  if (exact) return exact;

  const numMatch = cleanVal.match(/\d+\s*(?:cm|mm)?/i)?.[0]?.replace(/\s+/g, "").toLowerCase();
  if (!numMatch) return null;
  const allValues = await prisma.attributeValue.findMany({ where: { attributeId: attribute.id } });
  return (
    allValues.find((v) => v.value.replace(/\s+/g, "").toLowerCase() === numMatch || v.value.toLowerCase().includes(numMatch)) ||
    null
  );
}

async function linkValue(productId: string, attributeId: string, attributeValueId: string) {
  await prisma.productAttributeValue.upsert({
    where: { productId_attributeId_attributeValueId: { productId, attributeId, attributeValueId } },
    create: { productId, attributeId, attributeValueId },
    update: {},
  });
}

/**
 * Link a product to attribute values from an `{ slug: value | value[] }` map, then fill any
 * Length / Diameter / Width the map left empty from the product specs ("Lengte: 100 cm").
 */
export async function syncProductAttributes(
  productId: string,
  attributes: unknown,
  specs: unknown,
  options: { replaceExisting: boolean }
): Promise<void> {
  const hasAttributes = !!attributes && typeof attributes === "object";

  if (hasAttributes) {
    if (options.replaceExisting) {
      await prisma.productAttributeValue.deleteMany({ where: { productId } });
    }

    for (const [attrSlug, val] of Object.entries(attributes as Record<string, unknown>)) {
      const attribute = await prisma.attribute.findUnique({ where: { slug: attrSlug } });
      if (!attribute) continue;

      const valList = Array.isArray(val) ? val : [val];
      for (const singleVal of valList) {
        const attrValue = await resolveAttributeValue(attribute, singleVal);
        if (attrValue) await linkValue(productId, attribute.id, attrValue.id);
      }
    }
  }

  const derived = deriveDimensionBucketsFromSpecs(specs);
  for (const [slug, label] of Object.entries(derived)) {
    const attribute = await prisma.attribute.findUnique({ where: { slug } });
    if (!attribute) continue;

    const alreadyLinked = await prisma.productAttributeValue.count({ where: { productId, attributeId: attribute.id } });
    if (alreadyLinked > 0) continue;

    const attrValue = await resolveAttributeValue(attribute, label);
    if (attrValue) await linkValue(productId, attribute.id, attrValue.id);
  }
}
