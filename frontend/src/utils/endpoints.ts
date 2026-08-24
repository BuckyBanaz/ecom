import { getApiBaseUrl } from "./image";

export const API_PREFIX = "/api/v1";

export const getBaseUrl = (): string => getApiBaseUrl();

/** Full API v1 base, e.g. https://api.schipenster.com/api/v1 (works with or without /api/v1 in VITE_API_URL). */
export const getApiV1Url = (): string => `${getApiBaseUrl()}${API_PREFIX}`;

const api = (path: string): string => `${getApiBaseUrl()}${API_PREFIX}${path}`;

export const ENDPOINTS = {
  get PRODUCTS() { return api("/products"); },
  get CATEGORIES() { return api("/categories"); },
  get BRANDS() { return api("/brands"); },
  get SERIES() { return api("/series"); },
  get ATTRIBUTES() { return api("/attributes"); },
  get MEGAMENUS() { return api("/megamenus"); },
  get CMS_HOMEPAGE() { return api("/cms/homepage"); },
  get CMS_RELIEF() { return api("/cms/relief"); },
  get CMS_PRODUCT_PAGE() { return api("/cms/product-page"); },
  get CMS_PAGES() { return api("/cms/pages"); },
  get CMS() { return api("/cms"); },
  get CMS_PAGE() { return api("/cms"); },
  get CMS_HEADER_FOOTER() { return api("/cms/header-footer"); },
  get MEDIA() { return api("/media"); },
  get AUTH() { return api("/auth"); },
  get BLOGS() { return api("/blogs"); },
  get REVIEWS() { return api("/reviews"); },
  get CMS_FEATURES() { return api("/cms/features"); },
  get ADDRESSES() { return api("/addresses"); },
  get ADMIN_SETTINGS() { return api("/admin/settings"); },
  get EMAIL_TEMPLATES() { return api("/admin/email-templates"); },
  get WISHLIST() { return api("/wishlists"); },
  get COUPONS() { return api("/coupons"); },
  get CHARGES() { return api("/charges"); },
  get ORDERS() { return api("/orders"); },
  get SEO_ROBOTS() { return api("/admin/settings/seo/robots"); },
  get SEO_LLMS() { return api("/admin/settings/seo/llms"); },
  get SEO_SITEMAP() { return api("/admin/settings/seo/sitemap"); },
  get AI_SEO_GENERATE_ROBOTS() { return api("/ai/seo/generate-robots"); },
  get AI_SEO_GENERATE_LLMS() { return api("/ai/seo/generate-llms"); },
  get ADMIN_SEO_CONFIG() { return api("/admin/settings/seo/config"); },
  get PUBLIC_SEO_CONFIG() { return api("/cms/seo-config"); },
  get ADMIN_ANALYTICS_DATA() { return api("/admin/settings/analytics/data"); },
  get ADMIN_GENERAL_SETTINGS() { return api("/admin/settings/general"); },
  get PUBLIC_MAINTENANCE_STATUS() { return api("/cms/maintenance-status"); },
  get CONFIG_APP() { return api("/config/app"); },
  get ADMIN_LOGS() { return api("/admin/logs"); },
  get ADMIN_BACKUPS() { return api("/admin/backups"); },
  get AI() { return api("/ai"); },
  get AI_CMS_GENERATE() { return api("/ai/cms/generate"); },
  get AI_LIMITS() { return api("/ai/limits"); },
  get AI_QUICK_ADD() { return api("/ai/products/quick-add"); },
  get AI_DRAFTS() { return api("/ai/drafts"); },
  get AI_SEO_AUDIT() { return api("/ai/seo/audit"); },
  get AI_SEO_PLAYBOOK() { return api("/ai/seo/playbook"); },
  get AI_SEO_PLAYBOOK_SYNC() { return api("/ai/seo/playbook/sync-all"); },
  get AI_SEO_OPTIMIZE() { return api("/ai/seo/optimize"); },
  get AI_SEO_BULK_OPTIMIZE() { return api("/ai/seo/bulk-optimize"); },
  get AI_SEO_PRODUCT_OPTIMIZE() { return api("/ai/seo/product-optimize"); },
  get AI_SEO_JOB() { return api("/ai/seo/job"); },
  get AI_SEO_JOB_DISMISS() { return api("/ai/seo/job/dismiss"); },
  get AI_SEO_AUTOPILOT() { return api("/ai/seo/autopilot"); },
  get AI_SEO_AUTOPILOT_RUN() { return api("/ai/seo/autopilot/run"); },
  get AI_BLOG_GENERATE() { return api("/ai/blogs/generate"); },
  get AI_BLOG_SUGGESTIONS() { return api("/ai/blogs/suggestions"); },
  get AI_CMS_CONTEXT() { return api("/ai/cms/context"); },
  get AI_FAQ_GENERATE() { return api("/ai/faqs/generate"); },
  get AI_SEO_GSC_STATUS() { return api("/ai/seo/search-console/status"); },
  get AI_SEO_GSC_OVERVIEW() { return api("/ai/seo/search-console/overview"); },
  get AI_SEO_RANK_TRACKING() { return api("/ai/seo/rank-tracking"); },
  get AI_SEO_RANK_SYNC() { return api("/ai/seo/rank-tracking/sync"); },
  get AI_SEO_INTERNAL_LINKS() { return api("/ai/seo/internal-links"); },
  get AI_SEO_INTERNAL_LINK_APPLY() { return api("/ai/seo/internal-links/apply"); },
  get RETURNS() { return api("/returns"); },
};

/** @deprecated use getBaseUrl() */
export const BASE_URL = getApiBaseUrl();
