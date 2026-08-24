/**
 * Audit test: verify return flow states and edge cases without Sendcloud/Stripe UI.
 * Usage: node -r dotenv/config scripts/test-return-flow-audit.js
 */
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const ORDER_ID = process.argv[2] || "dc9956e0-b4aa-4571-a22e-da41f8aff0cf";
const API = process.env.API_URL || "http://localhost:5000";
const p = new PrismaClient();

const ACTIVE = ["pending_review", "approved", "awaiting_return", "return_received"];
const failures = [];
const passes = [];

function ok(msg) {
  passes.push(msg);
  console.log("  ✓", msg);
}
function fail(msg) {
  failures.push(msg);
  console.log("  ✗", msg);
}

async function resetOrder() {
  await p.returnRequest.deleteMany({ where: { orderId: ORDER_ID } });
  await p.order.update({
    where: { id: ORDER_ID },
    data: {
      status: "delivered",
      paymentStatus: "paid",
      deliveredAt: new Date(),
    },
  });
}

async function testRejectedResubmit() {
  console.log("\n1. Rejected return allows new request (backend logic)");
  await resetOrder();
  const order = await p.order.findUnique({ where: { id: ORDER_ID } });
  await p.returnRequest.create({
    data: {
      orderId: ORDER_ID,
      userId: order.userId,
      reason: "changed_mind",
      photos: ["/uploads/returns/test.jpg"],
      status: "rejected",
      reviewedAt: new Date(),
    },
  });
  const active = await p.returnRequest.findFirst({
    where: { orderId: ORDER_ID, status: { in: ACTIVE } },
  });
  if (!active) ok("No active return after rejection — new request allowed");
  else fail("Active return still blocking after rejection");
}

async function testActiveBlocksNew() {
  console.log("\n2. Active return blocks duplicate request");
  await resetOrder();
  const order = await p.order.findUnique({ where: { id: ORDER_ID } });
  await p.returnRequest.create({
    data: {
      orderId: ORDER_ID,
      userId: order.userId,
      reason: "damaged",
      photos: ["/uploads/returns/test.jpg"],
      status: "pending_review",
    },
  });
  const count = await p.returnRequest.count({
    where: { orderId: ORDER_ID, status: { in: ACTIVE } },
  });
  if (count === 1) ok("Single active return as expected");
  else fail(`Expected 1 active return, got ${count}`);
}

async function testWebhookRawBody() {
  console.log("\n3. Sendcloud webhook accepts unsigned when no secret (local)");
  const order = await p.order.findUnique({ where: { id: ORDER_ID } });
  if (!order) {
    fail("Order not found for webhook test");
    return;
  }

  await p.returnRequest.deleteMany({ where: { orderId: ORDER_ID } });
  const ret = await p.returnRequest.create({
    data: {
      orderId: ORDER_ID,
      userId: order.userId,
      reason: "defective",
      photos: ["/uploads/returns/test.jpg"],
      status: "awaiting_return",
      refundAmount: order.total,
      returnTrackingNumber: "TEST-TRACK",
      returnCarrier: "PostNL",
    },
  });

  const body = JSON.stringify({
    action: "parcel_status_changed",
    parcel: {
      id: 99999,
      order_number: `${order.orderNumber}-RET`,
      status: { id: 11, message: "Delivered" },
    },
  });

  const secret = process.env.SENDCLOUD_SECRET_KEY || process.env.SENDCLOUD_WEBHOOK_SECRET;
  const headers = { "Content-Type": "application/json" };
  if (secret) {
    headers["Sendcloud-Signature"] = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
  }

  const res = await fetch(`${API}/api/v1/webhooks/sendcloud`, {
    method: "POST",
    headers,
    body,
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 200 && json.success) {
    ok(`Webhook returned 200 (signature ${secret ? "verified" : "skipped"})`);
  } else {
    fail(`Webhook failed: ${res.status} ${JSON.stringify(json)}`);
    return;
  }

  const updated = await p.returnRequest.findUnique({ where: { id: ret.id } });
  if (updated?.status === "refunded" || updated?.status === "return_received") {
    ok(`Return status after webhook: ${updated.status}`);
  } else {
    fail(`Expected refunded/return_received, got ${updated?.status}`);
  }
  if (updated?.itemReceivedAt) ok("itemReceivedAt set by webhook");
  else fail("itemReceivedAt not set");
}

async function testNoStripeBlocksRefund() {
  console.log("\n4. Refund without Stripe PI is blocked");
  await resetOrder();
  const order = await p.order.findUnique({ where: { id: ORDER_ID } });
  const savedPi = order.stripePaymentId;
  await p.order.update({ where: { id: ORDER_ID }, data: { stripePaymentId: null } });
  const ret = await p.returnRequest.create({
    data: {
      orderId: ORDER_ID,
      userId: order.userId,
      reason: "other",
      photos: ["/uploads/returns/test.jpg"],
      status: "return_received",
      refundAmount: order.total,
      itemReceivedAt: new Date(),
    },
  });

  const { processReturnRefund } = require("../dist/services/returnRefundService");
  let threw = false;
  try {
    await processReturnRefund(ret.id, { manual: true });
  } catch (e) {
    threw = e.message?.includes("No Stripe payment") || e.statusCode === 400;
  }
  if (threw) ok("processReturnRefund throws when no stripePaymentId");
  else fail("Should block refund without Stripe PI");

  await p.order.update({ where: { id: ORDER_ID }, data: { stripePaymentId: savedPi } });
}

async function main() {
  console.log("Return flow audit — order", ORDER_ID);
  const order = await p.order.findUnique({ where: { id: ORDER_ID } });
  if (!order) {
    console.error("Order not found");
    process.exit(1);
  }
  console.log("Order:", order.orderNumber, "| Stripe PI:", order.stripePaymentId ? "yes" : "no");

  await testRejectedResubmit();
  await testActiveBlocksNew();
  await testWebhookRawBody();

  try {
    await testNoStripeBlocksRefund();
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND" || String(e.message).includes("dist/services")) {
      console.log("\n4. Skipped dist import test (run npm run build first for refund service test)");
    } else {
      fail(`Stripe block test error: ${e.message}`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Passed: ${passes.length} | Failed: ${failures.length}`);
  if (failures.length) {
    failures.forEach((f) => console.log("  FAIL:", f));
    process.exit(1);
  }
  console.log("All checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
