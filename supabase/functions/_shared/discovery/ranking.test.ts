import assert from "node:assert/strict";
import { buildRecommendationContext, type StartupProfileRow } from "./context.ts";
import type { DiscoveryResult } from "./providers.ts";
import { contentKey } from "./url.ts";
import {
  contextTerms,
  dedupeByKey,
  freshnessScore,
  relevanceScore,
  scoreCandidate,
  selectRecommendations,
  sourceQualityScore,
  type ScoredCandidate,
} from "./ranking.ts";

const NOW = Date.parse("2026-08-17T00:00:00Z");
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

const profile: StartupProfileRow = {
  id: "p1",
  user_id: "u1",
  company_name: "Astra Launch Systems",
  description:
    "Reusable launch vehicles for small satellite operators, with an in-house propulsion " +
    "team scaling additive manufacturing.",
  industry: "Hardware / Consumer Products",
  stage: "series_a",
  role: "CEO",
};
const ctx = buildRecommendationContext(profile);
const terms = contextTerms(ctx);

function candidate(overrides: Partial<DiscoveryResult> & { url: string; title: string }): DiscoveryResult {
  return {
    canonicalUrl: overrides.url,
    contentKey: contentKey(overrides.url)!,
    description: "A reasonably detailed description that clears the thin-metadata penalty threshold.",
    publisher: null,
    author: null,
    publishedAt: null,
    imageUrl: "https://example.com/img.jpg",
    contentType: "article",
    durationSeconds: null,
    language: "en",
    providerId: "brave_web",
    rank: 0,
    intent: "evergreen",
    ...overrides,
  } as DiscoveryResult;
}

const score = (c: DiscoveryResult, seen: string[] = []) =>
  scoreCandidate(c, ctx, terms, { seenContentKeys: new Set(seen), now: NOW });

Deno.test("relevance — profile vocabulary beats generic startup content", () => {
  const onTopic = candidate({
    url: "https://example.com/a",
    title: "Scaling additive manufacturing for rocket propulsion",
  });
  const offTopic = candidate({
    url: "https://example.com/b",
    title: "Five productivity tips for busy people",
  });
  assert.ok(relevanceScore(onTopic, terms) > relevanceScore(offTopic, terms));
});

Deno.test("freshness — age is scored the same for timely and evergreen", () => {
  const tenDayLesson = candidate({
    url: "https://example.com/lesson",
    title: "Launch industry manufacturing lessons",
    intent: "evergreen",
    publishedAt: daysAgo(10),
  });
  const twoDayNews = candidate({
    url: "https://example.com/news2",
    title: "Launch industry weekly roundup",
    intent: "timely",
    publishedAt: daysAgo(2),
  });
  const twentyFiveDayNews = candidate({
    url: "https://example.com/news",
    title: "Launch industry weekly roundup",
    intent: "timely",
    publishedAt: daysAgo(25),
  });
  const staleEssay = candidate({
    url: "https://paulgraham.com/ds.html",
    title: "Do Things that Don't Scale",
    intent: "evergreen",
    publishedAt: daysAgo(4000),
  });

  assert.equal(freshnessScore(tenDayLesson, NOW), freshnessScore({ ...tenDayLesson, intent: "timely" }, NOW));
  assert.ok(freshnessScore(twoDayNews, NOW) > freshnessScore(twentyFiveDayNews, NOW));
  assert.ok(freshnessScore(tenDayLesson, NOW) > 0);
  assert.equal(freshnessScore(staleEssay, NOW), 0);
  assert.equal(freshnessScore(candidate({
    url: "https://example.com/undated",
    title: "Launch industry weekly roundup",
    publishedAt: null,
  }), NOW), 0);
});

Deno.test("freshness — decays sharply inside a month, reaches zero at the window edge", () => {
  const at = (days: number) =>
    freshnessScore(
      candidate({
        url: `https://example.com/age-${days}`,
        title: "Launch industry weekly roundup",
        intent: "timely",
        publishedAt: daysAgo(days),
      }),
      NOW,
    );

  // Recent material must clearly beat older material, or "timely" stops meaning
  // anything now that admission runs to a year rather than 30 days.
  assert.equal(at(3), 1);
  assert.ok(at(3) > at(20));
  assert.ok(at(20) > at(30));
  assert.ok(at(30) > at(120));
  assert.ok(at(120) > at(300));

  // Most of the score is spent in the first month.
  assert.ok(at(30) < 0.2);
  assert.ok(at(30) > 0);

  // Nothing outside the admission window scores at all.
  assert.equal(at(366), 0);
  assert.equal(at(3_650), 0);
});

Deno.test("a recent lesson outranks stale classics and same-week filler", () => {
  const recentLesson = score(
    candidate({
      url: "https://example.com/manufacturing-lessons",
      title: "Additive manufacturing lessons on early propulsion and users",
      contentType: "essay",
      intent: "evergreen",
      publishedAt: daysAgo(10),
    }),
  );
  const staleClassic = score(
    candidate({
      url: "https://paulgraham.com/ds.html",
      title: "Do Things that Don't Scale: lessons on early manufacturing and users",
      contentType: "essay",
      intent: "evergreen",
      publishedAt: daysAgo(4700),
    }),
  );
  const filler = score(
    candidate({
      url: "https://contentfarm.example/post",
      title: "Company announces new product line now available",
      intent: "timely",
      publishedAt: daysAgo(1),
      description: "Short.",
    }),
  );
  assert.ok(recentLesson.breakdown.total > staleClassic.breakdown.total);
  assert.ok(recentLesson.breakdown.total > filler.breakdown.total);
});

Deno.test("source quality — original publishers beat aggregators, niche is not excluded", () => {
  const original = candidate({ url: "https://stratechery.com/2015/aggregation-theory/", title: "Aggregation Theory" });
  const aggregator = candidate({ url: "https://msn.com/reposted-story", title: "Aggregation Theory reposted here" });
  const niche = candidate({ url: "https://small-rocket-shop.example/notes", title: "Notes on engine tolerances" });

  assert.ok(sourceQualityScore(original) > sourceQualityScore(aggregator));
  assert.ok(sourceQualityScore(niche) > sourceQualityScore(aggregator), "niche must not be filtered out");
});

Deno.test("previously recommended content is heavily suppressed", () => {
  const item = candidate({
    url: "https://example.com/propulsion",
    title: "Rocket propulsion manufacturing lessons",
  });
  const fresh = score(item);
  const seen = score(item, [item.contentKey]);
  assert.ok(seen.breakdown.previouslySeenPenalty > 0);
  assert.ok(seen.breakdown.total < fresh.breakdown.total - 3);
});

Deno.test("dedupeByKey — identical URLs collapse to the highest score", () => {
  const url = "https://example.com/x";
  const a = score(candidate({ url, title: "Rocket propulsion manufacturing lessons" }));
  const b = score(candidate({ url: `${url}?utm_source=x`, title: "Unrelated cooking tips story" }));
  const deduped = dedupeByKey([a, b]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].breakdown.total, Math.max(a.breakdown.total, b.breakdown.total));
});

// --- selection -------------------------------------------------------------

const scoredFrom = (results: DiscoveryResult[]): ScoredCandidate[] => results.map((r) => score(r));

Deno.test("selection — the same story from many publishers appears once", () => {
  const picked = selectRecommendations(
    scoredFrom([
      candidate({ url: "https://a.example/1", title: "SpaceX lands its Starship booster on the tower" }),
      candidate({ url: "https://b.example/1", title: "SpaceX Lands Starship Booster On The Tower" }),
      candidate({ url: "https://c.example/1", title: "SpaceX lands the Starship booster on a tower again" }),
      candidate({ url: "https://d.example/1", title: "Additive manufacturing tolerances in engine production" }),
    ]),
    { limit: 10 },
  );
  assert.equal(picked.length, 2, picked.map((p) => p.result.title).join(" | "));
});

// Titles must be genuinely different, or near-duplicate suppression (correctly)
// removes them before the host cap is ever exercised.
const DISTINCT_TITLES = [
  "Propulsion test cadence and what it costs to iterate",
  "Hiring machinists for a small aerospace factory",
  "Launch insurance pricing for emerging providers",
  "Welding qualification programs inside hardware startups",
  "Cryogenic tank sourcing lead times in 2026",
  "Range safety approvals and the schedules they set",
];

Deno.test("selection — one publisher cannot own the edition", () => {
  const results = DISTINCT_TITLES.map((title, i) =>
    candidate({ url: `https://onehost.example/${i}`, title }),
  );
  results.push(
    candidate({ url: "https://other.example/x", title: "Supply chain constraints for satellite operators" }),
  );
  const picked = selectRecommendations(scoredFrom(results), { limit: 3, maxPerHost: 2 });
  const hosts = picked.map((p) => new URL(p.result.canonicalUrl).hostname);
  assert.equal(hosts.filter((h) => h === "onehost.example").length, 2);
  assert.ok(hosts.includes("other.example"));
});

Deno.test("selection — the format mix stays varied", () => {
  const videos = Array.from({ length: 8 }, (_, i) =>
    candidate({
      url: `https://vid${i}.example/watch`,
      title: `Founder interview about propulsion engineering part ${i}`,
      contentType: "video",
      durationSeconds: 1800,
    }),
  );
  const articles = Array.from({ length: 4 }, (_, i) =>
    candidate({ url: `https://art${i}.example/post`, title: `Launch economics deep dive chapter ${i}` }),
  );
  const picked = selectRecommendations(scoredFrom([...videos, ...articles]), {
    limit: 10,
    maxPerContentType: 4,
  });
  const videoCount = picked.filter((p) => p.result.contentType === "video").length;
  assert.ok(videoCount <= 5, `too many videos: ${videoCount}`);
  assert.ok(picked.some((p) => p.result.contentType === "article"));
});

Deno.test("selection — caps relax rather than shipping a short edition", () => {
  const results = DISTINCT_TITLES.slice(0, 5).map((title, i) =>
    candidate({ url: `https://onehost.example/${i}`, title }),
  );
  const picked = selectRecommendations(scoredFrom(results), { limit: 5, maxPerHost: 2 });
  assert.equal(picked.length, 5, "backfill should fill the edition when nothing else is available");
});

Deno.test("selection — an empty candidate set yields an empty edition, not a throw", () => {
  assert.deepEqual(selectRecommendations([], { limit: 10 }), []);
});
