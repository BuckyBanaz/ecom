import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding product: Suspended Office Light...");

  // We don't have the exact IDs since they might not exist, let's create or find the brand and category first
  const brandId = "2d8564a2-449b-4a0c-8ea3-2f2f51ff9346";
  const categoryId = "78ca015a-8e00-4d0c-9dd4-c459b8fac76a";

  let brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        id: brandId,
        name: "Luminex",
      }
    });
  }

  let category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        id: categoryId,
        name: "Office Lighting",
        slug: "office-lighting-28",
        group: "business",
        image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=400",
      }
    });
  }

  const product = await prisma.product.upsert({
    where: { slug: "suspended-office-light-28" },
    update: {
      price: 215.95,
      oldPrice: 300,
      rating: 4.5,
      reviewCount: 3,
    },
    create: {
      id: "p-suspended-28",
      slug: "suspended-office-light-28",
      name: "Suspended Office Light",
      brandId: brand.id,
      categoryId: category.id,
      price: 215.95,
      oldPrice: 300,
      rating: 4.5,
      reviewCount: 3,
      inStock: true,
      description: "A beautifully suspended office light suitable for modern workplaces.",
      image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800",
      images: ["https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800"],
    }
  });

  // Delete existing reviews for this product to avoid duplicates
  await prisma.review.deleteMany({ where: { productId: product.id } });

  // Add real reviews
  await prisma.review.createMany({
    data: [
      {
        productId: product.id,
        name: "Jane Smith",
        rating: 5,
        title: "Perfect for our office",
        text: "This light looks amazing above our conference table. Highly recommended!",
        images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=400"],
      },
      {
        productId: product.id,
        name: "Michael T.",
        rating: 4,
        title: "Good brightness",
        text: "Provides excellent illumination, though installation was slightly tricky.",
        images: [],
      },
      {
        productId: product.id,
        name: "Sarah W.",
        rating: 5,
        title: "Sleek and modern",
        text: "Very sleek design, completely transformed our workspace.",
        images: ["https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=400"],
      }
    ]
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
