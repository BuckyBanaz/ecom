-- CreateTable
CREATE TABLE "product_drafts" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "batch_id" TEXT,
    "name" TEXT,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_drafts_status_idx" ON "product_drafts"("status");
CREATE INDEX "product_drafts_batch_id_idx" ON "product_drafts"("batch_id");
