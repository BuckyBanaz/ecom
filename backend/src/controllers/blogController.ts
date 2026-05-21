import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const getBlogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { published } = req.query;
    const where: any = {};
    if (published === "true") where.published = true;
    if (published === "false") where.published = false;

    const blogs = await prisma.blog.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, blogs });
  } catch (error) {
    next(error);
  }
};

export const getBlogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const blog = await prisma.blog.findUnique({ where: { id } });

    if (!blog) {
      res.status(404).json({ success: false, message: "Blog not found" });
      return;
    }

    res.status(200).json({ success: true, blog });
  } catch (error) {
    next(error);
  }
};

export const createBlog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, slug, excerpt, body, cover, author, published } = req.body;

    if (!title) {
      res.status(400).json({ success: false, message: "Title is required" });
      return;
    }

    const blog = await prisma.blog.create({
      data: {
        title,
        slug: slug || slugify(title),
        excerpt: excerpt || "",
        body: body || "",
        cover: cover ?? null,
        author: author || "",
        published: typeof published === "boolean" ? published : true,
      },
    });

    res.status(201).json({ success: true, blog });
  } catch (error) {
    next(error);
  }
};

export const updateBlog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, slug, excerpt, body, cover, author, published } = req.body;

    const existing = await prisma.blog.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Blog not found" });
      return;
    }

    const blog = await prisma.blog.update({
      where: { id },
      data: {
        title,
        slug,
        excerpt,
        body,
        cover,
        author,
        published,
      },
    });

    res.status(200).json({ success: true, blog });
  } catch (error) {
    next(error);
  }
};

export const deleteBlog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.blog.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    next(error);
  }
};
