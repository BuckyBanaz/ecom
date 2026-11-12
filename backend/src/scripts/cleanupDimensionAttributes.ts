/**
 * One-off cleanup for the Length / Diameter / Width attributes: maps every raw size value ("36cm",
 * "60cm ", "25x25") onto its bucket ("20-40 cm"), re-links products (spec size wins), creates missing
 * buckets and deletes the raw values.
 *
 *   node dist/scripts/cleanupDimensionAttributes.js                 # dry run against the database
 *   node dist/scripts/cleanupDimensionAttributes.js --apply         # write changes (take a backup first)
 *   node dist/scripts/cleanupDimensionAttributes.js --from-api https://api.schipenster.com
 *                                                                   # dry run from the public API, no DB
 */
import {
  DIMENSION_SLUGS,
  DimensionCleanupPlan,
  PlanAttribute,
  PlanProduct,
  planDimensionCleanup,
} from "../utils/dimensionAttributes";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const apiIndex = args.indexOf("--from-api");
const apiBase = apiIndex >= 0 ? args[apiIndex + 1] : null;

async function loadFromApi(base: string): Promise<{ attributes: PlanAttribute[]; products: PlanProduct[] }> {
  const get = async (path: string) => {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/v1${path}`);
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json() as Promise<any>;
  };
  const [attrData, productData] = await Promise.all([get("/attributes"), get("/products?limit=10000")]);
  const attributes: PlanAttribute[] = attrData.attributes.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    type: a.type,
    values: (a.attributeValues || []).map((v: any) => ({ id: v.id, value: v.value })),
  }));
  const dimensionIds = new Set(attributes.filter((a) => (DIMENSION_SLUGS as string[]).includes(a.slug)).map((a) => a.id));
  const products: PlanProduct[] = productData.products.map((p: any) => ({
    id: p.id,
    name: p.name,
    specs: p.specs,
    links: (p.productAttributeValues || [])
      .filter((l: any) => dimensionIds.has(l.attributeId))
      .map((l: any) => ({ attributeId: l.attributeId, valueId: l.attributeValueId })),
  }));
  return { attributes, products };
}

async function loadFromDb() {
  const { prisma } = await import("../config/db");
  const attributes = await prisma.attribute.findMany({
    where: { slug: { in: DIMENSION_SLUGS } },
    include: { attributeValues: true },
  });
  const attributeIds = attributes.map((a) => a.id);
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      specs: true,
      productAttributeValues: { where: { attributeId: { in: attributeIds } }, select: { attributeId: true, attributeValueId: true } },
    },
  });
  return {
    prisma,
    attributes: attributes.map((a) => ({
      id: a.id,
      slug: a.slug,
      type: a.type,
      values: a.attributeValues.map((v) => ({ id: v.id, value: v.value })),
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      specs: p.specs,
      links: p.productAttributeValues.map((l) => ({ attributeId: l.attributeId, valueId: l.attributeValueId })),
    })),
  };
}

function printPlan(plan: DimensionCleanupPlan, products: PlanProduct[]) {
  if (plan.missingAttributes.length) {
    console.log(`⚠️  Attributes not found (skipped): ${plan.missingAttributes.join(", ")}`);
  }
  for (const a of plan.attributes) {
    console.log(`\n=== ${a.slug} ===`);
    if (a.typeChange) console.log(`  type: ${a.typeChange} -> dimension`);
    if (a.createLabels.length) console.log(`  create buckets: ${a.createLabels.join(", ")}`);
    if (a.remap.length) {
      console.log(`  raw values to merge + delete (${a.remap.length}):`);
      for (const r of a.remap) {
        console.log(`    ${JSON.stringify(r.value).padEnd(14)} -> ${r.target ?? "(no size, links dropped)"}  [${r.linkedProducts} products]`);
      }
    }

    const counts: Record<string, number> = {};
    for (const p of products) {
      const change = plan.productChanges.find((c) => c.productId === p.id && c.slug === a.slug);
      const after = change ? change.after : null;
      if (after) after.forEach((label) => (counts[label] = (counts[label] || 0) + 1));
      else {
        const linked = p.links.filter((l) => l.attributeId === a.attributeId).length;
        if (linked) counts["(unchanged)"] = (counts["(unchanged)"] || 0) + linked;
      }
    }
    console.log(`  products per bucket after cleanup: ${JSON.stringify(counts)}`);
  }

  const fromSpec = plan.productChanges.filter((c) => c.source === "spec");
  console.log(`\nProduct link changes: ${plan.productChanges.length} (${fromSpec.length} taken from specs)`);
  for (const c of fromSpec) console.log(`  [spec] ${c.slug}: ${c.before.join("|") || "-"} -> ${c.after.join("|")}  ${c.name}`);

  console.log(`Spec vs existing conflicts (spec wins): ${plan.conflicts.length}`);
  for (const c of plan.conflicts) console.log(`  ${c.slug}: spec ${c.spec} vs existing ${c.existing.join("|")}  ${c.name}`);
}

async function main() {
  if (apiBase) {
    const { attributes, products } = await loadFromApi(apiBase);
    printPlan(planDimensionCleanup(attributes, products), products);
    console.log("\nDry run from API — nothing written.");
    return;
  }

  const { prisma, attributes, products } = await loadFromDb();
  const plan = planDimensionCleanup(attributes, products);
  printPlan(plan, products);

  const deleteIds = plan.attributes.flatMap((a) => a.deleteValueIds);
  const variantLinks = deleteIds.length
    ? await prisma.variantAttributeValue.count({ where: { attributeValueId: { in: deleteIds } } })
    : 0;
  if (variantLinks) console.log(`⚠️  ${variantLinks} variant links point at values that will be deleted (they cascade).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write these changes.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const a of plan.attributes) {
        if (a.typeChange) await tx.attribute.update({ where: { id: a.attributeId }, data: { type: "dimension" } });
        for (const label of a.createLabels) {
          await tx.attributeValue.create({ data: { attributeId: a.attributeId, value: label } });
        }
      }

      const valueIdByLabel = new Map<string, string>();
      const values = await tx.attributeValue.findMany({
        where: { attributeId: { in: plan.attributes.map((a) => a.attributeId) }, id: { notIn: deleteIds } },
      });
      values.forEach((v) => valueIdByLabel.set(`${v.attributeId}:${v.value}`, v.id));

      for (const change of plan.productChanges) {
        await tx.productAttributeValue.deleteMany({ where: { productId: change.productId, attributeId: change.attributeId } });
        const data = change.after
          .map((label) => valueIdByLabel.get(`${change.attributeId}:${label}`))
          .filter((id): id is string => !!id)
          .map((attributeValueId) => ({ productId: change.productId, attributeId: change.attributeId, attributeValueId }));
        if (data.length) await tx.productAttributeValue.createMany({ data, skipDuplicates: true });
      }

      if (deleteIds.length) await tx.attributeValue.deleteMany({ where: { id: { in: deleteIds } } });
    },
    { timeout: 120_000 }
  );

  console.log("\n✅ Applied. Re-run without --apply to confirm nothing is left to change.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Cleanup failed — no changes were committed:", err);
  process.exit(1);
});
