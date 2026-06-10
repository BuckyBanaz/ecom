import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";

// Get all store charges
export const getCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const charges = await prisma.storeCharge.findMany({
      orderBy: { createdAt: "asc" }
    });

    res.status(200).json({
      success: true,
      data: charges
    });
  } catch (error) {
    next(error);
  }
};

// Create or update a store charge (UPSERT by unique name)
export const createOrUpdateCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, value, isActive, minFreeLimit } = req.body;

    if (!name || !type || value === undefined) {
      return next(new AppError("Required fields: name, type, value", 400));
    }

    const trimmedName = name.trim();

    const charge = await prisma.storeCharge.upsert({
      where: { name: trimmedName },
      update: {
        type,
        value: Number(value),
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        minFreeLimit: minFreeLimit !== undefined ? Number(minFreeLimit) : undefined
      },
      create: {
        name: trimmedName,
        type,
        value: Number(value),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        minFreeLimit: minFreeLimit !== undefined ? Number(minFreeLimit) : 0
      }
    });

    res.status(200).json({
      success: true,
      message: "Charge saved successfully",
      data: charge
    });
  } catch (error) {
    next(error);
  }
};

// Delete a store charge
export const deleteCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const charge = await prisma.storeCharge.findUnique({
      where: { id }
    });

    if (!charge) {
      return next(new AppError("Charge not found", 404));
    }

    await prisma.storeCharge.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: "Charge deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};
