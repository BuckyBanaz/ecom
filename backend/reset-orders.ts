import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Resetting all order statuses to 'delivered'...");
  const result = await prisma.order.updateMany({
    data: { status: "delivered" }
  });
  console.log(`✅ Reset ${result.count} orders!`);
  
  console.log("Deleting all return requests...");
  const result2 = await prisma.returnRequest.deleteMany({});
  console.log(`✅ Deleted ${result2.count} return requests!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
