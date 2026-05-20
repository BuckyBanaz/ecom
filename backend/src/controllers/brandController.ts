import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getBrands = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, brands });
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, logo } = req.body;
    const brand = await prisma.brand.create({
      data: { name, logo },
    });
    res.status(201).json({ success: true, brand });
  } catch (error) {
    next(error);
  }
};

export const updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, logo } = req.body;
    const brand = await prisma.brand.update({
      where: { id },
      data: { name, logo },
    });
    res.status(200).json({ success: true, brand });
  } catch (error) {
    next(error);
  }
};

export const deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.brand.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    next(error);
  }
};
