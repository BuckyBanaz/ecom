-- AI translations of product content (name, descriptions, specs, SEO) per language
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "translations" JSONB NOT NULL DEFAULT '{}';
