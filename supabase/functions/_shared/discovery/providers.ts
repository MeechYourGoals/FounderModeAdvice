// Discovery provider abstraction.
//
// The recommendation engine never talks to a search vendor directly — it asks
// a list of DiscoveryProviders, each of which may be absent. Whatever is
// configured is used; whatever is not, is skipped. A run with zero providers
// still produces a batch: generate-recommendations tops the edition up from the
// curated Inspiration Library (see createEvergreenFill below).
//
// Cost/safety note: providers only ever call their own fixed API host. Nothing
// here fetches a discovered URL, so discovery cannot be used as an SSRF vector
// and never pays for a page load. Fetching content happens later, and only
// when the user presses Analyze (analyze-episode → _shared/transcript.ts,
// which has its own SSRF guard).

import type { DiscoveryQuery, QueryIntent } from "./queries.ts";
import { publishedAfterIso, type RecencyBasis } from "./recency.ts";
import { cleanText, looksLowQuality } from "./sanitize.ts";
import { canonicalizeUrl, contentKey, hostOf } from "./url.ts";

export type ContentType = "article" | "video" | "podcast" | "research" | "essay" | "other";

export interface DiscoveryResult {
  url: string;
  canonicalUrl: string;
  contentKey: string;
  title: string;
  description: string | null;
  publisher: string | null;
  author: string | null;
  publishedAt: string | null;
  /** Why this result counts as recent enough to consider. See recency.ts. */
  recencyBasis: RecencyBasis;
  imageUrl: string | null;
  contentType: ContentType;
  durationSeconds: number | null;
  language: string | null;
  providerId: string;
  /** The provider's own ordering for this query, 0-based. */
  rank: number;
  /** The intent that produced this result, carried into ranking. */
  intent: QueryIntent;
  label?: string;
}

export interface SearchOptions {
  limit: number;
  timeoutMs?: number;
}

export interface DiscoveryProvider {
  id: string;
  /** Providers may decline an intent (e.g. a news API has no evergreen mode). */
  supports(intent: QueryIntent): boolean;
  /** Max queries this provider should be asked per run — quota protection. */
  maxQueriesPerRun: number;
  search(query: DiscoveryQuery, options: SearchOptions): Promise<DiscoveryResult[]>;
}

// ---------------------------------------------------------------------------
// Shared normalization
// ---------------------------------------------------------------------------

/** Hosts whose content type is not guessable from the URL alone. */
const RESEARCH_HOSTS = new Set([
  "arxiv.org", "papers.ssrn.com", "ssrn.com", "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov", "nature.com", "science.org", "sciencedirect.com",
  "jstor.org", "researchgate.net", "biorxiv.org", "medrxiv.org", "acm.org",
  "ieee.org", "nber.org", "plos.org",
]);
const PODCAST_HOSTS = new Set([
  "podcasts.apple.com", "open.spotify.com", "overcast.fm", "pca.st",
  "podbean.com", "buzzsprout.com", "simplecast.com", "transistor.fm",
]);
const ESSAY_HOSTS = new Set([
  "paulgraham.com", "substack.com", "medium.com", "blog.samaltman.com",
  "stratechery.com", "joelonsoftware.com", "cdixon.org", "steveblank.com",
  "svpg.com", "kk.org", "avc.com", "danluu.com", "lennysnewsletter.com",
]);

export function inferContentType(url: string, hinted?: ContentType): ContentType {
  if (hinted === "video" || hinted === "research") return hinted;
  const host = hostOf(url);
  if (!host) return hinted ?? "article";
  if (host === "youtube.com" || host === "youtu.be" || host === "vimeo.com") return "video";
  if (RESEARCH_HOSTS.has(host)) return "research";
  if (PODCAST_HOSTS.has(host)) return "podcast";
  if (ESSAY_HOSTS.has(host) || host.endsWith(".substack.com")) return "essay";
  return hinted ?? "article";
}

/**
 * Turn a raw provider hit into a normalized candidate, or null when it is junk
 * (unparseable URL, spam-shaped title, nothing to display).
 */
export function toResult(input: {
  url: unknown;
  title: unknown;
  description?: unknown;
  publisher?: unknown;
  author?: unknown;
  publishedAt?: unknown;
  /** Set to "evergreen" for curated library rows, whose age is not a defect. */
  recencyBasis?: RecencyBasis;
  imageUrl?: unknown;
  contentType?: ContentType;
  durationSeconds?: number | null;
  language?: unknown;
  providerId: string;
  rank: number;
  intent: QueryIntent;
  label?: string;
}): DiscoveryResult | null {
  if (typeof input.url !== "string") return null;
  const canonical = canonicalizeUrl(input.url);
  const key = canonical ? contentKey(canonical) : null;
  if (!canonical || !key) return null;

  const title = cleanText(input.title, 300);
  const description = cleanText(input.description, 600);
  if (looksLowQuality(title, description)) return null;

  const publishedAt = (() => {
    if (typeof input.publishedAt !== "string" || !input.publishedAt.trim()) return null;
    const parsed = new Date(input.publishedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    // Reject nonsense future dates beyond a day of clock skew.
    if (parsed.getTime() > Date.now() + 86_400_000) return null;
    return parsed.toISOString();
  })();

  const imageUrl = typeof input.imageUrl === "string" ? canonicalizeUrl(input.imageUrl) : null;

  // "evergreen" is an editorial classification, not a recency claim, so it wins
  // outright — a curated 2013 essay carries a real date and is still evergreen,
  // and labelling it "published_at" would make it read as a stale item in the
  // freshness metrics. Everything else stands on its own date.
  const recencyBasis: RecencyBasis = input.recencyBasis === "evergreen"
    ? "evergreen"
    : "published_at";

  return {
    url: canonical,
    canonicalUrl: canonical,
    contentKey: key,
    title: title!,
    description,
    publisher: cleanText(input.publisher, 120) ?? hostOf(canonical),
    author: cleanText(input.author, 120),
    publishedAt,
    recencyBasis,
    imageUrl,
    contentType: inferContentType(canonical, input.contentType),
    durationSeconds:
      typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
        ? Math.max(0, Math.round(input.durationSeconds))
        : null,
    language: cleanText(input.language, 12),
    providerId: input.providerId,
    rank: input.rank,
    intent: input.intent,
    label: input.label,
  };
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      console.warn(`[discovery] provider request failed: ${response.status} ${url.split("?")[0]}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn("[discovery] provider request errored:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Curated library fill — always available, no external dependency.
// ---------------------------------------------------------------------------

export type CuratedLoader = (limit: number) => Promise<DiscoveryResult[]>;

/**
 * Rows already in discovery_content (the admin-curated Inspiration Library),
 * used to top an edition up when live search is thin or unconfigured.
 *
 * Deliberately NOT a DiscoveryProvider any more. As a provider it competed for
 * query slots and was then destroyed by the recency filter along with the web
 * results, which is how the "a run with zero external providers still produces
 * a batch" guarantee quietly died. It is a second tier, applied after ranking.
 */
export function createEvergreenFill(load: CuratedLoader): CuratedLoader {
  return async (limit: number) => {
    try {
      return await load(limit);
    } catch (error) {
      console.warn("[discovery] evergreen fill failed:", error);
      return [];
    }
  };
}

// ---------------------------------------------------------------------------
// Exa — neural/semantic search with a real published-date filter.
// ---------------------------------------------------------------------------

interface ExaHit {
  url?: string;
  title?: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  summary?: string;
}

/**
 * Exa search body.
 *
 * Exa filters on the real publication date, so we hand it exactly the
 * admission window this app already uses and the two cannot disagree.
 *
 * No `contents` is requested. Page text, summaries and highlights all cost extra
 * per result, and the design here is deliberately zero-fetch until the user
 * presses Analyze — the per-item "why this" line is written later from metadata.
 */
export function exaSearchBody(
  query: DiscoveryQuery,
  limit: number,
  now = Date.now(),
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    query: query.query,
    numResults: Math.min(25, Math.max(1, limit)),
    type: "auto",
    startPublishedDate: publishedAfterIso(now),
  };
  // Only narrow by category where the intent is unambiguous. Forcing
  // category "news" onto every timely query would drop the operator blog posts
  // that are usually the better read, and yield is the scarce thing here.
  if (query.prefer === "research") body.category = "research paper";
  return body;
}

export function createExaProvider(apiKey: string): DiscoveryProvider {
  return {
    id: "exa",
    // Semantic search handles the evergreen half as well as the timely one.
    supports: () => true,
    maxQueriesPerRun: 6,
    async search(query, options) {
      const payload = await fetchJson(
        "https://api.exa.ai/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(exaSearchBody(query, options.limit)),
        },
        options.timeoutMs ?? 12000,
      );
      const hits = (payload as { results?: ExaHit[] } | null)?.results;
      if (!Array.isArray(hits)) return [];

      const out: DiscoveryResult[] = [];
      hits.forEach((hit, index) => {
        // publishedDate is ISO 8601 but nullable even with startPublishedDate
        // set; an undated hit is rejected downstream like any other.
        const result = toResult({
          url: hit?.url,
          title: hit?.title,
          description: hit?.summary,
          author: hit?.author,
          publishedAt: hit?.publishedDate,
          imageUrl: hit?.image,
          contentType: query.prefer === "research" ? "research" : undefined,
          providerId: "exa",
          rank: index,
          intent: query.intent,
          label: query.label,
        });
        if (result) out.push(result);
      });
      return out;
    },
  };
}

// ---------------------------------------------------------------------------
// YouTube Data API v3
// ---------------------------------------------------------------------------

/** Parse an ISO-8601 duration (PT1H2M3S) into seconds. */
export function parseIsoDuration(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const match = raw.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const [, d, h, m, s] = match;
  const seconds =
    Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
  return seconds > 0 ? seconds : null;
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
}

/** YouTube search params. `publishedAfter` is always the last 30 days. */
export function youTubeQueryParams(
  query: string,
  limit: number,
  apiKey: string,
  now = Date.now(),
): URLSearchParams {
  return new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(Math.min(15, Math.max(1, limit))),
    relevanceLanguage: "en",
    videoEmbeddable: "true",
    safeSearch: "moderate",
    key: apiKey,
    publishedAfter: publishedAfterIso(now),
  });
}

/**
 * YouTube search costs 100 quota units per call (default project quota is
 * 10,000/day), so maxQueriesPerRun is deliberately small. The follow-up
 * videos.list call that adds durations costs 1 unit for the whole page.
 */
export function createYouTubeProvider(apiKey: string): DiscoveryProvider {
  return {
    id: "youtube",
    supports: () => true,
    maxQueriesPerRun: 3,
    async search(query, options) {
      const timeout = options.timeoutMs ?? 12000;
      const params = youTubeQueryParams(query.query, options.limit, apiKey);
      const payload = await fetchJson(
        `https://www.googleapis.com/youtube/v3/search?${params}`,
        { headers: { Accept: "application/json" } },
        timeout,
      );
      const items = (payload as { items?: YouTubeSearchItem[] } | null)?.items;
      if (!Array.isArray(items)) return [];

      const byId = new Map<string, YouTubeSearchItem>();
      for (const item of items) {
        const id = item?.id?.videoId;
        if (typeof id === "string" && id) byId.set(id, item);
      }
      if (byId.size === 0) return [];

      // One extra unit buys durations for every hit — worth it for the cards.
      const durations = new Map<string, number>();
      const detail = await fetchJson(
        `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
          part: "contentDetails",
          id: [...byId.keys()].join(","),
          key: apiKey,
        })}`,
        { headers: { Accept: "application/json" } },
        timeout,
      );
      const detailItems = (detail as { items?: Array<{ id?: string; contentDetails?: { duration?: string } }> } | null)?.items;
      if (Array.isArray(detailItems)) {
        for (const item of detailItems) {
          const seconds = parseIsoDuration(item?.contentDetails?.duration);
          if (item?.id && seconds) durations.set(item.id, seconds);
        }
      }

      const out: DiscoveryResult[] = [];
      let rank = 0;
      for (const [id, item] of byId) {
        const thumbnails = item?.snippet?.thumbnails ?? {};
        const result = toResult({
          url: `https://youtube.com/watch?v=${id}`,
          title: item?.snippet?.title,
          description: item?.snippet?.description,
          publisher: item?.snippet?.channelTitle,
          author: item?.snippet?.channelTitle,
          publishedAt: item?.snippet?.publishedAt,
          imageUrl: thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url,
          contentType: "video",
          durationSeconds: durations.get(id) ?? null,
          language: "en",
          providerId: "youtube",
          rank: rank++,
          intent: query.intent,
          label: query.label,
        });
        // Shorts and clips rarely carry a real lesson; skip anything under 3 min.
        if (result && (result.durationSeconds === null || result.durationSeconds >= 180)) {
          out.push(result);
        }
      }
      return out;
    },
  };
}

/**
 * Build the live-search provider list from whatever credentials this deployment
 * actually has. May be empty — that is a legitimate deployment, and the
 * evergreen fill is what keeps an edition non-empty in that case.
 */
export function resolveProviders(
  env: {
    youTubeApiKey?: string | null;
    exaApiKey?: string | null;
  },
): DiscoveryProvider[] {
  const providers: DiscoveryProvider[] = [];
  if (env.exaApiKey) providers.push(createExaProvider(env.exaApiKey));
  if (env.youTubeApiKey) providers.push(createYouTubeProvider(env.youTubeApiKey));
  return providers;
}
