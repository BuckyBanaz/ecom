import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/reviews/product/:id
// Get all reviews for a specific product
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Support fetching by slug or ID
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
    });

    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
    });

    // Calculate rating summary
    const count = reviews.length;
    const average = count > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / count : 0;
    
    const summary = {
      average: parseFloat(average.toFixed(1)),
      count,
      distribution: {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      }
    };

    res.status(200).json({ success: true, reviews, summary });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// POST /api/reviews/product/:id
// Create a new review for a product
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, rating, title, text, images } = req.body;

    // Support fetching by slug or ID
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
    });

    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    if (!name || !rating || !title || !text) {
      res.status(400).json({ success: false, error: "Missing required review fields" });
      return;
    }

    // Workaround for typing since `images` was added manually to schema but `prisma generate` might not have run
    const data: any = {
      productId: product.id,
      name,
      rating: parseInt(rating),
      title,
      text,
      images: Array.isArray(images) ? images : [],
    };

    const review = await prisma.review.create({
      data,
    });

    // Optionally update the product's review summary (rating and reviewCount)
    const allReviews = await prisma.review.findMany({
      where: { productId: product.id },
    });
    
    const count = allReviews.length;
    const average = count > 0 ? allReviews.reduce((acc, r) => acc + r.rating, 0) / count : 0;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        rating: average,
        reviewCount: count,
      },
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/reviews
// Get all reviews (Admin)
export const getAllReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        product: {
          select: { name: true, image: true, slug: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// DELETE /api/reviews/:id
// Delete a review (Admin)
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingReview = await prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      res.status(404).json({ success: false, error: "Review not found" });
      return;
    }

    await prisma.review.delete({
      where: { id },
    });

    // Update product stats
    const allReviews = await prisma.review.findMany({
      where: { productId: existingReview.productId },
    });
    
    const count = allReviews.length;
    const average = count > 0 ? allReviews.reduce((acc, r) => acc + r.rating, 0) / count : 0;

    await prisma.product.update({
      where: { id: existingReview.productId },
      data: {
        rating: average,
        reviewCount: count,
      },
    });

    res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
