import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        categoryAttributes: {
          include: {
            attribute: {
              include: {
                attributeValues: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Structure category tree for convenience
    const parentCategories = categories.filter((c) => !c.parentId);

    res.status(200).json({
      success: true,
      categories,
      tree: parentCategories,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, image, group, parentId, attributeIds } = req.body;

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        image: image || "/assets/cat-pendant.jpg",
        group: group || "indoor",
        parentId: parentId || null,
      },
    });

    if (attributeIds && Array.isArray(attributeIds)) {
      for (const attrId of attributeIds) {
        await prisma.categoryAttribute.create({
          data: {
            categoryId: category.id,
            attributeId: attrId,
          },
        });
      }
    }

    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, slug, image, group, parentId, attributeIds } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        image,
        group,
        parentId: parentId || null,
      },
    });

    if (attributeIds && Array.isArray(attributeIds)) {
      // Sync mappings
      await prisma.categoryAttribute.deleteMany({ where: { categoryId: id } });
      for (const attrId of attributeIds) {
        await prisma.categoryAttribute.create({
          data: {
            categoryId: id,
            attributeId: attrId,
          },
        });
      }
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};
