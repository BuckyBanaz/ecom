-- AlterTable
ALTER TABLE "orders" ADD COLUMN "delivered_at" TIMESTAMP(3);

ALTER TABLE "return_requests" ADD COLUMN "return_shipment_status" TEXT;
ALTER TABLE "return_requests" ADD COLUMN "item_received_at" TIMESTAMP(3);

-- Backfill delivery dates for existing delivered orders
UPDATE "orders" SET "delivered_at" = "updated_at" WHERE "status" = 'delivered' AND "delivered_at" IS NULL;
