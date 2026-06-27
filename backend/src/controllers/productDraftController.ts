import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const listProductDrafts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = (req.query.status as string) || "draft";
    const drafts = await prisma.productDraft.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, drafts });
  } catch (error) {
    next(error);
  }
};

export const getProductDraft = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const draft = await prisma.productDraft.findUnique({
      where: { id: req.params.id },
    });
    if (!draft) return next(new AppError("Draft not found", 404));
    res.json({ success: true, draft });
  } catch (error) {
    next(error);
  }
};

export const deleteProductDraft = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await prisma.productDraft.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Draft deleted" });
  } catch (error) {
    next(error);
  }
};

export const markDraftPublished = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await prisma.productDraft.update({
      where: { id: req.params.id },
      data: { status: "published" },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export async function saveProductDraft(
  payload: Record<string, unknown>,
  options: { batchId?: string; createdBy?: string; error?: string; status?: string } = {}
) {
  const name = typeof payload.name === "string" ? payload.name : null;
  return prisma.productDraft.create({
    data: {
      name,
      payload: payload as object,
      batchId: options.batchId,
      createdBy: options.createdBy,
      error: options.error,
      status: options.status || (options.error ? "failed" : "draft"),
    },
  });
}
