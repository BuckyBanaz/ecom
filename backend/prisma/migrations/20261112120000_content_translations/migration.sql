-- AI translations of CMS pages, blogs, categories and mega menus per storefront language
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "cms_pages" ADD COLUMN IF NOT EXISTS "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "mega_menus" ADD COLUMN IF NOT EXISTS "translations" JSONB NOT NULL DEFAULT '{}';
