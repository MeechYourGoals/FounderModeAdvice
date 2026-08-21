import assert from "node:assert/strict";
import {
  MAX_CONTENT_AGE_DAYS,
  contentAgeDays,
  filterRecentResults,
  isRecentEnough,
  publishedAfterIso,
} from "./recency.ts";

const NOW = Date.parse("2026-08-21T12:00:00Z");
const isoDaysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

Deno.test("MAX_CONTENT_AGE_DAYS is the briefing window", () => {
  assert.equal(MAX_CONTENT_AGE_DAYS, 30);
});

Deno.test("isRecentEnough — accepts items from the last 30 days", () => {
  assert.equal(isRecentEnough(isoDaysAgo(0), NOW), true);
  assert.equal(isRecentEnough(isoDaysAgo(7), NOW), true);
  assert.equal(isRecentEnough(isoDaysAgo(30), NOW), true);
});

Deno.test("isRecentEnough — rejects older, future, missing, and unparseable dates", () => {
  assert.equal(isRecentEnough(isoDaysAgo(31), NOW), false);
  assert.equal(isRecentEnough(isoDaysAgo(4000), NOW), false);
  assert.equal(isRecentEnough(new Date(NOW + 86_400_000).toISOString(), NOW), false);
  assert.equal(isRecentEnough(null, NOW), false);
  assert.equal(isRecentEnough(undefined, NOW), false);
  assert.equal(isRecentEnough("", NOW), false);
  assert.equal(isRecentEnough("not a date", NOW), false);
});

Deno.test("filterRecentResults — drops undated and stale hits", () => {
  const kept = filterRecentResults(
    [
      { publishedAt: isoDaysAgo(10) },
      { publishedAt: isoDaysAgo(40) },
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
