import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("Not authenticated", 401));
    }

    const wishlists = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            oldPrice: true,
            image: true,
            rating: true,
            reviewCount: true,
            inStock: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: wishlists
    });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("Not authenticated", 401));
    }

    const { productId } = req.body;
    if (!productId) {
      return next(new AppError("Product ID is required", 400));
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    // Check if it already exists
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Product already in wishlist",
        data: existing
      });
    }

    const wishlist = await prisma.wishlist.create({
      data: {
        userId,
        productId
      },
      include: {
        product: true
      }
    });

    res.status(201).json({
      success: true,
      message: "Added to wishlist",
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("Not authenticated", 401));
    }

    const { productId } = req.params;

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (!existing) {
      return next(new AppError("Product not found in wishlist", 404));
    }

    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "Removed from wishlist"
    });
  } catch (error) {
    next(error);
  }
};
