-- Add SEO fields to blogs and categories (AI SEO Expert v0.1)
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "seo_title" TEXT;
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "seo_description" TEXT;
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "seo_keywords" TEXT;

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "seo_title" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "seo_description" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "seo_keywords" TEXT;
