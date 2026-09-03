import { useCallback, useEffect, useRef, useState } from "react";
import { searchCommunity, type CommunityContent } from "@/services/community";

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 350;

/**
 * The Community Library: search/browse content other founders have already
 * analyzed (public URLs only). Mirrors useInspirationLibrary's pagination
 * shape, with a debounced free-text query instead of category filters.
 */
export function useCommunityLibrary(query: string) {
  const [items, setItems] = useState<CommunityContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const requestRef = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await searchCommunity(debouncedQuery, PAGE_SIZE, 0);
      if (requestId !== requestRef.current) return;
      setItems(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error("Failed to load the community library", err);
      setError("We couldn't load the community library right now.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const rows = await searchCommunity(debouncedQuery, PAGE_SIZE, items.length);
      setItems((current) => [...current, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load more community items", err);
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedQuery, hasMore, items.length, loadingMore]);

  return { items, loading, loadingMore, hasMore, error, loadMore, reload: load };
}
