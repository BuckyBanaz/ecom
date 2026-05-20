import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { brandId } = req.query;
    const seriesList = await prisma.series.findMany({
      where: brandId ? { brandId: brandId as string } : {},
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, series: seriesList });
  } catch (error) {
    next(error);
  }
};

export const getSeriesById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const series = await prisma.series.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!series) {
      res.status(404).json({ success: false, message: "Series not found" });
      return;
    }

    res.status(200).json({ success: true, series });
  } catch (error) {
    next(error);
  }
};

export const createSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, brandId, logo, slug } = req.body;

    if (!name || !brandId) {
      res.status(400).json({ success: false, message: "Please provide series name and brandId" });
      return;
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const series = await prisma.series.create({
      data: {
        name,
        brandId,
        logo: logo || null,
        slug: generatedSlug,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, series });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({ success: false, message: "Series with this slug or name already exists" });
      return;
    }
    next(error);
  }
};

export const updateSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, brandId, logo, slug } = req.body;

    const existingSeries = await prisma.series.findUnique({ where: { id } });
    if (!existingSeries) {
      res.status(404).json({ success: false, message: "Series not found" });
      return;
    }

    const generatedSlug = slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : existingSeries.slug);

    const series = await prisma.series.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingSeries.name,
        brandId: brandId !== undefined ? brandId : existingSeries.brandId,
        logo: logo !== undefined ? logo : existingSeries.logo,
        slug: generatedSlug,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    res.status(200).json({ success: true, series });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({ success: false, message: "Series with this slug or name already exists" });
      return;
    }
    next(error);
  }
};

export const deleteSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.series.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Series deleted successfully" });
  } catch (error) {
    next(error);
  }
};
