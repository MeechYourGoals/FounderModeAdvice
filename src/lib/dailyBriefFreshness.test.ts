import assert from "node:assert/strict";
import {
  DAILY_BRIEF_MAX_CONTENT_AGE_DAYS,
  DAILY_BRIEF_MAX_FUTURE_CLOCK_SKEW_MS,
  filterFreshDailyBriefContent,
  filterServableDailyBriefContent,
  isDailyBriefContentFresh,
  isDailyBriefContentServable,
} from "./dailyBriefFreshness.ts";

const NOW = Date.parse("2026-08-29T12:00:00Z");
const ago = (milliseconds: number) => new Date(NOW - milliseconds).toISOString();

Deno.test("client window matches the server's is_daily_brief_content_fresh", () => {
  assert.equal(DAILY_BRIEF_MAX_CONTENT_AGE_DAYS, 365);
});

Deno.test("Daily Brief response boundary accepts only trustworthy dates in the window", () => {
  const day = 86_400_000;
  for (const age of [day, 29 * day, 30 * day, 180 * day, 365 * day]) {
    assert.equal(isDailyBriefContentFresh(ago(age), NOW), true);
  }
  for (const age of [365 * day + 1_000, 366 * day, 3_650 * day]) {
    assert.equal(isDailyBriefContentFresh(ago(age), NOW), false);
  }
  assert.equal(isDailyBriefContentFresh(null, NOW), false);
  assert.equal(isDailyBriefContentFresh("not-a-date", NOW), false);
});

Deno.test("Daily Brief response boundary allows only the configured future clock skew", () => {
  assert.equal(isDailyBriefContentFresh(new Date(NOW + DAILY_BRIEF_MAX_FUTURE_CLOCK_SKEW_MS).toISOString(), NOW), true);
  assert.equal(isDailyBriefContentFresh(new Date(NOW + DAILY_BRIEF_MAX_FUTURE_CLOCK_SKEW_MS + 1).toISOString(), NOW), false);
});

Deno.test("persisted stale recommendations cannot pass the client response boundary", () => {
  const rows = filterFreshDailyBriefContent([
    { id: "existing-fresh", published_at: ago(2 * 86_400_000) },
    { id: "existing-stale", published_at: ago(900 * 86_400_000) },
    { id: "existing-undated", published_at: null },
  ], NOW);
  assert.deepEqual(rows.map((row) => row.id), ["existing-fresh"]);
});

Deno.test("servability — curated library rows do not expire", () => {
  // Mirrors public.is_discovery_content_servable. The Inspiration Library
  // carries essays from 2004 on purpose; the recency window is for discovered
  // news, and applying it to curated rows is what emptied the library.
  assert.equal(
    isDailyBriefContentServable({ published_at: ago(8_000 * 86_400_000), is_curated: true }, NOW),
    true,
  );
  assert.equal(isDailyBriefContentServable({ published_at: null, is_curated: true }, NOW), true);
});

Deno.test("servability — a stale or undated discovered row is still refused", () => {
  assert.equal(
    isDailyBriefContentServable({ published_at: ago(900 * 86_400_000), is_curated: false }, NOW),
    false,
  );
  assert.equal(isDailyBriefContentServable({ published_at: null, is_curated: false }, NOW), false);
  // Absent flag must not be read as curated.
  assert.equal(isDailyBriefContentServable({ published_at: null }, NOW), false);
  assert.equal(isDailyBriefContentServable({ published_at: ago(2 * 86_400_000) }, NOW), true);
});

Deno.test("filterServableDailyBriefContent — keeps the library and the fresh finds", () => {
  const rows = filterServableDailyBriefContent([
    { id: "fresh-find", published_at: ago(2 * 86_400_000), is_curated: false },
    { id: "old-essay", published_at: ago(8_000 * 86_400_000), is_curated: true },
    { id: "stale-find", published_at: ago(900 * 86_400_000), is_curated: false },
    { id: "undated-find", published_at: null, is_curated: false },
  ], NOW);
  assert.deepEqual(rows.map((row) => row.id), ["fresh-find", "old-essay"]);
});
