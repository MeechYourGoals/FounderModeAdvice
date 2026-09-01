import assert from "node:assert/strict";
import {
  MAX_CONTENT_AGE_DAYS,
  MAX_FUTURE_CLOCK_SKEW_MS,
  contentAgeDays,
  filterBriefingEligible,
  filterRecentResults,
  isBriefingEligible,
  isRecentEnough,
  publishedAfterIso,
} from "./recency.ts";

const NOW = Date.parse("2026-08-21T12:00:00Z");
const isoDaysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

Deno.test("MAX_CONTENT_AGE_DAYS is the briefing window", () => {
  assert.equal(MAX_CONTENT_AGE_DAYS, 365);
});

Deno.test("isRecentEnough — accepts items inside the window", () => {
  for (const days of [0, 1, 7, 29, 30, 180, 364, 365]) {
    assert.equal(isRecentEnough(isoDaysAgo(days), NOW), true, `${days} days ago should be accepted`);
  }
});

Deno.test("isRecentEnough — enforces the exact timestamp boundary", () => {
  assert.equal(isRecentEnough(new Date(NOW - MAX_CONTENT_AGE_DAYS * 86_400_000 - 1_000).toISOString(), NOW), false);
  assert.equal(isRecentEnough(isoDaysAgo(366), NOW), false);
  assert.equal(isRecentEnough(isoDaysAgo(3_650), NOW), false);
});

Deno.test("isRecentEnough — rejects older, future, missing, and unparseable dates", () => {
  assert.equal(isRecentEnough(isoDaysAgo(400), NOW), false);
  assert.equal(isRecentEnough(isoDaysAgo(4000), NOW), false);
  assert.equal(isRecentEnough(new Date(NOW + MAX_FUTURE_CLOCK_SKEW_MS).toISOString(), NOW), true);
  assert.equal(isRecentEnough(new Date(NOW + MAX_FUTURE_CLOCK_SKEW_MS + 1).toISOString(), NOW), false);
  assert.equal(isRecentEnough(null, NOW), false);
  assert.equal(isRecentEnough(undefined, NOW), false);
  assert.equal(isRecentEnough("", NOW), false);
  assert.equal(isRecentEnough("not a date", NOW), false);
});

Deno.test("filterRecentResults — drops undated and stale hits", () => {
  const kept = filterRecentResults(
    [
      { publishedAt: isoDaysAgo(10) },
      { publishedAt: isoDaysAgo(400) },
      { publishedAt: null },
    ],
    NOW,
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0].publishedAt, isoDaysAgo(10));
});

Deno.test("publishedAfterIso — is exactly MAX_CONTENT_AGE_DAYS behind now", () => {
  assert.equal(publishedAfterIso(NOW), isoDaysAgo(MAX_CONTENT_AGE_DAYS));
  assert.equal(contentAgeDays(publishedAfterIso(NOW), NOW), MAX_CONTENT_AGE_DAYS);
});

Deno.test("isBriefingEligible — curated material never expires", () => {
  // The Inspiration Library is editorial and timeless. Applying the recency
  // window to it is what emptied every briefing.
  assert.equal(isBriefingEligible({ publishedAt: isoDaysAgo(8_000), recencyBasis: "evergreen" }, NOW), true);
  assert.equal(isBriefingEligible({ publishedAt: null, recencyBasis: "evergreen" }, NOW), true);
});

Deno.test("isBriefingEligible — an undated discovered hit is never admitted", () => {
  // Not even from a date-constrained vendor query. Admitting one would persist
  // a row with published_at = null, which is unservable under
  // is_discovery_content_servable — so it would be counted in item_count and
  // the refresh toast while being invisible on the page.
  assert.equal(isBriefingEligible({ publishedAt: null, recencyBasis: "published_at" }, NOW), false);
  assert.equal(isBriefingEligible({ publishedAt: null }, NOW), false);
  assert.equal(isBriefingEligible({ publishedAt: isoDaysAgo(400), recencyBasis: "published_at" }, NOW), false);
  assert.equal(isBriefingEligible({ publishedAt: isoDaysAgo(10), recencyBasis: "published_at" }, NOW), true);
});

Deno.test("filterBriefingEligible — admits dated finds and the library, drops the rest", () => {
  const kept = filterBriefingEligible(
    [
      { publishedAt: isoDaysAgo(10), recencyBasis: "published_at" as const },
      { publishedAt: isoDaysAgo(7_000), recencyBasis: "evergreen" as const },
      { publishedAt: isoDaysAgo(400), recencyBasis: "published_at" as const },
      { publishedAt: null, recencyBasis: "published_at" as const },
    ],
    NOW,
  );
  assert.deepEqual(kept.map((result) => result.recencyBasis), ["published_at", "evergreen"]);
});
