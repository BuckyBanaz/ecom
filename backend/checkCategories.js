const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const categories = await prisma.category.findMany();
  console.log("Categories in DB:", categories.map(c => ({slug: c.slug, parentId: c.parentId, sortOrder: c.sortOrder, showInNav: c.showInNavigation})));
}
check().finally(() => prisma.$disconnect());
