import assert from "node:assert/strict";
import {
  DAILY_BRIEF_MAX_FUTURE_CLOCK_SKEW_MS,
  filterFreshDailyBriefContent,
  isDailyBriefContentFresh,
} from "./dailyBriefFreshness.ts";

const NOW = Date.parse("2026-08-29T12:00:00Z");
const ago = (milliseconds: number) => new Date(NOW - milliseconds).toISOString();

Deno.test("Daily Brief response boundary accepts only trustworthy dates in the 30-day window", () => {
  const day = 86_400_000;
  for (const age of [day, 29 * day, 30 * day]) assert.equal(isDailyBriefContentFresh(ago(age), NOW), true);
  for (const age of [30 * day + 1_000, 31 * day, 365 * day, 3_650 * day]) {
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
    { id: "existing-stale", published_at: ago(90 * 86_400_000) },
    { id: "existing-undated", published_at: null },
  ], NOW);
  assert.deepEqual(rows.map((row) => row.id), ["existing-fresh"]);
});
