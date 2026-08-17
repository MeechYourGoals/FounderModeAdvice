// Weekly edition keys.
//
// A user in UTC+13 and a user in UTC-8 must land in the same edition, so the
// key is always computed from UTC. Format matches
// public.discovery_week_key() in SQL: to_char(ts AT TIME ZONE 'UTC', 'IYYY-"W"IW').

/**
 * ISO-8601 week key, e.g. "2026-W34". ISO weeks start Monday, and week 1 is
 * the week containing the first Thursday of the year — which is why the year
 * part can differ from the calendar year at a year boundary.
 */
export function isoWeekKey(at: Date = new Date()): string {
  // Work on a UTC copy so local time can never shift the day.
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  // Shift to the Thursday of this ISO week; its calendar year is the ISO year.
  const dayNumber = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNumber + 3);
  const isoYear = d.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNumber + 3);

  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
