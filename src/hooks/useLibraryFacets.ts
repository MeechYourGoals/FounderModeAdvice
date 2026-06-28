import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeTopics } from "@/lib/topics";

export interface FacetCount {
  value: string;        // lowercase id
  display_name: string; // human label
  count: number;
}

export interface LibraryFacets {
  founders: FacetCount[];
  channels: FacetCount[];
  topics: FacetCount[];
  loading: boolean;
}

interface EpisodeRow {
  id: string;
  founder_names: string | null;
  channel_name: string | null;
  channel_handle: string | null;
  topics: string[] | null;
}

const bump = (map: Map<string, FacetCount>, value: string, display: string) => {
  const key = value.toLowerCase();
  const existing = map.get(key);
  if (existing) existing.count += 1;
  else map.set(key, { value: key, display_name: display, count: 1 });
};

/**
 * Aggregates the *user's analyzed library* into founder / channel / topic
 * facet counts. All work happens client-side over the analyzed episodes the
 * user can see — no extra RPC needed, RLS already filters the rows.
 */
export const useLibraryFacets = (): LibraryFacets => {
  const { user } = useAuth();
  const [rows, setRows] = useState<EpisodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("episodes")
        .select("id, founder_names, channel_name, channel_handle, topics")
        .eq("analyzed_by", user.id)
        .eq("analysis_status", "completed")
        .limit(2000);
      if (cancelled) return;
      if (error) {
        console.warn("useLibraryFacets load failed:", error);
        setRows([]);
      } else {
        setRows((data ?? []) as EpisodeRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return useMemo(() => {
    const founders = new Map<string, FacetCount>();
    const channels = new Map<string, FacetCount>();
    const topics = new Map<string, FacetCount>();

    for (const r of rows) {
      if (r.founder_names) {
        for (const f of r.founder_names.split(",").map((s) => s.trim()).filter(Boolean)) {
          bump(founders, f, f);
        }
      }
      if (r.channel_name) {
        const handle = r.channel_handle?.trim() || r.channel_name.trim();
        bump(channels, handle, r.channel_name.trim());
      }
      for (const t of normalizeTopics(r.topics)) {
        bump(topics, t, t);
      }
    }

    const sort = (m: Map<string, FacetCount>) =>
      Array.from(m.values()).sort((a, b) => b.count - a.count || a.display_name.localeCompare(b.display_name));

    return {
      founders: sort(founders),
      channels: sort(channels),
      topics: sort(topics),
      loading,
    };
  }, [rows, loading]);
};
