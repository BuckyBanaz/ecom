import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all orders...");
  await prisma.orderItem.deleteMany({});
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`Successfully deleted ${deletedOrders.count} orders.`);

  console.log("Clearing all customers...");
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: "customer"
    }
  });
  console.log(`Successfully deleted ${deletedUsers.count} customers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
