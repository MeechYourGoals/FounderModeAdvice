import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const cacheKey = (userId: string) => `fma_onboarding_complete_${userId}`;

/**
 * Tracks first-run onboarding completion for the current user.
 *
 * Source of truth is the `user_onboarding` table; a localStorage cache is used
 * to make the initial decision instantly (no tour flash on every load) and as a
 * graceful fallback if the network request fails.
 */
export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (authLoading) return;
      if (!user) {
        setCompleted(null);
        setLoading(false);
        return;
      }

      // Optimistic read from cache so a returning user never sees a flash.
      const cached = localStorage.getItem(cacheKey(user.id));
      if (cached === "true") {
        setCompleted(true);
        setLoading(false);
      }

      try {
        const { data, error } = await supabase
          .from("user_onboarding")
          .select("completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!active) return;
        if (error) throw error;

        const isComplete = Boolean(data?.completed);
        setCompleted(isComplete);
        localStorage.setItem(cacheKey(user.id), isComplete ? "true" : "false");
      } catch (err) {
        console.error("Failed to load onboarding state", err);
        // Fall back to cache; if there's none, default to "completed" so we never
        // trap a user in a broken tour loop when the table/network is unavailable.
        if (active && completed === null) {
          setCompleted(cached === "true" ? true : cached === "false" ? false : true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const complete = useCallback(async () => {
    if (!user) return;
    setCompleted(true);
    localStorage.setItem(cacheKey(user.id), "true");
    try {
      await supabase.from("user_onboarding").upsert(
        {
          user_id: user.id,
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch (err) {
      console.error("Failed to persist onboarding completion", err);
    }
  }, [user]);

  const restart = useCallback(async () => {
    if (!user) return;
    setCompleted(false);
    localStorage.setItem(cacheKey(user.id), "false");
    try {
      await supabase.from("user_onboarding").upsert(
        {
          user_id: user.id,
          completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch (err) {
      console.error("Failed to reset onboarding", err);
    }
  }, [user]);

  return { loading, completed, complete, restart };
}
