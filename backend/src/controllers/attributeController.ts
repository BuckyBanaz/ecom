import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAttributes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attributes = await prisma.attribute.findMany({
      include: {
        attributeValues: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, attributes });
  } catch (error) {
    next(error);
  }
};

export const createAttribute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, type, values, visibility } = req.body; // values e.g. [{ value: "Black", colorCode: "#000000" }]

    const attribute = await (prisma.attribute as any).create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        type,
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
    const { name, slug, type, values, visibility } = req.body;

    await (prisma.attribute as any).update({
      where: { id },
      data: { 
        name, 
        slug, 
        type,
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

    res.status(200).json({ success: true, attribute: completeAttr });
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
    const { value, colorCode } = req.body;
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
