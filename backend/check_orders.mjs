import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany();
  console.log("All orders in DB:", orders.map(o => ({ id: o.id, orderNumber: o.orderNumber, userId: o.userId })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
