import { useState, useEffect, useCallback } from "react";

/**
 * A hook for fetching CMS data with a cache-first strategy (Stale-While-Revalidate).
 * It instantly loads data from localStorage if available, then fetches fresh data
 * in the background and updates the state.
 */
export function useCmsData<T>(cacheKey: string, fetcher: () => Promise<{ success: boolean; data?: T }>) {
  const [data, setData] = useState<T | null>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(data === null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetcher();
      if (res.success && res.data) {
        // Only update state if data changed (to avoid unnecessary re-renders)
        const newStr = JSON.stringify(res.data);
        const oldStr = localStorage.getItem(cacheKey);
        
        if (newStr !== oldStr) {
          setData(res.data);
          localStorage.setItem(cacheKey, newStr);
        }
        setLoading(false);
      } else if (!data) {
        setLoading(false);
      }
    } catch (err) {
      console.error(`Failed to fetch CMS data for ${cacheKey}`, err);
      if (!data) setLoading(false);
    }
  }, [cacheKey, fetcher, data]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { data, loading };
}
