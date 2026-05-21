import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

export const getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true }
        }
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

export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true }
        }
      },
    });

    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, image, group, parentId } = req.body;

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        image: image || "/assets/cat-pendant.jpg",
        group: group || "interior-lighting",
        parentId: parentId || null,
      },
    });


    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, slug, image, group, parentId } = req.body;

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
