import { useEffect, useRef, useState } from "react";

/**
 * Reveals `items` page by page as a sentinel element scrolls into view. Attach `sentinelRef` to an
 * element rendered below the list while `hasMore` is true; `loadingMore` is true during the short
 * pause before the next page appears (show a loader then).
 */
export function useInfiniteList<T>(items: T[], pageSize: number, revealDelayMs = 450) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    setVisibleCount(pageSize);
    setLoadingMore(false);
  }, [items, pageSize]);

  // Sentinel in view -> start loading the next page
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLoadingMore(true);
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, visibleCount]);

  // Own effect on purpose: the observer effect re-runs when loadingMore flips and must not cancel this timer
  useEffect(() => {
    if (!loadingMore) return;
    const timer = setTimeout(() => {
      setVisibleCount((count) => count + pageSize);
      setLoadingMore(false);
    }, revealDelayMs);
    return () => clearTimeout(timer);
  }, [loadingMore, pageSize, revealDelayMs]);

  return { visibleItems: items.slice(0, visibleCount), hasMore, loadingMore, sentinelRef };
}
