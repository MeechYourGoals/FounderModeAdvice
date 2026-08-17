// Client-side Discover logic. Runs under the same Deno test task as the edge
// modules (see deno.json); assertions come from node:assert so no network or
// DOM is required.
import assert from "node:assert/strict";
import {
  buildAnalyzeRequest,
  contentTypeLabel,
  DISCOVERY_CATEGORIES,
  editionLabel,
  formatDuration,
  hasDiscoveryAccess,
  nextStateAfterSaveToggle,
  profileNeedsMoreContext,
} from "@/lib/discovery.ts";

Deno.test("entitlement — only the Boardroom tier gets personalized discovery", () => {
  assert.equal(hasDiscoveryAccess("series_z"), true);
  assert.equal(hasDiscoveryAccess("seed"), false);
  assert.equal(hasDiscoveryAccess("free"), false);
  assert.equal(hasDiscoveryAccess(undefined), false);
  assert.equal(hasDiscoveryAccess(null), false);
});

Deno.test("Analyze hand-off — carries the URL, the profile, and the recommendation", () => {
  const request = buildAnalyzeRequest({
    url: "https://youtube.com/watch?v=UF8uR6Z6KLc",
    profileId: "profile-rocket",
    recommendationId: "rec-1",
  });
  assert.deepEqual(request, {
    url: "https://youtube.com/watch?v=UF8uR6Z6KLc",
    profileId: "profile-rocket",
    recommendationId: "rec-1",
  });
});

Deno.test("Analyze hand-off — universal mode keeps a null profile, not a missing key", () => {
  const request = buildAnalyzeRequest({ url: "https://example.com/a", profileId: null });
  assert.equal(request!.profileId, null);
  assert.equal("recommendationId" in request!, false);
});

Deno.test("Analyze hand-off — refuses anything that is not a public http(s) URL", () => {
  assert.equal(buildAnalyzeRequest({ url: "", profileId: null }), null);
  assert.equal(buildAnalyzeRequest({ url: "   ", profileId: null }), null);
  assert.equal(buildAnalyzeRequest({ url: "not a url", profileId: null }), null);
  assert.equal(buildAnalyzeRequest({ url: "javascript:alert(1)", profileId: null }), null);
  assert.equal(buildAnalyzeRequest({ url: "file:///etc/passwd", profileId: null }), null);
});

Deno.test("save toggle — flips between saved and viewed, and is idempotent in pairs", () => {
  assert.equal(nextStateAfterSaveToggle("unseen"), "saved");
  assert.equal(nextStateAfterSaveToggle("viewed"), "saved");
  assert.equal(nextStateAfterSaveToggle("analyzed"), "saved");
  assert.equal(nextStateAfterSaveToggle("saved"), "viewed");
  assert.equal(nextStateAfterSaveToggle(nextStateAfterSaveToggle("saved")), "saved");
});

Deno.test("formatDuration — minutes, hours, and unknown", () => {
  assert.equal(formatDuration(1680), "28 min");
  assert.equal(formatDuration(3600), "1h");
  assert.equal(formatDuration(4320), "1h 12m");
  assert.equal(formatDuration(0), null);
  assert.equal(formatDuration(null), null);
  assert.equal(formatDuration(undefined), null);
  assert.equal(formatDuration(Number.NaN), null);
});

Deno.test("contentTypeLabel — every stored type has a human label", () => {
  assert.equal(contentTypeLabel("video"), "Video");
  assert.equal(contentTypeLabel("research"), "Research");
  assert.equal(contentTypeLabel(null), "Resource");
  assert.equal(contentTypeLabel("something-new"), "Resource");
});

Deno.test("editionLabel — falls back rather than rendering Invalid Date", () => {
  assert.equal(editionLabel(null), "This week");
  assert.equal(editionLabel("garbage"), "This week");
  assert.ok(editionLabel("2026-08-17T00:00:00Z").length > 0);
});

Deno.test("profileNeedsMoreContext — nudges only genuinely thin profiles", () => {
  assert.equal(profileNeedsMoreContext({ description: "Rockets.", industry: null }), true);
  assert.equal(profileNeedsMoreContext({ description: "", industry: null }), true);
  assert.equal(profileNeedsMoreContext({ description: "Rockets.", industry: "Aerospace" }), false);
  assert.equal(
    profileNeedsMoreContext({
      description: "We build reusable launch vehicles for small satellite operators.",
      industry: null,
    }),
    false,
  );
  assert.equal(profileNeedsMoreContext(null), false);
});

Deno.test("category vocabulary — unique, non-empty, and covers the disciplines Discover filters on", () => {
  assert.equal(new Set(DISCOVERY_CATEGORIES).size, DISCOVERY_CATEGORIES.length);
  assert.ok(DISCOVERY_CATEGORIES.every((c) => c.trim().length > 0));
  for (const expected of ["Startups", "Aerospace / Space", "Healthcare / Medicine", "Creator Economy"]) {
    assert.ok(DISCOVERY_CATEGORIES.includes(expected as never), expected);
  }
});
