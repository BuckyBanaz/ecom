const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  await p.$executeRawUnsafe(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP(3)',
  );

  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS return_requests (
      id TEXT NOT NULL PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT,
      reason TEXT NOT NULL,
      customer_note TEXT,
      photos JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending_review',
      ai_fraud_score DOUBLE PRECISION,
      ai_summary TEXT,
      ai_recommendation TEXT,
      admin_note TEXT,
      refund_amount DOUBLE PRECISION,
      stripe_refund_id TEXT,
      refund_processed_at TIMESTAMP(3),
      refund_expected_at TIMESTAMP(3),
      return_carrier TEXT,
      return_tracking_number TEXT,
      return_tracking_url TEXT,
      return_label_url TEXT,
      return_ship_method_id TEXT,
      return_parcel_id TEXT,
      return_shipment_status TEXT,
      item_received_at TIMESTAMP(3),
      reviewed_at TIMESTAMP(3),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.$executeRawUnsafe(
    'ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS return_shipment_status TEXT',
  );
  await p.$executeRawUnsafe(
    'ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS item_received_at TIMESTAMP(3)',
  );
  await p.$executeRawUnsafe(
    "UPDATE orders SET delivered_at = updated_at WHERE status = 'delivered' AND delivered_at IS NULL",
  );
  console.log("Return flow schema columns applied.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
