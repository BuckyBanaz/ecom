const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Removing seed dummy customers (@example.com)...");

  const dummyUsers = await prisma.user.findMany({
    where: {
      role: "customer",
      email: { endsWith: "@example.com" },
    },
    select: { id: true, email: true, name: true },
  });

  if (dummyUsers.length === 0) {
    console.log("✅ No dummy users found.");
    return;
  }

  console.log(`Found ${dummyUsers.length} dummy user(s):`);
  dummyUsers.forEach((u) => console.log(`  - ${u.name} <${u.email}>`));

  const dummyUserIds = dummyUsers.map((u) => u.id);

  const dummyOrders = await prisma.order.findMany({
    where: {
      OR: [
        { userId: { in: dummyUserIds } },
        { customerEmail: { endsWith: "@example.com" } },
      ],
    },
    select: { id: true },
  });

  if (dummyOrders.length > 0) {
    const orderIds = dummyOrders.map((o) => o.id);
    const deletedItems = await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    const deletedOrders = await prisma.order.deleteMany({
      where: { id: { in: orderIds } },
    });
    console.log(`🗑️  Removed ${deletedOrders.count} dummy orders (${deletedItems.count} line items).`);
  }

  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { in: dummyUserIds },
    },
  });

  console.log(`✅ Deleted ${deletedUsers.count} dummy user(s).`);
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
