require("dotenv/config");
const { PrismaClient } = require("@prisma/client");

const ORDER_ID = "dc9956e0-b4aa-4571-a22e-da41f8aff0cf";

async function main() {
  const { processReturnRefund } = require("../src/services/returnRefundService.ts");
  const p = new PrismaClient();
  await p.returnRequest.deleteMany({ where: { orderId: ORDER_ID } });
  const order = await p.order.findUnique({ where: { id: ORDER_ID } });
  const savedPi = order.stripePaymentId;
  await p.order.update({ where: { id: ORDER_ID }, data: { stripePaymentId: null } });
  const ret = await p.returnRequest.create({
    data: {
      orderId: ORDER_ID,
      userId: order.userId,
      reason: "other",
      photos: ["/x.jpg"],
      status: "return_received",
      refundAmount: order.total,
      itemReceivedAt: new Date(),
    },
  });
  try {
    await processReturnRefund(ret.id, { manual: true });
    console.log("FAIL: should have thrown");
    process.exit(1);
  } catch (e) {
    console.log("OK:", e.message);
  } finally {
    await p.order.update({ where: { id: ORDER_ID }, data: { stripePaymentId: savedPi } });
    await p.returnRequest.deleteMany({ where: { orderId: ORDER_ID } });
    await p.$disconnect();
  }
}

main();
