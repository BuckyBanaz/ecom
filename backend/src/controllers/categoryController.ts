import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";

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
    const body = (req.body ?? {}) as { reassignToCategoryId?: string };
    const reassignToCategoryId = body.reassignToCategoryId || (req.query.reassignTo as string | undefined);

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    if (category._count.products > 0) {
      if (!reassignToCategoryId) {
        throw new AppError(
          `Cannot delete "${category.name}" — ${category._count.products} product(s) are assigned. Select another category to move them to.`,
          409
        );
      }

      if (reassignToCategoryId === id) {
        throw new AppError("Choose a different category to move products to.", 400);
      }

      const targetCategory = await prisma.category.findUnique({
        where: { id: reassignToCategoryId },
      });

      if (!targetCategory) {
        throw new AppError("Target category not found.", 404);
      }
    }

    await prisma.$transaction(async (tx) => {
      if (category._count.products > 0 && reassignToCategoryId) {
        await tx.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: reassignToCategoryId },
        });
      }

      if (category._count.children > 0) {
        await tx.category.updateMany({
          where: { parentId: id },
          data: { parentId: category.parentId },
        });
      }

      await tx.category.delete({ where: { id } });
    });

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      next(new AppError("Cannot delete category because it is still linked to other records.", 409));
      return;
    }
    next(error);
  }
};
