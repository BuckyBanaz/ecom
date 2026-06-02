import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";

// 1. Get all email templates
export const getAllTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

// 2. Get template by ID
export const getTemplateById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return next(new AppError("Email template not found", 404));
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// 3. Create template
export const createTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, subject, body } = req.body;
    if (!name || !subject || !body) {
      return next(new AppError("Name, subject, and body are required", 400));
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { name } });
    if (existing) {
      return next(new AppError("Template with this name already exists", 400));
    }

    const template = await prisma.emailTemplate.create({
      data: { name, subject, body },
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// 4. Update template
export const updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;

    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return next(new AppError("Email template not found", 404));
    }

    if (name && name !== template.name) {
      const existing = await prisma.emailTemplate.findUnique({ where: { name } });
      if (existing) {
        return next(new AppError("Template with this name already exists", 400));
      }
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : template.name,
        subject: subject !== undefined ? subject : template.subject,
        body: body !== undefined ? body : template.body,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// 5. Delete template
export const deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return next(new AppError("Email template not found", 404));
    }

    await prisma.emailTemplate.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    next(error);
  }
};
