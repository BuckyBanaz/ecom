import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { bucketSortIndex, getBucketLabels, isDimensionSlug, matchBucketLabel } from "../utils/dimensionAttributes";

type ValueInput = { value: string; colorCode?: string | null };

/** Length / Diameter / Width values are sorted in bucket order instead of insertion order. */
function sortDimensionValues<T extends { slug: string; attributeValues: Array<{ value: string }> }>(attribute: T): T {
  if (!isDimensionSlug(attribute.slug)) return attribute;
  const slug = attribute.slug;
  return {
    ...attribute,
    attributeValues: [...attribute.attributeValues].sort((a, b) => bucketSortIndex(slug, a.value) - bucketSortIndex(slug, b.value)),
  };
}

/**
 * Length / Diameter / Width only accept their bucket values. Returns canonical labels, or an error
 * message naming the rejected values. Values already stored are let through so a pending cleanup
 * never blocks saving the attribute.
 */
function validateDimensionValues(slug: string, values: ValueInput[], existing: string[] = []): { values: ValueInput[]; error?: string } {
  if (!isDimensionSlug(slug)) return { values };
  const rejected: string[] = [];
  const result: ValueInput[] = [];
  for (const v of values) {
    const raw = String(v.value ?? "").trim();
    const label = matchBucketLabel(slug, raw);
    if (label) result.push({ ...v, value: label });
    else if (existing.some((e) => e.toLowerCase() === raw.toLowerCase())) result.push(v);
    else rejected.push(raw);
  }
  if (rejected.length > 0) {
    return {
      values: result,
      error: `Only size ranges are allowed for this attribute (${getBucketLabels(slug).join(", ")}). Rejected: ${rejected.join(", ")}`,
    };
  }
  return { values: result };
}

export const getAttributes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Auto purge any accidental SKU-like values from attribute values
    await prisma.attributeValue.deleteMany({
      where: {
        value: { startsWith: "SKU-", mode: "insensitive" },
      },
    }).catch(() => {});

    const attributes = await prisma.attribute.findMany({
      include: {
        attributeValues: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, attributes: attributes.map(sortDimensionValues) });
  } catch (error) {
    next(error);
  }
};

export const getAttributeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Purge any SKU values for this attribute
    await prisma.attributeValue.deleteMany({
      where: {
        attributeId: id,
        value: { startsWith: "SKU-", mode: "insensitive" },
      },
    }).catch(() => {});

    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        attributeValues: true,
      },
    });
    if (!attribute) {
      res.status(404).json({ success: false, message: "Attribute not found" });
      return;
    }
    res.status(200).json({ success: true, attribute: sortDimensionValues(attribute) });
  } catch (error) {
    next(error);
  }
};

export const createAttribute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, type, visibility } = req.body; // values e.g. [{ value: "Black", colorCode: "#000000" }]
    let { values } = req.body;
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (values && Array.isArray(values)) {
      const checked = validateDimensionValues(finalSlug, values);
      if (checked.error) {
        res.status(400).json({ success: false, message: checked.error });
        return;
      }
      values = checked.values;
    }

    const attribute = await (prisma.attribute as any).create({
      data: {
        name,
        slug: finalSlug,
        type: isDimensionSlug(finalSlug) ? "dimension" : type,
        visibility: visibility || "both",
      },
    });

    if (values && Array.isArray(values)) {
      for (const v of values) {
        await prisma.attributeValue.create({
          data: {
            attributeId: attribute.id,
            value: v.value,
            colorCode: v.colorCode || null,
          },
        });
      }
    }

    const completeAttr = await prisma.attribute.findUnique({
      where: { id: attribute.id },
      include: { attributeValues: true },
    });

    res.status(201).json({ success: true, attribute: completeAttr });
  } catch (error) {
    next(error);
  }
};

export const updateAttribute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, slug, type, visibility } = req.body;
    let { values } = req.body;

    const current = await prisma.attribute.findUnique({ where: { id }, include: { attributeValues: true } });
    if (!current) {
      res.status(404).json({ success: false, message: "Attribute not found" });
      return;
    }
    const finalSlug = slug || current.slug;

    if (values && Array.isArray(values)) {
      const checked = validateDimensionValues(finalSlug, values, current.attributeValues.map((v) => v.value));
      if (checked.error) {
        res.status(400).json({ success: false, message: checked.error });
        return;
      }
      values = checked.values;
    }

    await (prisma.attribute as any).update({
      where: { id },
      data: { 
        name, 
        slug, 
        type: isDimensionSlug(finalSlug) ? "dimension" : type,
        visibility: visibility || "both",
      },
    });

    if (values && Array.isArray(values)) {
      // Sync attribute values
      // Note: deleting values directly could break existing product mappings if they are used.
      // So, let's update/create instead, or delete unused ones safely.
      // For simplicity in a seed-ready developer environment, we delete and recreate or update.
      // Let's delete values that are not in the new list, then create/update.
      
      // Delete old ones not in incoming
      await prisma.attributeValue.deleteMany({
        where: {
          attributeId: id,
          NOT: {
            value: { in: values.map((v) => v.value), mode: "insensitive" },
          },
        },
      });

      for (const v of values) {
        const existingVal = await prisma.attributeValue.findFirst({
          where: {
            attributeId: id,
            value: { equals: v.value, mode: "insensitive" },
          },
        });

        if (existingVal) {
          await prisma.attributeValue.update({
            where: { id: existingVal.id },
            data: { colorCode: v.colorCode || null },
          });
        } else {
          await prisma.attributeValue.create({
            data: {
              attributeId: id,
              value: v.value,
              colorCode: v.colorCode || null,
            },
          });
        }
      }
    }

    const completeAttr = await prisma.attribute.findUnique({
      where: { id },
      include: { attributeValues: true },
    });

    res.status(200).json({ success: true, attribute: completeAttr && sortDimensionValues(completeAttr) });
  } catch (error) {
    next(error);
  }
};

export const deleteAttribute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.attribute.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Attribute deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Sub-resource endpoints for values
export const createAttributeValue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { attributeId } = req.params;
    const { colorCode } = req.body;
    let { value } = req.body;

    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId } });
    if (attribute && isDimensionSlug(attribute.slug)) {
      const checked = validateDimensionValues(attribute.slug, [{ value, colorCode }]);
      if (checked.error) {
        res.status(400).json({ success: false, message: checked.error });
        return;
      }
      value = checked.values[0].value;
    }

    const val = await prisma.attributeValue.create({
      data: { attributeId, value, colorCode },
    });
    res.status(201).json({ success: true, attributeValue: val });
  } catch (error) {
    next(error);
  }
};

export const deleteAttributeValue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.attributeValue.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Attribute value deleted successfully" });
  } catch (error) {
    next(error);
  }
};
