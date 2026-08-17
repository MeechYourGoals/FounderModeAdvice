import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchBatches,
  fetchRecommendations,
  setRecommendationState,
  type ProfileRecommendation,
  type RecommendationBatch,
} from "@/services/discovery";
import type { RecommendationState } from "@/lib/discovery";

/**
 * The weekly feed for one profile: its editions, the selected edition's items,
 * and optimistic state changes.
 *
 * Only the selected edition's items are fetched — the archive list is metadata
 * only, so opening Discover never pulls every recommendation the user has ever
 * received. Passing a different profileId swaps the whole feed.
 */
export function useRecommendations(profileId: string | null) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<RecommendationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ProfileRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate counters per fetch: a slow response for a previous profile (or a
  // previous edition) must never overwrite the current one, and the two fetches
  // must not invalidate each other.
  const batchRequestRef = useRef(0);
  const itemsRequestRef = useRef(0);

  const loadBatches = useCallback(async () => {
    if (!user || !profileId) {
      setBatches([]);
      setSelectedBatchId(null);
      setRecommendations([]);
      setLoading(false);
      return;
    }
    const requestId = ++batchRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchBatches(profileId);
      if (requestId !== batchRequestRef.current) return;
      setBatches(rows);
      setSelectedBatchId(rows[0]?.id ?? null);
      if (rows.length === 0) setRecommendations([]);
    } catch (err) {
      if (requestId !== batchRequestRef.current) return;
      console.error("Failed to load recommendation batches", err);
      setError("We couldn't load your recommendations. Pull to refresh or try again shortly.");
    } finally {
      if (requestId === batchRequestRef.current) setLoading(false);
    }
  }, [user, profileId]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (!selectedBatchId) return;
    const requestId = ++itemsRequestRef.current;
    setItemsLoading(true);
    fetchRecommendations(selectedBatchId)
      .then((rows) => {
        if (requestId !== itemsRequestRef.current) return;
        setRecommendations(rows);
      })
      .catch((err) => {
        if (requestId !== itemsRequestRef.current) return;
        console.error("Failed to load recommendations", err);
        setError("We couldn't load this week's picks. Try again shortly.");
      })
      .finally(() => {
        if (requestId === itemsRequestRef.current) setItemsLoading(false);
      });
  }, [selectedBatchId]);

  /**
   * Apply a state change optimistically, then persist. On failure the previous
   * state is restored so the card never lies about what was saved.
   */
  const applyState = useCallback(
    async (recommendationId: string, state: RecommendationState, episodeId?: string | null) => {
      let previous: RecommendationState | undefined;
      setRecommendations((current) =>
        current.map((item) => {
          if (item.id !== recommendationId) return item;
          previous = item.state;
          return { ...item, state };
        }),
      );

      try {
        await setRecommendationState(recommendationId, state, episodeId);
        if (state === "dismissed") {
          setRecommendations((current) => current.filter((item) => item.id !== recommendationId));
        }
        return true;
      } catch (err) {
        console.error("Failed to update recommendation state", err);
        if (previous) {
          setRecommendations((current) =>
            current.map((item) => (item.id === recommendationId ? { ...item, state: previous! } : item)),
          );
        }
        return false;
      }
    },
    [],
  );

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;

  return {
    batches,
    selectedBatch,
    selectedBatchId,
    selectBatch: setSelectedBatchId,
    recommendations,
    loading,
    itemsLoading,
    error,
    reload: loadBatches,
    applyState,
  };
}
