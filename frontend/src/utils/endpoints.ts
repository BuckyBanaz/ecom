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
  get SEO_SITEMAP() { return api("/admin/settings/seo/sitemap"); },
  get ADMIN_SEO_CONFIG() { return api("/admin/settings/seo/config"); },
  get PUBLIC_SEO_CONFIG() { return api("/cms/seo-config"); },
  get ADMIN_ANALYTICS_DATA() { return api("/admin/settings/analytics/data"); },
  get ADMIN_GENERAL_SETTINGS() { return api("/admin/settings/general"); },
  get PUBLIC_MAINTENANCE_STATUS() { return api("/cms/maintenance-status"); },
  get CONFIG_APP() { return api("/config/app"); },
  get ADMIN_LOGS() { return api("/admin/logs"); },
  get ADMIN_BACKUPS() { return api("/admin/backups"); },
  get AI_CMS_GENERATE() { return api("/ai/cms/generate"); },
  get AI_LIMITS() { return api("/ai/limits"); },
  get AI_QUICK_ADD() { return api("/ai/products/quick-add"); },
  get AI_DRAFTS() { return api("/ai/drafts"); },
};

/** @deprecated use getBaseUrl() */
export const BASE_URL = getApiBaseUrl();
