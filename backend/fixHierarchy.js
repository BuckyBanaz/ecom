const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoriesToMove = ['pendant-lights', 'ceiling-lights', 'wall-lights', 'floor-lamps', 'table-lamps', 'spotlights', 'light-bulbs', 'light-sources'];

async function fixHierarchy() {
  console.log("Fixing database hierarchy...");
  
  const indoor = await prisma.category.findUnique({
    where: { slug: 'indoor-lighting' }
  });

  if (!indoor) {
    console.log("Error: Indoor Lighting nahi mila!");
    return;
  }

  const result = await prisma.category.updateMany({
    where: {
      slug: { in: categoriesToMove }
    },
    data: {
      parentId: indoor.id
    }
  });

  console.log(`✅ Successfully moved ${result.count} categories into Indoor Lighting!`);
  console.log("Ab apna backend server wapas start karo ('npm run dev') aur frontend ko refresh karo!");
}

fixHierarchy()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
