import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all orders...");
  // OrderItem is linked to Order with cascading delete? Let's check.
  // Actually, deleteMany on Order might cascade to OrderItem depending on schema.
  // To be safe, we delete OrderItems first if cascade isn't configured, but usually it is.
  await prisma.orderItem.deleteMany({});
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`Successfully deleted ${deletedOrders.count} orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
