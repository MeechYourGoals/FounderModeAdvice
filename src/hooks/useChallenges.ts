import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const cacheKey = (userId: string) => `fma_challenges_${userId}`;

/** Fired after a save so every mounted consumer (e.g. the home desk "Your
 * focus" strip) refreshes without a reload — same bus pattern as
 * "inspirationsChanged". */
const CHANGE_EVENT = "challengesChanged";

function readCache(userId: string): string[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function normalize(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * The user's "what are you wrestling with" picks from onboarding — stable
 * challenge ids (see lib/challenges.ts).
 *
 * Same dual-layer pattern as useInspirations: localStorage answers instantly
 * and keeps working offline; the `user_onboarding.challenges` column is the
 * cross-device source of truth. All DB access is failure-tolerant (the column
 * ships in a separate migration), so a missing column degrades to cache-only.
 */
export function useChallenges() {
  const { user, loading: authLoading } = useAuth();
  const [challenges, setChallenges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    setChallenges(readCache(user.id));
    setLoading(false);

    try {
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("challenges")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return;
      const remote = Array.isArray(data?.challenges)
        ? (data.challenges as unknown[]).filter((n): n is string => typeof n === "string")
        : null;
      if (remote) {
        setChallenges(remote);
        localStorage.setItem(cacheKey(user.id), JSON.stringify(remote));
      }
    } catch {
      // Cache already applied; nothing else to do offline.
    }
  }, [user, authLoading]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => {
      if (user) setChallenges(readCache(user.id));
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, [user]);

  const save = useCallback(
    async (ids: string[]) => {
      const cleaned = normalize(ids);
      setChallenges(cleaned);
      if (!user) return;
      localStorage.setItem(cacheKey(user.id), JSON.stringify(cleaned));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      try {
        await supabase.from("user_onboarding").upsert(
          {
            user_id: user.id,
            challenges: cleaned,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      } catch (err) {
        console.error("Failed to sync challenges", err);
      }
    },
    [user],
  );

  return { challenges, save, loading };
}
