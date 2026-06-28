import { supabase } from "@/integrations/supabase/client";

/**
 * Founder-entity de-duplication.
 *
 * Many transcripts mention the same founder under different surface forms
 * ("Elon Musk", "elon", "@elonmusk"). The DB-backed `founder_aliases` table
 * maps each surface form to a canonical display name so favoriting once works
 * everywhere.
 */

let cache: Map<string, string> | null = null;
let inflight: Promise<Map<string, string>> | null = null;

const loadAliasMap = async (): Promise<Map<string, string>> => {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("founder_aliases" as any)
      .select("canonical_name, alias");
    const m = new Map<string, string>();
    if (!error && Array.isArray(data)) {
      for (const row of data as Array<{ canonical_name: string; alias: string }>) {
        m.set(row.alias.trim().toLowerCase(), row.canonical_name);
      }
    }
    cache = m;
    inflight = null;
    return m;
  })();
  return inflight;
};

/** Best-effort sync lookup once the alias table has been loaded once. */
export const canonicalFounderSync = (raw: string): string => {
  const clean = raw.trim();
  if (!clean) return clean;
  const key = clean.toLowerCase().replace(/^@/, "");
  if (cache?.has(key)) return cache.get(key)!;
  if (cache?.has("@" + key)) return cache.get("@" + key)!;
  // Title-case fallback so unknown names still display nicely.
  return clean
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
};

export const ensureFoundersLoaded = () => loadAliasMap();

export const canonicalFounder = async (raw: string): Promise<string> => {
  await loadAliasMap();
  return canonicalFounderSync(raw);
};

export const canonicalFounders = (raws: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raws) {
    const c = canonicalFounderSync(r);
    if (!c) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
};
