import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==========================================
// HOMEPAGE CMS METHODS
// ==========================================

export const getHomepage = async (req: Request, res: Response) => {
  try {
    const config = await prisma.cmsConfig.findUnique({
      where: { key: "homepage_data" },
    });

    if (!config) {
      return res.status(404).json({ success: false, message: "Homepage configuration not found" });
    }

    res.status(200).json({
      success: true,
      data: config.value,
    });
  } catch (error) {
    console.error("Error fetching homepage config:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateHomepage = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const config = await prisma.cmsConfig.upsert({
      where: { key: "homepage_data" },
      update: { value: data },
      create: { key: "homepage_data", value: data },
    });

    res.status(200).json({
      success: true,
      message: "Homepage configuration updated",
      data: config.value,
    });
  } catch (error) {
    console.error("Error updating homepage config:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================================
// DYNAMIC PAGES CMS METHODS
// ==========================================

export const getAllPages = async (req: Request, res: Response) => {
  try {
    const pages = await prisma.cmsPage.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, pages });
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getPageBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.status(200).json({ success: true, page });
  } catch (error) {
    console.error("Error fetching page by slug:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createPage = async (req: Request, res: Response) => {
  try {
    const { title, slug, body, published, seoTitle, seoDesc, seoKeywords, seoImage } = req.body;

    const existingPage = await prisma.cmsPage.findUnique({ where: { slug } });
    if (existingPage) {
      return res.status(400).json({ success: false, message: "A page with this slug already exists" });
    }

    const page = await prisma.cmsPage.create({
      data: {
        title,
        slug,
        body: body || "",
        published: published ?? false,
        seoTitle,
        seoDesc,
        seoKeywords,
        seoImage,
      },
    });

    res.status(201).json({ success: true, message: "Page created successfully", page });
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updatePage = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { title, body, published, seoTitle, seoDesc, seoKeywords, seoImage, newSlug } = req.body;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    const updatedPage = await prisma.cmsPage.update({
      where: { slug },
      data: {
        title,
        slug: newSlug || slug,
        body,
        published,
        seoTitle,
        seoDesc,
        seoKeywords,
        seoImage,
      },
    });

    res.status(200).json({ success: true, message: "Page updated successfully", page: updatedPage });
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deletePage = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    await prisma.cmsPage.delete({ where: { slug } });

    res.status(200).json({ success: true, message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
