const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categories = [
  { name: "Ceiling Lights", slug: "ceiling-lights", sortOrder: 2 },
  { name: "Wall Lights", slug: "wall-lights", sortOrder: 3 },
  { name: "Floor Lamps", slug: "floor-lamps", sortOrder: 4 },
  { name: "Table Lamps", slug: "table-lamps", sortOrder: 5 },
  { name: "Spotlights", slug: "spotlights", sortOrder: 6 },
  { name: "Light Bulbs", slug: "light-bulbs", sortOrder: 7 },
  { name: "Sale", slug: "sale", sortOrder: 8 },
  { name: "Parts", slug: "parts", sortOrder: 9 },
];

async function createMissingCategories() {
  console.log("Missing categories create kar rahe hain...");
  
  const indoor = await prisma.category.findUnique({
    where: { slug: 'indoor-lighting' }
  });

  if (!indoor) {
    console.log("Error: Indoor Lighting nahi mila!");
    return;
  }

  for (const child of categories) {
    await prisma.category.upsert({
      where: { slug: child.slug },
      update: {
        parentId: indoor.id,
        sortOrder: child.sortOrder,
        showInNavigation: true,
        isActive: true,
      },
      create: {
        name: child.name,
        slug: child.slug,
        group: "indoor",
        image: "",
        parentId: indoor.id,
        sortOrder: child.sortOrder,
        showInNavigation: true,
        isActive: true,
      }
    });
    console.log(`✅ ${child.name} added!`);
  }

  console.log("Sabhi missing categories ban gayi aur Indoor Lighting me add ho gayi!");
  console.log("Ab bas frontend F5 (refresh) karo!");
}

createMissingCategories()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
