import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const cacheKey = (userId: string) => `fma_inspirations_${userId}`;

/** Fired after a save so every mounted consumer (e.g. the library empty state's
 * "Picked for you" strip) refreshes without a reload — same bus pattern as
 * "profilesChanged". */
const CHANGE_EVENT = "inspirationsChanged";

function readCache(userId: string): string[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function normalize(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * The user's "who inspires you" picks from onboarding — names only.
 *
 * Same dual-layer pattern as useOnboarding: localStorage answers instantly and
 * keeps working offline; the `user_onboarding.inspirations` column is the
 * cross-device source of truth. All DB access is failure-tolerant (the column
 * ships in a separate migration), so a missing column degrades to cache-only.
 */
export function useInspirations() {
  const { user, loading: authLoading } = useAuth();
  const [inspirations, setInspirations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setInspirations([]);
      setLoading(false);
      return;
    }

    setInspirations(readCache(user.id));
    setLoading(false);

    try {
      // Cast: generated types lag the inspirations column (same convention as
      // other newer tables, e.g. user_favorites).
      const { data, error } = await (supabase.from("user_onboarding") as any)
        .select("inspirations")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return;
      const remote = Array.isArray(data?.inspirations)
        ? (data.inspirations as unknown[]).filter((n): n is string => typeof n === "string")
        : null;
      if (remote) {
        setInspirations(remote);
        localStorage.setItem(cacheKey(user.id), JSON.stringify(remote));
      }
    } catch {
      // Cache already applied; nothing else to do offline.
    }
  }, [user, authLoading]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when another hook instance saves (e.g. onboarding finishing while
  // the empty-state recommendations are already mounted behind the dialog).
  useEffect(() => {
    const handler = () => {
      if (user) setInspirations(readCache(user.id));
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, [user]);

  const save = useCallback(
    async (names: string[]) => {
      const cleaned = normalize(names);
      setInspirations(cleaned);
      if (!user) return;
      localStorage.setItem(cacheKey(user.id), JSON.stringify(cleaned));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      try {
        await (supabase.from("user_onboarding") as any).upsert(
          {
            user_id: user.id,
            inspirations: cleaned,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      } catch (err) {
        console.error("Failed to sync inspirations", err);
      }
    },
    [user],
  );

  return { inspirations, save, loading };
}
