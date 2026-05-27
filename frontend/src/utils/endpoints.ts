export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_PREFIX = "/api/v1";

export const ENDPOINTS = {
  PRODUCTS: `${BASE_URL}${API_PREFIX}/products`,
  CATEGORIES: `${BASE_URL}${API_PREFIX}/categories`,
  BRANDS: `${BASE_URL}${API_PREFIX}/brands`,
  SERIES: `${BASE_URL}${API_PREFIX}/series`,
  ATTRIBUTES: `${BASE_URL}${API_PREFIX}/attributes`,
  MEGAMENUS: `${BASE_URL}${API_PREFIX}/megamenus`,
  CMS_HOMEPAGE: `${BASE_URL}${API_PREFIX}/cms/homepage`,
  CMS_RELIEF: `${BASE_URL}${API_PREFIX}/cms/relief`,
  CMS_PAGES: `${BASE_URL}${API_PREFIX}/cms/pages`,
  CMS_PAGE: `${BASE_URL}${API_PREFIX}/cms`,
  MEDIA: `${BASE_URL}${API_PREFIX}/media`,
  AUTH: `${BASE_URL}${API_PREFIX}/auth`,
  BLOGS: `${BASE_URL}${API_PREFIX}/blogs`,
};
