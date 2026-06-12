import type { MegaMenu } from "@/data/megaMenu";
import { megaMenuRepository } from "@/client/apiClient";

/** Normalize mega menu payload from API, localStorage, or legacy shapes. */
export function extractMegaMenus(source: unknown): MegaMenu[] {
  if (!source) return [];
  if (Array.isArray(source)) return source as MegaMenu[];
  if (typeof source === "object" && source !== null) {
    const obj = source as Record<string, unknown>;
    if (Array.isArray(obj.menus)) return obj.menus as MegaMenu[];
    if (Array.isArray(obj.megaMenus)) return obj.megaMenus as MegaMenu[];
  }
  return [];
}

/** useCmsData fetcher — API returns `{ menus }`, not `{ data }`. */
export async function fetchMegaMenusCmsPayload() {
  const res = await megaMenuRepository.getAll();
  if (res.success && Array.isArray(res.menus)) {
    return { success: true as const, data: res.menus as MegaMenu[] };
  }
  return { success: false as const };
}

export function readMegaMenusFromStorage(): MegaMenu[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const cached = localStorage.getItem("mega_menu_data");
    return cached ? extractMegaMenus(JSON.parse(cached)) : [];
  } catch {
    return [];
  }
}
