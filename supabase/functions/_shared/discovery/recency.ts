// Briefing recency.
//
// Discover → For You only shows material published in the last 30 days.
// Search APIs get the same window as a hint; this module is the source of
// truth used after results come back, because vendor freshness flags are
// best-effort and evergreen queries used to skip them entirely.

/** Hard cap for briefing content age. Older items never enter an edition. */
export const MAX_CONTENT_AGE_DAYS = 30;

const MS_PER_DAY = 86_400_000;

export function contentAgeDays(publishedAt: string, now = Date.now()): number {
  return (now - new Date(publishedAt).getTime()) / MS_PER_DAY;
}

/**
 * Whether a publication date is usable in a briefing. Undated hits are
 * rejected — missing dates are how months-old pages used to sneak through.
 */
export function isRecentEnough(publishedAt: string | null | undefined, now = Date.now()): boolean {
  if (typeof publishedAt !== "string" || !publishedAt.trim()) return false;
  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) return false;
  const ageDays = (now - parsed.getTime()) / MS_PER_DAY;
  return ageDays >= 0 && ageDays <= MAX_CONTENT_AGE_DAYS;
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
