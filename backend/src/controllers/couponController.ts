import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";

// Get all coupons
export const getCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({
      success: true,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};

// Create a coupon
export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, discountType, value, minOrderValue, expiresAt, isActive } = req.body;

    if (!code || !discountType || value === undefined) {
      return next(new AppError("Required fields: code, discountType, value", 400));
    }

    const uppercaseCode = code.toUpperCase().trim();

    // Check if code exists
    const existing = await prisma.coupon.findUnique({
      where: { code: uppercaseCode }
    });

    if (existing) {
      return next(new AppError("Coupon code already exists", 400));
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: uppercaseCode,
        discountType,
        value: Number(value),
        minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// Update a coupon
export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, discountType, value, minOrderValue, expiresAt, isActive } = req.body;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      return next(new AppError("Coupon not found", 404));
    }

    let uppercaseCode = undefined;
    if (code) {
      uppercaseCode = code.toUpperCase().trim();
      if (uppercaseCode !== coupon.code) {
        // Verify unique
        const existing = await prisma.coupon.findUnique({
          where: { code: uppercaseCode }
        });
        if (existing) {
          return next(new AppError("Coupon code already exists", 400));
        }
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        code: uppercaseCode,
        discountType,
        value: value !== undefined ? Number(value) : undefined,
        minOrderValue: minOrderValue !== undefined ? Number(minOrderValue) : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      }
    });

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// Delete a coupon
export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      return next(new AppError("Coupon not found", 404));
    }

    await prisma.coupon.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// Validate coupon (For checkout page integration)
export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, orderValue } = req.body;
    if (!code) {
      return next(new AppError("Coupon code is required", 400));
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    if (!coupon || !coupon.isActive) {
      return next(new AppError("Invalid or inactive coupon code", 404));
    }

    // Check expiration
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return next(new AppError("Coupon code has expired", 400));
    }

    // Check min order value
    if (orderValue !== undefined && Number(orderValue) < coupon.minOrderValue) {
      return next(new AppError(`Minimum order value to apply this coupon is €${coupon.minOrderValue}`, 400));
    }

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value
      }
    });
  } catch (error) {
    next(error);
  }
};
