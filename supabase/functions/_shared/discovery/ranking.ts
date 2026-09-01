// Candidate ranking.
//
// Search engines rank for the query; we rank for the person. Every candidate
// gets a breakdown so a recommendation can be explained (and debugged) later:
//
//   score = relevance + freshness + sourceQuality + profileFit + actionability
//         - duplicationPenalty - previouslySeenPenalty - lowQualityPenalty
//
// Selection then applies diversity constraints, so ten results about the same
// news story can never become ten cards.

import type { RecommendationContext } from "./context.ts";
import type { DiscoveryResult } from "./providers.ts";
import { MAX_CONTENT_AGE_DAYS, contentAgeDays } from "./recency.ts";
import { hostOf, titleSimilarity, titleTokens } from "./url.ts";

export interface ScoreBreakdown {
  relevance: number;
  freshness: number;
  sourceQuality: number;
  profileFit: number;
  actionability: number;
  previouslySeenPenalty: number;
  lowQualityPenalty: number;
  total: number;
}

export interface ScoredCandidate {
  result: DiscoveryResult;
  breakdown: ScoreBreakdown;
}

const WEIGHTS = {
  relevance: 3.0,
  freshness: 1.2,
  sourceQuality: 1.5,
  profileFit: 2.0,
  actionability: 1.0,
  previouslySeen: 4.0,
  lowQuality: 2.0,
} as const;

/** Publishers and creators whose primary reporting is worth an extra nudge. */
const QUALITY_HOSTS: Record<string, number> = {
  "paulgraham.com": 1, "stratechery.com": 1, "svpg.com": 0.95, "kk.org": 0.9,
  "blog.samaltman.com": 0.95, "steveblank.com": 0.9, "cdixon.org": 0.9,
  "joelonsoftware.com": 0.9, "avc.com": 0.85, "danluu.com": 0.85,
  "ycombinator.com": 0.95, "a16z.com": 0.85, "firstround.com": 0.9,
  "lennysnewsletter.com": 0.9, "arxiv.org": 0.95, "nature.com": 0.95,
  "science.org": 0.95, "nber.org": 0.9, "hbr.org": 0.9, "sloanreview.mit.edu": 0.9,
  "youtube.com": 0.75, "ted.com": 0.85, "nytimes.com": 0.85, "wsj.com": 0.85,
  "ft.com": 0.85, "economist.com": 0.85, "bloomberg.com": 0.85, "reuters.com": 0.85,
  "apnews.com": 0.85, "theverge.com": 0.8, "arstechnica.com": 0.85,
  "techcrunch.com": 0.75, "wired.com": 0.8, "nasa.gov": 0.95, "sec.gov": 0.95,
};

/** Aggregators and republishers — down-weighted, never excluded. */
const LOW_VALUE_HOSTS = new Set([
  "medium.com", "linkedin.com", "reddit.com", "quora.com", "pinterest.com",
  "slideshare.net", "scribd.com", "issuu.com", "prnewswire.com",
  "businesswire.com", "globenewswire.com", "einpresswire.com", "yahoo.com",
  "msn.com", "news.google.com", "flipboard.com",
]);

/** Title shapes that reliably carry a transferable lesson. */
const ACTIONABLE_PATTERNS = [
  /\blessons?\b/i, /\bplaybook\b/i, /\bcase stud(?:y|ies)\b/i, /\bhow (?:we|they|i|to)\b/i,
  /\bframework\b/i, /\bteardown\b/i, /\bbreakdown\b/i, /\binterview\b/i,
  /\bwhat (?:we|i) learned\b/i, /\bpostmortem\b/i, /\bdeep dive\b/i,
  /\bstrategy\b/i, /\bbenchmarks?\b/i, /\bguide\b/i,
];

/** Title shapes that are usually announcements, not lessons. */
const LOW_SIGNAL_PATTERNS = [
  /\bpress release\b/i, /\bannounces?\b/i, /\bnow available\b/i, /\bwebinar\b/i,
  /\bsponsored\b/i, /\btop \d+ (?:tools|apps|plugins)\b/i, /\bcoupon\b/i,
  /\bjob (?:opening|posting)\b/i, /\bhiring now\b/i,
];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Every distinctive term the profile gives us, lowercased. */
export function contextTerms(ctx: RecommendationContext): string[] {
  const raw = [
    ...ctx.subindustries,
    ...ctx.technologies,
    ...ctx.customers,
    ...ctx.relevantTopics,
    ...ctx.categories,
    ...(ctx.industry ? ctx.industry.split(/[/,&]/) : []),
    ...(ctx.businessModel ? [ctx.businessModel] : []),
    // The company's own name is never a search term — searching it returns news
    // about them, not material to learn from — but a result that does mention
    // them is genuinely more relevant, so it counts here.
    ...(ctx.companyName ? [ctx.companyName] : []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of raw) {
    const clean = term.trim().toLowerCase();
    if (clean.length < 3 || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

/**
 * How strongly the candidate text maps to the profile's own vocabulary,
 * blended with the provider's ordering (which encodes query relevance).
 */
export function relevanceScore(result: DiscoveryResult, terms: string[]): number {
  const haystack = `${result.title} ${result.description ?? ""}`.toLowerCase();
  if (terms.length === 0) return 0.4;

  let hits = 0;
  for (const term of terms) {
    if (term.includes(" ")) {
      if (haystack.includes(term)) hits += 1.5; // phrase matches are stronger
    } else if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack)) {
      hits += 1;
    }
  }
  const termScore = clamp01(hits / Math.min(6, Math.max(3, terms.length / 2)));
  // Provider rank decay: first hit 1.0, tenth ~0.5.
  const rankScore = 1 / (1 + result.rank * 0.1);
  return clamp01(termScore * 0.7 + rankScore * 0.3);
}

/**
 * Recency inside the 30-day briefing window. Age is scored the same for timely
 * and evergreen intents — a lesson from last week still outranks one from day 28.
 * Items older than the window (or undated) score 0; they should already have
 * been filtered out before ranking.
 */
/** Full credit for anything published in the last week. */
const FRESHNESS_FULL_CREDIT_DAYS = 7;
/**
 * Where the steep part of the curve ends. Deliberately decoupled from
 * MAX_CONTENT_AGE_DAYS: admission runs to a year, but if the decay stretched
 * over that whole span a two-day-old article would barely outrank a six-month-
 * old one, and "timely" would stop meaning anything. Recency discriminates
 * sharply inside the first month, then fades gently across the rest.
 */
const FRESHNESS_DECAY_DAYS = 30;
/** Score still left at FRESHNESS_DECAY_DAYS, spent over the remaining window. */
const FRESHNESS_TAIL = 0.15;

export function freshnessScore(result: DiscoveryResult, now: number): number {
  if (!result.publishedAt) return 0;
  const ageDays = contentAgeDays(result.publishedAt, now);
  if (ageDays < 0) return 0.5;
  if (ageDays > MAX_CONTENT_AGE_DAYS) return 0;
  if (ageDays <= FRESHNESS_FULL_CREDIT_DAYS) return 1;
  if (ageDays <= FRESHNESS_DECAY_DAYS) {
    const spanned = (ageDays - FRESHNESS_FULL_CREDIT_DAYS) /
      (FRESHNESS_DECAY_DAYS - FRESHNESS_FULL_CREDIT_DAYS);
    return clamp01(1 - spanned * (1 - FRESHNESS_TAIL));
  }
  const tailSpanned = (ageDays - FRESHNESS_DECAY_DAYS) /
    (MAX_CONTENT_AGE_DAYS - FRESHNESS_DECAY_DAYS);
  return clamp01(FRESHNESS_TAIL * (1 - tailSpanned));
}

export function sourceQualityScore(result: DiscoveryResult): number {
  const host = hostOf(result.canonicalUrl) ?? "";
  let score = QUALITY_HOSTS[host] ?? (LOW_VALUE_HOSTS.has(host) ? 0.35 : 0.55);
  // Subdomain match for newsletter/blog platforms, e.g. foo.substack.com.
  if (!(host in QUALITY_HOSTS) && host.endsWith(".substack.com")) score = 0.7;
  if (result.contentType === "research") score = Math.max(score, 0.85);
  if (result.description && result.description.length > 120) score += 0.05;
  if (!result.imageUrl) score -= 0.05;
  return clamp01(score);
}

/** Overlap between the candidate's carried label and the profile's own areas. */
export function profileFitScore(result: DiscoveryResult, ctx: RecommendationContext): number {
  const haystack = `${result.title} ${result.description ?? ""} ${result.label ?? ""}`.toLowerCase();
  const buckets = [...ctx.categories, ...ctx.relevantTopics].map((c) => c.toLowerCase());
  if (buckets.length === 0) return 0.4;
  let matched = 0;
  for (const bucket of buckets) {
    const head = bucket.split(/[\s/]/)[0];
    if (head.length > 2 && haystack.includes(head)) matched += 1;
  }
  const labelBonus = result.label && buckets.includes(result.label.toLowerCase()) ? 0.25 : 0;
  return clamp01(matched / Math.min(4, buckets.length) * 0.75 + labelBonus);
}

export function actionabilityScore(result: DiscoveryResult): number {
  const title = result.title;
  let score = 0.45;
  if (ACTIONABLE_PATTERNS.some((p) => p.test(title))) score += 0.35;
  if (LOW_SIGNAL_PATTERNS.some((p) => p.test(title))) score -= 0.35;
  if (result.contentType === "essay" || result.contentType === "research") score += 0.1;
  // Very long videos are a real commitment; very short ones rarely say much.
  if (result.contentType === "video" && result.durationSeconds !== null) {
    if (result.durationSeconds < 300) score -= 0.1;
    if (result.durationSeconds > 9000) score -= 0.1;
  }
  return clamp01(score);
}

export interface ScoreOptions {
  /** content_keys already recommended to this profile. */
  seenContentKeys: Set<string>;
  now?: number;
}

export function scoreCandidate(
  result: DiscoveryResult,
  ctx: RecommendationContext,
  terms: string[],
  options: ScoreOptions,
): ScoredCandidate {
  const now = options.now ?? Date.now();
  const relevance = relevanceScore(result, terms);
  const freshness = freshnessScore(result, now);
  const sourceQuality = sourceQualityScore(result);
  const profileFit = profileFitScore(result, ctx);
  const actionability = actionabilityScore(result);

  const previouslySeen = options.seenContentKeys.has(result.contentKey) ? 1 : 0;
  // Thin metadata is a weak signal that the page itself is thin.
  const lowQuality = !result.description || result.description.length < 60 ? 0.5 : 0;

  const total =
    relevance * WEIGHTS.relevance +
    freshness * WEIGHTS.freshness +
    sourceQuality * WEIGHTS.sourceQuality +
    profileFit * WEIGHTS.profileFit +
    actionability * WEIGHTS.actionability -
    previouslySeen * WEIGHTS.previouslySeen -
    lowQuality * WEIGHTS.lowQuality;

  return {
    result,
    breakdown: {
      relevance: Number(relevance.toFixed(3)),
      freshness: Number(freshness.toFixed(3)),
      sourceQuality: Number(sourceQuality.toFixed(3)),
      profileFit: Number(profileFit.toFixed(3)),
      actionability: Number(actionability.toFixed(3)),
      previouslySeenPenalty: previouslySeen * WEIGHTS.previouslySeen,
      lowQualityPenalty: lowQuality * WEIGHTS.lowQuality,
      total: Number(total.toFixed(3)),
    },
  };
}

/**
 * Collapse exact duplicates by content key, keeping the highest-scoring copy.
 * Runs before near-duplicate suppression, which is comparatively expensive.
 */
export function dedupeByKey(candidates: ScoredCandidate[]): ScoredCandidate[] {
  const best = new Map<string, ScoredCandidate>();
  for (const candidate of candidates) {
    const existing = best.get(candidate.result.contentKey);
    if (!existing || candidate.breakdown.total > existing.breakdown.total) {
      best.set(candidate.result.contentKey, candidate);
    }
  }
  return [...best.values()];
}

export interface SelectionOptions {
  limit: number;
  /** Max items from any single host, so one publisher can't own the edition. */
  maxPerHost?: number;
  /** Max items of any one content type, to keep the format mix varied. */
  maxPerContentType?: number;
  /** Titles this similar to an already-picked item are treated as the same story. */
  titleSimilarityThreshold?: number;
}

/**
 * Greedy selection under diversity constraints. Candidates are considered
 * best-first; a candidate is skipped when it would breach a host/type cap or
 * is a near-duplicate of something already picked. Caps are relaxed at the end
 * if that is the only way to fill the edition.
 */
export function selectRecommendations(
  candidates: ScoredCandidate[],
  options: SelectionOptions,
): ScoredCandidate[] {
  const limit = Math.max(1, options.limit);
  const maxPerHost = options.maxPerHost ?? 2;
  const maxPerType = options.maxPerContentType ?? 5;
  const threshold = options.titleSimilarityThreshold ?? 0.6;

  const ordered = dedupeByKey(candidates).sort((a, b) => b.breakdown.total - a.breakdown.total);

  const picked: ScoredCandidate[] = [];
  const hostCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const skipped: ScoredCandidate[] = [];

  const isNearDuplicate = (candidate: ScoredCandidate): boolean =>
    picked.some((p) => titleSimilarity(p.result.title, candidate.result.title) >= threshold);

  for (const candidate of ordered) {
    if (picked.length >= limit) break;
    const host = hostOf(candidate.result.canonicalUrl) ?? "unknown";
    const type = candidate.result.contentType;

    if ((hostCounts.get(host) ?? 0) >= maxPerHost || (typeCounts.get(type) ?? 0) >= maxPerType) {
      skipped.push(candidate);
      continue;
    }
    if (isNearDuplicate(candidate)) continue; // same story — never relax this

    picked.push(candidate);
    hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1);
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  // Backfill from cap-limited candidates rather than shipping a short edition.
  for (const candidate of skipped) {
    if (picked.length >= limit) break;
    if (isNearDuplicate(candidate)) continue;
    picked.push(candidate);
  }

  return picked;
}

/** Distinct-word count of a title — used by tests and diagnostics. */
export const titleWordCount = (title: string): number => titleTokens(title).length;
