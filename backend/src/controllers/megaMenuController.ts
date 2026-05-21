import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

// GET /api/v1/megamenus
export const getMegaMenus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const menus = await prisma.megaMenu.findMany({
      orderBy: { createdAt: "asc" },
    });
    
    const config = await prisma.cmsConfig.findUnique({
      where: { key: "landing_pages_data" }
    });
    
    res.status(200).json({ 
      success: true, 
      count: menus.length, 
      menus,
      landingPages: config?.value || {}
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/megamenus/:id
export const getMegaMenuById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const menu = await prisma.megaMenu.findUnique({
      where: { id },
    });

    if (!menu) {
      res.status(404).json({ success: false, message: "Mega Menu not found" });
      return;
    }

    res.status(200).json({ success: true, menu });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/megamenus
export const createMegaMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { menu, slug, sections } = req.body;

    if (!menu || !slug) {
      res.status(400).json({ success: false, message: "Please provide menu name and slug" });
      return;
    }

    const newMenu = await prisma.megaMenu.create({
      data: {
        menu,
        slug,
        sections: sections || [],
      },
    });

    res.status(201).json({ success: true, menu: newMenu });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, message: "Mega Menu with this slug already exists" });
      return;
    }
    next(error);
  }
};

// PUT /api/v1/megamenus/:id
export const updateMegaMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { menu, slug, sections } = req.body;

    const existingMenu = await prisma.megaMenu.findUnique({ where: { id } });
    if (!existingMenu) {
      res.status(404).json({ success: false, message: "Mega Menu not found" });
      return;
    }

    const updatedMenu = await prisma.megaMenu.update({
      where: { id },
      data: {
        menu: menu || existingMenu.menu,
        slug: slug || existingMenu.slug,
        sections: sections !== undefined ? sections : existingMenu.sections,
      },
    });

    res.status(200).json({ success: true, menu: updatedMenu });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, message: "Mega Menu with this slug already exists" });
      return;
    }
    next(error);
  }
};

// DELETE /api/v1/megamenus/:id
export const deleteMegaMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const existingMenu = await prisma.megaMenu.findUnique({ where: { id } });
    if (!existingMenu) {
      res.status(404).json({ success: false, message: "Mega Menu not found" });
      return;
    }

    await prisma.megaMenu.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: "Mega Menu deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/megamenus/sync
// Replaces the entire megamenu structure with the provided array
export const syncMegaMenus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { menus, landingPages } = req.body;
    
    if (!Array.isArray(menus)) {
      res.status(400).json({ success: false, message: "Please provide an array of menus" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Re-create all mega menus
      await tx.megaMenu.deleteMany({});
      await tx.megaMenu.createMany({
        data: menus.map((m: any) => ({
          menu: m.menu,
          slug: m.slug,
          sections: m.sections || [],
        }))
      });

      // If landing pages data is provided, upsert it into CMS Config
      if (landingPages) {
        await tx.cmsConfig.upsert({
          where: { key: "landing_pages_data" },
          update: { value: landingPages },
          create: { key: "landing_pages_data", value: landingPages }
        });
      }
    });

    const newMenus = await prisma.megaMenu.findMany({
      orderBy: { createdAt: "asc" }
    });

    const config = await prisma.cmsConfig.findUnique({ where: { key: "landing_pages_data" } });

    res.status(200).json({ success: true, menus: newMenus, landingPages: config?.value || {} });
  } catch (error) {
    next(error);
  }
};
