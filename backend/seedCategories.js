const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categories = [
  {
    name: "Indoor Lighting",
    slug: "indoor-lighting",
    group: "indoor",
    sortOrder: 1,
    showInNavigation: true,
    isActive: true,
    children: [
      { name: "Pendant Lights", slug: "pendant-lights", sortOrder: 1 },
      { name: "Ceiling Lights", slug: "ceiling-lights", sortOrder: 2 },
      { name: "Wall Lights", slug: "wall-lights", sortOrder: 3 },
      { name: "Floor Lamps", slug: "floor-lamps", sortOrder: 4 },
      { name: "Table Lamps", slug: "table-lamps", sortOrder: 5 },
      { name: "Spotlights", slug: "spotlights", sortOrder: 6 },
      { name: "Light Bulbs", slug: "light-bulbs", sortOrder: 7 },
      { name: "Sale", slug: "sale", sortOrder: 8 },
      { name: "Parts", slug: "parts", sortOrder: 9 },
    ]
  }
];

async function seed() {
  console.log("Seeding categories...");

  for (const cat of categories) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        sortOrder: cat.sortOrder,
        showInNavigation: cat.showInNavigation,
        isActive: cat.isActive,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        group: cat.group,
        image: "",
        sortOrder: cat.sortOrder,
        showInNavigation: cat.showInNavigation,
        isActive: cat.isActive,
      }
    });

    for (const child of cat.children) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          parentId: parent.id,
          sortOrder: child.sortOrder,
          showInNavigation: true,
          isActive: true,
        },
        create: {
          name: child.name,
          slug: child.slug,
          group: cat.group,
          image: "",
          parentId: parent.id,
          sortOrder: child.sortOrder,
          showInNavigation: true,
          isActive: true,
        }
      });
    }
  }

  console.log("Seeding completed successfully!");
}

seed()
  .catch(e => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
