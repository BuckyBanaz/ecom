import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

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

    // Products have no series relation: the product form stores it as spec "Series", Quick Add also as
    // "Collectie" / "Collection". Count a product once, matching the series name or slug exactly.
    const seriesIdByValue = new Map<string, string>();
    for (const s of seriesList) {
      seriesIdByValue.set(s.name.trim().toLowerCase(), s.id);
      seriesIdByValue.set(s.slug.trim().toLowerCase(), s.id);
    }
    const products = await prisma.product.findMany({ select: { specs: true } });
    const counts = new Map<string, number>();
    for (const { specs } of products) {
      const pairs: Array<[unknown, unknown]> = Array.isArray(specs)
        ? (specs as any[]).map((s) => [s?.key, s?.value])
        : specs && typeof specs === "object"
        ? Object.entries(specs as Record<string, unknown>)
        : [];
      const seriesIds = new Set(
        pairs
          .filter(([k]) => /^(series|collectie|collection)$/i.test(String(k ?? "").trim()))
          .map(([, v]) => seriesIdByValue.get(String(v ?? "").trim().toLowerCase()))
          .filter((id): id is string => Boolean(id))
      );
      for (const id of seriesIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    res.status(200).json({
      success: true,
      series: seriesList.map((s) => ({ ...s, productCount: counts.get(s.id) ?? 0 })),
    });
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
