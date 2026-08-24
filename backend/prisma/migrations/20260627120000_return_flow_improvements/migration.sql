-- Idempotent return-flow migration (safe to re-run after a failed attempt).

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3);

-- Table may exist from db push; create it if missing.
CREATE TABLE IF NOT EXISTS "return_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT,
    "reason" TEXT NOT NULL,
    "customer_note" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "ai_fraud_score" DOUBLE PRECISION,
    "ai_summary" TEXT,
    "ai_recommendation" TEXT,
    "admin_note" TEXT,
    "refund_amount" DOUBLE PRECISION,
    "stripe_refund_id" TEXT,
    "refund_processed_at" TIMESTAMP(3),
    "refund_expected_at" TIMESTAMP(3),
    "return_carrier" TEXT,
    "return_tracking_number" TEXT,
    "return_tracking_url" TEXT,
    "return_label_url" TEXT,
    "return_ship_method_id" TEXT,
    "return_parcel_id" TEXT,
    "return_shipment_status" TEXT,
    "item_received_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "return_shipment_status" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "item_received_at" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_order_id_fkey'
  ) THEN
    ALTER TABLE "return_requests"
      ADD CONSTRAINT "return_requests_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_user_id_fkey'
  ) THEN
    ALTER TABLE "return_requests"
      ADD CONSTRAINT "return_requests_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "return_requests_order_id_idx" ON "return_requests"("order_id");
CREATE INDEX IF NOT EXISTS "return_requests_user_id_idx" ON "return_requests"("user_id");
CREATE INDEX IF NOT EXISTS "return_requests_status_idx" ON "return_requests"("status");

UPDATE "orders"
SET "delivered_at" = "updated_at"
WHERE "status" = 'delivered' AND "delivered_at" IS NULL;
