import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";
import { z } from "zod";
import { parseAndValidateFullPhone } from "../utils/phoneValidation";

// Schema for validation
const addressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  street: z.string().min(1, "Street is required"),
  houseNumber: z.string().regex(/^[0-9]+[a-zA-Z0-9\s-]*$/, "House number must start with a number (e.g. 12 or 12A)").optional().nullable(), // Optional but used by Sendcloud
  landmark: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  country: z.string().min(1, "Country is required"),
  lat: z.string().optional().nullable(),
  lng: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

// 1. Get All Addresses for the logged-in customer
export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError("Not authorized", 401));

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: addresses.length, data: addresses });
  } catch (error) {
    next(error);
  }
};

// 2. Create Address
export const createAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError("Not authorized", 401));

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!userExists) {
      return next(new AppError("User not found or has been deleted", 404));
    }

    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => i.message).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { isDefault, ...rest } = parsed.data;

    // Validate phone
    const validation = parseAndValidateFullPhone(rest.phone);
    if (!validation.isValid) {
      return next(new AppError("Phone number must be a valid +31 or +91 format with correct digits", 400));
    }
    const finalPhone = validation.cleanedFullPhone;

    // If this is marked as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        ...rest,
        phone: finalPhone,
        isDefault,
        userId
      }
    });

    res.status(201).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

// 3. Update Address
export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return next(new AppError("Not authorized", 401));

    // Verify ownership
    const existing = await prisma.address.findFirst({ where: { id, userId } });
    if (!existing) {
      return next(new AppError("Address not found or not authorized", 404));
    }

    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => i.message).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { isDefault, ...rest } = parsed.data;

    // Validate phone
    const validation = parseAndValidateFullPhone(rest.phone);
    if (!validation.isValid) {
      return next(new AppError("Phone number must be a valid +31 or +91 format with correct digits", 400));
    }
    const finalPhone = validation.cleanedFullPhone;

    // If setting to default, unset others
    if (isDefault && !existing.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: { ...rest, phone: finalPhone, isDefault }
    });

    res.status(200).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Address
export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return next(new AppError("Not authorized", 401));

    // Verify ownership
    const existing = await prisma.address.findFirst({ where: { id, userId } });
    if (!existing) {
      return next(new AppError("Address not found or not authorized", 404));
    }

    await prisma.address.delete({ where: { id } });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
