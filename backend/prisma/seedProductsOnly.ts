/**
 * Production-safe catalog seed — upserts seed.ts demo products into EXISTING categories.
 * Does NOT delete users, orders, categories, CMS, mega menu, or other production data.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** seed.ts category keys → production category slugs on server */
const CATEGORY_SLUG_MAP: Record<string, string> = {
  "pendant-lights": "pendant-light",
  "wall-lights": "wall-lights",
  "floor-lamps": "floor-lamps",
  "table-lamps": "table-lamps",
  spotlights: "spotlights",
  "light-sources": "light-sources",
};

const PRODUCT_NAMES: Record<string, string[]> = {
  "pendant-lights": [
    "Mira Rattan Pendant",
    "Nordic Dome Pendant",
    "Globe Glass Pendant",
    "Bamboo Bell Pendant",
    "Linear Crystal Chandelier",
    "Black Branch Chandelier",
  ],
  "wall-lights": ["Spot Adjustable Wall Light", "Brass Sconce Wall Lamp"],
  "floor-lamps": ["Tripod Rattan Floor Lamp", "Arc Marble Base Floor Lamp"],
  "table-lamps": ["Rattan Cage Table Lamp", "Ceramic Vase Table Lamp"],
  spotlights: [
    "Halo Plaster Ceiling Light",
    "Scallop Cloud Ceiling Lamp",
    "Round Flush Mount LED",
    "LED Panel 60x60 4000K",
    "Suspended Office Light",
  ],
  "light-sources": [
    "Smart Color RGB Bulb E27",
    "Smart White Tunable Bulb E14",
    "Edison Filament LED 6W",
    "Globe LED Warm 8W",
    "Pink Elephant Kids Shade",
    "Linen Drum Shade Natural",
  ],
};

const BRAND_NAMES = ["Lumio", "Brilliant", "Calex", "Philips", "Eglo", "Steinhauer"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function imageShorthand(seedCatSlug: string): string {
  let shorthand = seedCatSlug
    .replace("-lamps", "")
    .replace("-lights", "")
    .replace("-bulbs", "");
  if (shorthand === "spotlights") return "ceiling";
  if (shorthand === "light-sources") return "bulbs";
  return shorthand;
}

function buildSpecs(
  counter: number,
  colorVal: string,
  materialVal: string,
  styleVal: string,
  fittingVal: string,
  dimmableVal: string,
  ipRatingVal: string
) {
  return [
    { key: "Maximum wattage", value: `${[7, 10, 15, 25][counter % 4]}W`, link: "" },
    { key: "Connection voltage", value: "220-240V", link: "" },
    { key: "Type of fitting", value: fittingVal, link: "" },
    { key: "Includes light", value: counter % 3 === 0 ? "Yes" : "No", link: "" },
    { key: "Dimmable", value: dimmableVal === "Yes" ? "Yes (not included)" : "No", link: "" },
    { key: "Length in cm", value: `${30 + (counter % 5) * 10}`, link: "" },
    { key: "Width in cm", value: `${30 + (counter % 5) * 10}`, link: "" },
    { key: "Height in cm", value: `${120 + (counter % 5) * 20}`, link: "" },
    { key: "Colour", value: colorVal, link: "" },
    { key: "Material", value: materialVal, link: "" },
    { key: "Style", value: styleVal, link: "" },
    { key: "Warranty", value: "2 years", link: "" },
    { key: "Article number", value: `Q10${750 + counter}`, link: "" },
    {
      key: "IP rating",
      value: ipRatingVal === "IP44" ? "IP44 (splashproof)" : "IP20 (dustproof)",
      link: "",
    },
    { key: "Number of lights", value: `${(counter % 3) + 1}`, link: "" },
  ];
}

async function linkProductAttributes(
  productId: string,
  attrs: Array<{ slug: string; val: string }>,
  attributesMap: Record<string, { id: string }>,
  valuesMap: Record<string, Record<string, { id: string }>>
) {
  for (const { slug, val } of attrs) {
    const attribute = attributesMap[slug];
    const valObj = valuesMap[slug]?.[val.toLowerCase()];
    if (!attribute || !valObj) continue;

    const existing = await prisma.productAttributeValue.findFirst({
      where: {
        productId,
        attributeId: attribute.id,
        attributeValueId: valObj.id,
      },
    });
    if (existing) continue;

    await prisma.productAttributeValue.create({
      data: {
        productId,
        attributeId: attribute.id,
        attributeValueId: valObj.id,
      },
    });
  }
}

async function seedDefaultReviews(productId: string) {
  const count = await prisma.review.count({ where: { productId } });
  if (count > 0) return;

  await prisma.review.createMany({
    data: [
      {
        productId,
        name: "Sophie V.",
        rating: 5,
        title: "Beautiful lamp, fast delivery",
        text: "Ordered late in the evening and it arrived the next morning. The lamp is even nicer in person.",
      },
      {
        productId,
        name: "Mark D.",
        rating: 5,
        title: "Great service",
        text: "Helpful customer service when I had a question about the bulb fitting. Recommended!",
      },
      {
        productId,
        name: "Anna J.",
        rating: 4,
        title: "Looks lovely",
        text: "Looks great in the living room. One star less because assembly took a bit of time.",
      },
    ],
  });
}

async function main() {
  console.log("🌱 Production-safe product seed (categories/users/orders untouched)...");

  const categories = await prisma.category.findMany({
    where: { slug: { in: Object.values(CATEGORY_SLUG_MAP) } },
  });
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const missingSlugs = Object.values(CATEGORY_SLUG_MAP).filter((s) => !categoryBySlug[s]);
  if (missingSlugs.length > 0) {
    console.warn(`⚠️  Missing categories (create in admin first): ${missingSlugs.join(", ")}`);
  }

  const brands = await prisma.brand.findMany({ where: { name: { in: BRAND_NAMES } } });
  const brandByName = Object.fromEntries(brands.map((b) => [b.name, b]));
  const fallbackBrand = brands[0] ?? null;

  const attributes = await prisma.attribute.findMany({
    include: { attributeValues: true },
  });
  const attributesMap: Record<string, { id: string }> = {};
  const valuesMap: Record<string, Record<string, { id: string }>> = {};
  for (const attr of attributes) {
    attributesMap[attr.slug] = { id: attr.id };
    valuesMap[attr.slug] = {};
    for (const v of attr.attributeValues) {
      valuesMap[attr.slug][v.value.toLowerCase()] = { id: v.id };
    }
  }

  let counter = 0;
  let reassigned = 0;
  let created = 0;
  let updated = 0;

  for (const [seedCatSlug, names] of Object.entries(PRODUCT_NAMES)) {
    const prodSlug = CATEGORY_SLUG_MAP[seedCatSlug];
    const category = categoryBySlug[prodSlug];
    if (!category) {
      console.log(`⏭️  Skip ${seedCatSlug} — category "${prodSlug}" not found`);
      continue;
    }

    console.log(`\n📂 ${category.name} (${prodSlug})`);

    for (const name of names) {
      counter++;
      const stableSlug = slugify(name);
      const price = +(19.95 + ((counter * 7) % 240)).toFixed(2);
      const onSale = counter % 3 === 0;
      const oldPrice = onSale ? +(price * 1.4).toFixed(2) : null;
      const imgShorthand = imageShorthand(seedCatSlug);
      const brandName = BRAND_NAMES[counter % BRAND_NAMES.length];
      const brand = brandByName[brandName] ?? fallbackBrand;

      const colorVal = ["Black", "White", "Gold", "Natural"][counter % 4];
      const materialVal = ["Metal", "Rattan", "Glass", "Fabric"][counter % 4];
      const styleVal = ["Modern", "Industrial", "Scandinavian", "Classic"][counter % 4];
      const fittingVal = ["E27", "E14", "GU10", "Integrated LED"][counter % 4];
      const dimmableVal = counter % 2 === 0 ? "Yes" : "No";
      const ipRatingVal = "IP20";
      const roomVal = "Living room";
      const diameterVal = ["20-40 cm", "40-60 cm"][counter % 2];
      const lengthVal = "40-60 cm";

      const specs = buildSpecs(
        counter,
        colorVal,
        materialVal,
        styleVal,
        fittingVal,
        dimmableVal,
        ipRatingVal
      );

      const productFields = {
        name,
        brandId: brand?.id ?? null,
        categoryId: category.id,
        price,
        oldPrice,
        rating: +(4 + (counter % 10) / 10).toFixed(1),
        reviewCount: 12 + counter * 7,
        image: `/assets/cat-${imgShorthand}.jpg`,
        inStock: counter % 11 !== 0,
        isNewArrival: counter % 4 === 0,
        isBestSelling: counter % 3 === 0,
        description:
          "A beautifully crafted lamp that combines functional lighting with timeless design. Perfect for setting the mood in any room.",
        specs,
        seoTitle: `${name} - Buy Premium E-Commerce Lighting`,
        seoDescription: `Get the premium ${name} at discounted prices. High quality design, fast shipping.`,
        seoKeywords: `lamp, lighting, ${name.toLowerCase()}`,
      };

      const byName = await prisma.product.findFirst({ where: { name } });
      const bySlug = await prisma.product.findUnique({ where: { slug: stableSlug } });
      const existing = byName ?? bySlug;

      if (existing) {
        const moved = existing.categoryId !== category.id;
        await prisma.product.update({
          where: { id: existing.id },
          data: productFields,
        });
        if (moved) {
          reassigned++;
          console.log(`  ↪ Reassigned: ${name}`);
        } else {
          updated++;
          console.log(`  ✓ Updated: ${name}`);
        }

        await linkProductAttributes(
          existing.id,
          [
            { slug: "color", val: colorVal },
            { slug: "material", val: materialVal },
            { slug: "style", val: styleVal },
            { slug: "fitting", val: fittingVal },
            { slug: "dimmable", val: dimmableVal },
            { slug: "ip-rating", val: ipRatingVal },
            { slug: "room", val: roomVal },
            { slug: "diameter", val: diameterVal },
            { slug: "length", val: lengthVal },
          ],
          attributesMap,
          valuesMap
        );
        continue;
      }

      const product = await prisma.product.create({
        data: {
          slug: stableSlug,
          ...productFields,
        },
      });
      created++;
      console.log(`  + Created: ${name}`);

      await linkProductAttributes(
        product.id,
        [
          { slug: "color", val: colorVal },
          { slug: "material", val: materialVal },
          { slug: "style", val: styleVal },
          { slug: "fitting", val: fittingVal },
          { slug: "dimmable", val: dimmableVal },
          { slug: "ip-rating", val: ipRatingVal },
          { slug: "room", val: roomVal },
          { slug: "diameter", val: diameterVal },
          { slug: "length", val: lengthVal },
        ],
        attributesMap,
        valuesMap
      );
      await seedDefaultReviews(product.id);
    }
  }

  const demo = await prisma.category.findUnique({ where: { slug: "demo" } });
  if (demo) {
    const leftInDemo = await prisma.product.count({ where: { categoryId: demo.id } });
    if (leftInDemo > 0) {
      console.log(`\nℹ️  "${demo.name}" still has ${leftInDemo} product(s) not in seed catalog (left unchanged).`);
    }
  }

  console.log("\n✨ Done");
  console.log(`   Created:    ${created}`);
  console.log(`   Updated:    ${updated}`);
  console.log(`   Reassigned: ${reassigned} (e.g. demo → real category)`);
}

main()
  .catch((e) => {
    console.error("❌ Product seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
