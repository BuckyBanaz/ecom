const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing orders from database...");
  try {
    const deletedItems = await prisma.orderItem.deleteMany({});
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Cleared ${deletedItems.count} order items and ${deletedOrders.count} orders successfully!`);
  } catch (error) {
    console.error("❌ Error clearing orders:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
