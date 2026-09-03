// Briefing recency.
//
// Discover → For You prefers recent material, but "recent" is not the same
// question as "may we show this at all". Two predicates, deliberately separate:
//
//   isRecentEnough      — does this DISCOVERED item carry a real, in-window date?
//   isBriefingEligible  — may this candidate enter an edition?
//
// The second is wider only for the curated library, which is editorial,
// timeless, and never expires. That exception is recorded on the candidate as a
// `recencyBasis` so the reason is explicit rather than implied.
//
// Undated DISCOVERED hits are never admitted, even from a query that was itself
// date-constrained. A vendor window is real evidence, but acting on it would
// persist a row with published_at = null, which is then unservable under
// is_discovery_content_servable — so the item would be counted in item_count
// and the refresh toast while being invisible on the page. Admitting undated
// hits needs a recency_basis column on discovery_content to carry the evidence
// into the serving rule; until that exists, rejecting them is the honest
// behaviour.
//
// Mirrors public.is_daily_brief_content_fresh / is_discovery_content_servable.

/** Upper bound on the age of a DATED discovered item. */
export const MAX_CONTENT_AGE_DAYS = 365;
/** Providers occasionally timestamp a release a few minutes ahead of our clock. */
export const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

const MS_PER_DAY = 86_400_000;

/**
 * How we know a candidate is worth showing.
 *   published_at — it carries its own date, and that date is the authority
 *   evergreen    — curated editorial material; age is not a defect
 */
export type RecencyBasis = "published_at" | "evergreen";

export function contentAgeDays(publishedAt: string, now = Date.now()): number {
  return (now - new Date(publishedAt).getTime()) / MS_PER_DAY;
}

/**
 * Whether a publication date is usable in a briefing. Undated hits fail here —
 * a missing date is not evidence of freshness, and this is what stops an
 * ancient page from being read as new.
 */
export function isRecentEnough(publishedAt: string | null | undefined, now = Date.now()): boolean {
  if (typeof publishedAt !== "string" || !publishedAt.trim()) return false;
  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) return false;
  const ageDays = (now - parsed.getTime()) / MS_PER_DAY;
  return parsed.getTime() <= now + MAX_FUTURE_CLOCK_SKEW_MS && ageDays <= MAX_CONTENT_AGE_DAYS;
}

/** ISO timestamp used as YouTube `publishedAfter` and curated `published_at` lower bound. */
export function publishedAfterIso(now = Date.now(), days = MAX_CONTENT_AGE_DAYS): string {
  return new Date(now - days * MS_PER_DAY).toISOString();
}

export function filterRecentResults<T extends { publishedAt: string | null }>(
  results: T[],
  now = Date.now(),
): T[] {
  return results.filter((result) => isRecentEnough(result.publishedAt, now));
}

/**
 * Admission rule for a briefing edition: curated material, or a discovered item
 * with its own in-window date. Nothing else.
 */
export function isBriefingEligible(
  result: { publishedAt: string | null; recencyBasis?: RecencyBasis },
  now = Date.now(),
): boolean {
  if (result.recencyBasis === "evergreen") return true;
  return isRecentEnough(result.publishedAt, now);
}

export function filterBriefingEligible<
  T extends { publishedAt: string | null; recencyBasis?: RecencyBasis },
>(results: T[], now = Date.now()): T[] {
  return results.filter((result) => isBriefingEligible(result, now));
}
