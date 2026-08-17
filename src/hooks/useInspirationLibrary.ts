import { useCallback, useEffect, useRef, useState } from "react";
import { fetchInspirationLibrary, type DiscoveryContent } from "@/services/discovery";

const PAGE_SIZE = 24;

/**
 * The browsable Inspiration Library, paginated. Available on every tier — it
 * is both the lower-tier preview of Discover and the premium empty state while
 * the first weekly batch is being prepared.
 */
export function useInspirationLibrary(categories: string[]) {
  const [items, setItems] = useState<DiscoveryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0);
  // Serialize on the filter contents, not the array identity, so a re-render
  // with an equal-but-new array doesn't refetch.
  const filterKey = categories.slice().sort().join("|");

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchInspirationLibrary({
        categories: filterKey ? filterKey.split("|") : undefined,
        limit: PAGE_SIZE,
      });
      if (requestId !== requestRef.current) return;
      setItems(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error("Failed to load inspiration library", err);
      setError("We couldn't load the library right now.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const rows = await fetchInspirationLibrary({
        categories: filterKey ? filterKey.split("|") : undefined,
        limit: PAGE_SIZE,
        offset: items.length,
      });
      setItems((current) => [...current, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load more library items", err);
    } finally {
      setLoadingMore(false);
    }
  }, [filterKey, hasMore, items.length, loadingMore]);

  return { items, loading, loadingMore, hasMore, error, loadMore, reload: load };
}
