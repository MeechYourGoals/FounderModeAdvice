// Briefing recency.
//
// Discover → For You prefers recent material, but "recent" is not the same
// question as "may we show this at all". Two predicates, deliberately separate:
//
//   isRecentEnough      — does this DISCOVERED item carry a real, in-window date?
//   isBriefingEligible  — may this candidate enter an edition?
//
// The second is wider because a date is not the only evidence of recency. A hit
// returned by a query that was itself constrained to the past month is recent by
// construction, even when the vendor omits a date — and the curated library is
// editorial, timeless, and never expires. Both cases are recorded on the
// candidate as a `recencyBasis` so the reason is explicit rather than implied.
//
// Mirrors public.is_daily_brief_content_fresh / is_discovery_content_servable.

/** Upper bound on the age of a DATED discovered item. */
export const MAX_CONTENT_AGE_DAYS = 365;
/** Providers occasionally timestamp a release a few minutes ahead of our clock. */
export const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

const MS_PER_DAY = 86_400_000;

/**
 * How we know a candidate is worth showing.
 *   published_at    — it carries its own date, and that date is the authority
 *   provider_window — undated, but the query that found it was date-constrained
 *   evergreen       — curated editorial material; age is not a defect
 */
export type RecencyBasis = "published_at" | "provider_window" | "evergreen";

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
 * Admission rule for a briefing edition.
 *
 * An explicit date always wins: a hit that came back from a past-month query but
 * carries a 2019 timestamp is still rejected. The window only rescues candidates
 * with no contradicting evidence.
 */
export function isBriefingEligible(
  result: { publishedAt: string | null; recencyBasis?: RecencyBasis },
  now = Date.now(),
): boolean {
  if (result.recencyBasis === "evergreen") return true;
  if (result.publishedAt) return isRecentEnough(result.publishedAt, now);
  return result.recencyBasis === "provider_window";
}

export function filterBriefingEligible<
  T extends { publishedAt: string | null; recencyBasis?: RecencyBasis },
>(results: T[], now = Date.now()): T[] {
  return results.filter((result) => isBriefingEligible(result, now));
}
