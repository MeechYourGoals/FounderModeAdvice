/**
 * Client response-boundary safeguard for Daily Brief content.
 *
 * Mirrors the server rule so the two can never drift. Two separate questions
 * live here:
 *
 *   isDailyBriefContentFresh   — is this DISCOVERED item recent enough?
 *                                (public.is_daily_brief_content_fresh)
 *   isDailyBriefContentServable — are we willing to show this row at all?
 *                                (public.is_discovery_content_servable)
 *
 * Curated library rows are editorial and do not expire, which is why the
 * Inspiration Library can carry essays from 2004. Everything else must carry a
 * real, parseable, in-window publication date — an undated or stale discovered
 * row is still refused here exactly as before.
 */
export const DAILY_BRIEF_MAX_CONTENT_AGE_DAYS = 365;
export const DAILY_BRIEF_MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MS_PER_DAY = 86_400_000;

export function dailyBriefPublishedAfterIso(now = Date.now()): string {
  return new Date(now - DAILY_BRIEF_MAX_CONTENT_AGE_DAYS * MS_PER_DAY).toISOString();
}

export function isDailyBriefContentFresh(
  publishedAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (typeof publishedAt !== "string" || !publishedAt.trim()) return false;
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return false;
  return timestamp >= now - DAILY_BRIEF_MAX_CONTENT_AGE_DAYS * MS_PER_DAY &&
    timestamp <= now + DAILY_BRIEF_MAX_FUTURE_CLOCK_SKEW_MS;
}

export function filterFreshDailyBriefContent<T extends { published_at: string | null }>(
  items: T[],
  now = Date.now(),
): T[] {
  return items.filter((item) => isDailyBriefContentFresh(item.published_at, now));
}

/** A row the app may render: curated (timeless) or a genuinely recent find. */
export function isDailyBriefContentServable(
  item: { published_at: string | null; is_curated?: boolean | null },
  now = Date.now(),
): boolean {
  return item.is_curated === true || isDailyBriefContentFresh(item.published_at, now);
}

export function filterServableDailyBriefContent<
  T extends { published_at: string | null; is_curated?: boolean | null },
>(items: T[], now = Date.now()): T[] {
  return items.filter((item) => isDailyBriefContentServable(item, now));
}
