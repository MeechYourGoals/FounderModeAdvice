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

export type PinKind = "founder" | "channel" | "topic";

export interface PinIndex {
  /** kind -> normalized value -> set of episode ids */
  byKind: Record<PinKind, Map<string, Set<string>>>;
  /** episode lookup */
  rowById: Map<string, EpisodeRow>;
}

export interface LibraryFacets {
  founders: FacetCount[];
  channels: FacetCount[];
  topics: FacetCount[];
  rows: EpisodeRow[];
  index: PinIndex;
  loading: boolean;
}

const bump = (map: Map<string, FacetCount>, value: string, display: string) => {
  const key = value.toLowerCase();
  const existing = map.get(key);
  if (existing) existing.count += 1;
  else map.set(key, { value: key, display_name: display, count: 1 });
};

const indexAdd = (m: Map<string, Set<string>>, value: string, id: string) => {
  const k = value.toLowerCase();
  let s = m.get(k);
  if (!s) {
    s = new Set();
    m.set(k, s);
  }
  s.add(id);
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

    const index: PinIndex = {
      byKind: {
        founder: new Map(),
        channel: new Map(),
        topic: new Map(),
      },
      rowById: new Map(),
    };

    for (const r of rows) {
      index.rowById.set(r.id, r);
      for (const f of rowFounders(r)) {
        bump(founders, f, f);
        indexAdd(index.byKind.founder, f, r.id);
      }
      if (r.channel_name) {
        const handle = r.channel_handle?.trim() || r.channel_name.trim();
        bump(channels, handle, r.channel_name.trim());
        indexAdd(index.byKind.channel, handle, r.id);
      }
      for (const t of normalizeTopics(r.topics)) {
        bump(topics, t, t);
        indexAdd(index.byKind.topic, t, r.id);
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
      index,
      loading,
    };
  }, [rows, loading]);
};

/**
 * Index-based intersection filter. O(smallest_set + ∑ lookups) instead of
 * O(rows × pins). For thousands of episodes with multiple pins this stays
 * sub-millisecond.
 */
export const filterEpisodesByPins = (
  rowsOrIndex: EpisodeRow[] | PinIndex,
  pins: Array<{ kind: PinKind; value: string }>,
): EpisodeRow[] => {
  // Back-compat: array input falls back to a linear scan.
  if (Array.isArray(rowsOrIndex)) {
    if (pins.length === 0) return rowsOrIndex;
    return rowsOrIndex.filter((r) => {
      const founderSet = new Set(rowFounders(r).map((s) => s.toLowerCase()));
      const channelKey = (r.channel_handle?.trim() || r.channel_name?.trim() || "").toLowerCase();
      const topicSet = new Set(normalizeTopics(r.topics).map((t) => t.toLowerCase()));
      return pins.every((p) => {
        if (p.kind === "founder") return founderSet.has(p.value.toLowerCase());
        if (p.kind === "channel") return channelKey === p.value.toLowerCase();
        return topicSet.has(p.value.toLowerCase());
      });
    });
  }

  const index = rowsOrIndex;
  const allRows = Array.from(index.rowById.values());
  if (pins.length === 0) return allRows;

  // Resolve each pin to its episode-id set; missing pin => empty result.
  const sets: Set<string>[] = [];
  for (const p of pins) {
    const s = index.byKind[p.kind].get(p.value.toLowerCase());
    if (!s || s.size === 0) return [];
    sets.push(s);
  }
  sets.sort((a, b) => a.size - b.size);
  const [smallest, ...rest] = sets;

  const out: EpisodeRow[] = [];
  for (const id of smallest) {
    let ok = true;
    for (const s of rest) {
      if (!s.has(id)) { ok = false; break; }
    }
    if (ok) {
      const row = index.rowById.get(id);
      if (row) out.push(row);
    }
  }
  // Preserve newest-first order from the source query.
  const order = new Map(allRows.map((r, i) => [r.id, i]));
  out.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return out;
};
