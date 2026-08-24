/**
 * Reset an order + its return request so you can re-test the full return flow locally.
 * Usage: node -r dotenv/config scripts/reset-order-for-return-test.js [orderId]
 */
const { PrismaClient } = require("@prisma/client");
const orderId = process.argv[2] || "dc9956e0-b4aa-4571-a22e-da41f8aff0cf";

const p = new PrismaClient();

async function main() {
  const order = await p.order.findUnique({
    where: { id: orderId },
    include: { returnRequests: true },
  });
  if (!order) {
    console.error("Order not found:", orderId);
    process.exit(1);
  }

  console.log("Before:", order.orderNumber, order.status, order.paymentStatus);
  console.log("Returns:", order.returnRequests.map((r) => `${r.id} → ${r.status}`));

  // Delete old return requests so customer can submit fresh
  await p.returnRequest.deleteMany({ where: { orderId } });

  await p.order.update({
    where: { id: orderId },
    data: {
      status: "delivered",
      paymentStatus: "paid",
      deliveredAt: order.deliveredAt || order.updatedAt || new Date(),
    },
  });

  const after = await p.order.findUnique({ where: { id: orderId } });
  console.log("\n✅ Reset done.");
  console.log("Order:", after.orderNumber, "→", after.status, "| payment:", after.paymentStatus);
  console.log("\nNext steps:");
  console.log("1. Login as customer → Dashboard → My Orders →", after.orderNumber);
  console.log("2. Click 'Request Return' (photo required)");
  console.log("3. Admin → Returns → Pending → Approve");
  console.log("4. Skip Sendcloud: Admin → 'Process refund manually' OR mark received after mock label");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
