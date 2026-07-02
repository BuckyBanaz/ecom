const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  await p.$executeRawUnsafe(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP(3)',
  );
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
