/** Client response-boundary safeguard for Daily Brief content. */
export const DAILY_BRIEF_MAX_CONTENT_AGE_DAYS = 30;
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
