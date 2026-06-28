import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeTopics } from "@/lib/topics";
import {
  canonicalFounderSync,
  ensureFoundersLoaded,
} from "@/lib/founders";

export interface FacetCount {
  value: string;        // lowercase id used for matching/storage
  display_name: string; // human label
  count: number;
}

export interface EpisodeRow {
  id: string;
  title: string;
  url: string;
  founder_names: string | null;
  founders: string[] | null;        // canonical founders array (new)
  channel_name: string | null;
  channel_handle: string | null;
  topics: string[] | null;
  release_date: string | null;
  created_at: string | null;
}

export interface LibraryFacets {
  founders: FacetCount[];
  channels: FacetCount[];
  topics: FacetCount[];
  rows: EpisodeRow[];
  loading: boolean;
}

const bump = (map: Map<string, FacetCount>, value: string, display: string) => {
  const key = value.toLowerCase();
  const existing = map.get(key);
  if (existing) existing.count += 1;
  else map.set(key, { value: key, display_name: display, count: 1 });
};

/** Pull canonical founders from a row, falling back to the legacy comma-joined string. */
export const rowFounders = (r: EpisodeRow): string[] => {
  if (r.founders && r.founders.length > 0) return r.founders;
  if (!r.founder_names) return [];
  return r.founder_names
    .split(",")
    .map((s) => canonicalFounderSync(s))
    .filter(Boolean);
};

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
      await ensureFoundersLoaded(); // warm the alias cache so syncs work below
      const { data, error } = await supabase
        .from("episodes")
        .select(
          "id, title, url, founder_names, founders, channel_name, channel_handle, topics, release_date, created_at",
        )
        .eq("analyzed_by", user.id)
        .eq("analysis_status", "completed")
        .order("created_at", { ascending: false })
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
      for (const f of rowFounders(r)) {
        bump(founders, f, f); // canonical name is already display-ready
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
      Array.from(m.values()).sort(
        (a, b) => b.count - a.count || a.display_name.localeCompare(b.display_name),
      );

    return {
      founders: sort(founders),
      channels: sort(channels),
      topics: sort(topics),
      rows,
      loading,
    };
  }, [rows, loading]);
};

/** Filter an episode list by the strict intersection of selected pins. */
export const filterEpisodesByPins = (
  rows: EpisodeRow[],
  pins: Array<{ kind: "founder" | "channel" | "topic"; value: string }>,
): EpisodeRow[] => {
  if (pins.length === 0) return rows;
  return rows.filter((r) => {
    const founderSet = new Set(rowFounders(r).map((s) => s.toLowerCase()));
    const channelKey = (r.channel_handle?.trim() || r.channel_name?.trim() || "").toLowerCase();
    const topicSet = new Set(normalizeTopics(r.topics).map((t) => t.toLowerCase()));
    return pins.every((p) => {
      if (p.kind === "founder") return founderSet.has(p.value.toLowerCase());
      if (p.kind === "channel") return channelKey === p.value.toLowerCase();
      return topicSet.has(p.value.toLowerCase());
    });
  });
};
