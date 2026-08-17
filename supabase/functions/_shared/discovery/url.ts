// URL canonicalization and dedupe keys for discovery.
//
// Two different candidates pointing at the same thing (http/https, www, AMP,
// tracking params, youtu.be vs youtube.com, a trailing slash) must collapse to
// one row in discovery_content. `contentKey` is that collapse — it is the
// UNIQUE column in the table, so it has to be deterministic and stable.
//
// Keep in sync with the content_key values seeded in
// supabase/migrations/20260817120100_seed_inspiration_library.sql (pinned by
// url.test.ts).

/** Query params that never change which document you land on. */
const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "si", "feature", "igsh", "igshid", "fbclid", "gclid", "mc_cid", "mc_eid",
  "ref", "ref_src", "ref_url", "source", "spm", "cmpid", "amp", "at_medium",
  "__twitter_impression", "guccounter", "ncid", "_hsenc", "_hsmi",
]);

/** Hosts whose "www." prefix is noise. */
const stripWww = (host: string): string => host.replace(/^www\./, "");

/** Extract a YouTube video id from any of its URL shapes. */
export function youTubeVideoId(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = stripWww(u.hostname.toLowerCase());
  const valid = (id: string | null | undefined): string | null =>
    id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;

  if (host === "youtu.be") return valid(u.pathname.split("/").filter(Boolean)[0]);
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "music.youtube.com") return null;

  const parts = u.pathname.split("/").filter(Boolean);
  if (parts[0] === "watch") return valid(u.searchParams.get("v"));
  if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live" || parts[0] === "v") {
    return valid(parts[1]);
  }
  return valid(u.searchParams.get("v"));
}

/**
 * A cleaned, navigable URL: https, no tracking params, no fragment, no
 * trailing slash, canonical YouTube watch form. This is what we link out to.
 */
export function canonicalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const videoId = youTubeVideoId(u.toString());
  if (videoId) return `https://youtube.com/watch?v=${videoId}`;

  u.protocol = "https:";
  u.hostname = stripWww(u.hostname.toLowerCase());
  u.hash = "";
  u.port = "";

  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
  }
  // Sort remaining params so ?a=1&b=2 and ?b=2&a=1 dedupe together.
  const sorted = [...u.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  u.search = "";
  for (const [k, v] of sorted) u.searchParams.append(k, v);

  // Drop AMP suffixes so the AMP and canonical copies of an article collapse.
  u.pathname = u.pathname.replace(/\/amp\/?$/i, "/").replace(/\.amp$/i, "");
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");

  return u.toString();
}

/**
 * The dedupe identity of a piece of content: "youtube:<id>" for videos,
 * "<host><path>[?query]" otherwise. Lowercased host, no scheme, no trailing
 * slash — so http/https/www/AMP variants all land on one key.
 */
export function contentKey(raw: string): string | null {
  const videoId = youTubeVideoId(raw);
  if (videoId) return `youtube:${videoId}`;

  const canonical = canonicalizeUrl(raw);
  if (!canonical) return null;

  const u = new URL(canonical);
  const path = u.pathname.replace(/\/+$/, "");
  return `${u.hostname}${path}${u.search}`.toLowerCase();
}

/** Registrable-ish host used for source-diversity scoring and quality lookups. */
export function hostOf(raw: string): string | null {
  try {
    return stripWww(new URL(raw).hostname.toLowerCase());
  } catch {
    return null;
  }
}

const TITLE_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "at", "by", "from", "is", "are", "was", "were", "be", "how", "why", "what",
  "this", "that", "it", "its", "as", "your", "you",
]);

/** Content words of a title, lowercased — the basis for near-duplicate checks. */
export function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !TITLE_STOPWORDS.has(w));
}

/**
 * Jaccard overlap of title content words, 0..1. Cheap and good enough to catch
 * the same story syndicated across publishers ("SpaceX lands booster" vs
 * "SpaceX Lands Its Booster Again") without an embedding call.
 */
export function titleSimilarity(a: string, b: string): number {
  const setA = new Set(titleTokens(a));
  const setB = new Set(titleTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}
