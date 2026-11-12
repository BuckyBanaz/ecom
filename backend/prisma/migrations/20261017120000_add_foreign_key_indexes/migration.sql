-- Postgres does not index foreign keys automatically; add indexes for hot catalog/order lookups
CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories"("parent_id");

CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products"("category_id");
CREATE INDEX IF NOT EXISTS "products_brand_id_idx" ON "products"("brand_id");
CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products"("created_at");

CREATE INDEX IF NOT EXISTS "attribute_values_attribute_id_idx" ON "attribute_values"("attribute_id");

CREATE INDEX IF NOT EXISTS "product_attribute_values_attribute_value_id_idx" ON "product_attribute_values"("attribute_value_id");
CREATE INDEX IF NOT EXISTS "product_attribute_values_attribute_id_idx" ON "product_attribute_values"("attribute_id");

CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants"("product_id");

CREATE INDEX IF NOT EXISTS "variant_attribute_values_attribute_value_id_idx" ON "variant_attribute_values"("attribute_value_id");

CREATE INDEX IF NOT EXISTS "reviews_product_id_idx" ON "reviews"("product_id");

CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders"("user_id");

CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items"("order_id");
