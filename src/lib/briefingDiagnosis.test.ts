import assert from "node:assert/strict";
import {
  classifyBriefingGap,
  describeBriefingGap,
  hasBriefingBasis,
  type BriefingGap,
  type BriefingStats,
} from "./briefingDiagnosis.ts";

Deno.test("no stats at all means the briefing was never generated", () => {
  assert.equal(classifyBriefingGap(null), "not-generated-yet");
  assert.equal(classifyBriefingGap(undefined), "not-generated-yet");
  assert.equal(classifyBriefingGap({}), "not-generated-yet");
});

Deno.test("no search provider and no library is a setup problem, not a quiet week", () => {
  // The exact shape of the outage this whole change exists to fix: no provider
  // keys, and a curated library the freshness rule had hidden.
  assert.equal(
    classifyBriefingGap({
      queries: 10,
      providers_configured: [],
      evergreen_fill: 0,
      daily_brief_candidates_total: 0,
    }),
    "library-empty",
  );
});

Deno.test("no search provider but a working library says so plainly", () => {
  assert.equal(
    classifyBriefingGap({
      queries: 10,
      providers_configured: [],
      evergreen_fill: 6,
      daily_brief_candidates_total: 0,
      selected: 6,
    }),
    "no-providers",
  );
});

Deno.test("configured providers that return nothing are distinguished from stale ones", () => {
  const providers = ["brave_web", "brave_news"];
  assert.equal(
    classifyBriefingGap({ providers_configured: providers, daily_brief_candidates_total: 0 }),
    "no-results",
  );
  assert.equal(
    classifyBriefingGap({
      providers_configured: providers,
      daily_brief_candidates_total: 40,
      daily_brief_candidates_eligible: 0,
    }),
    "all-stale",
  );
  assert.equal(
    classifyBriefingGap({
      providers_configured: providers,
      daily_brief_candidates_total: 40,
      daily_brief_candidates_eligible: 12,
      selected: 0,
    }),
    "all-seen",
  );
});

Deno.test("an Exa-only deployment is not reported as having no web search", () => {
  assert.equal(
    classifyBriefingGap({ providers_configured: ["exa"], daily_brief_candidates_total: 0 }),
    "no-results",
  );
  assert.notEqual(
    classifyBriefingGap({ providers_configured: ["exa"], evergreen_fill: 4, selected: 4 }),
    "no-providers",
  );
});

Deno.test("older batches recorded providers but not providers_configured", () => {
  // Pre-change batches only ever wrote `providers`. Falling back to it keeps
  // their empty states from all collapsing to the generic message.
  assert.equal(
    classifyBriefingGap({ providers: ["brave_web"], daily_brief_candidates_total: 0 }),
    "no-results",
  );
  assert.equal(
    classifyBriefingGap({ providers: ["curated"], evergreen_fill: 0, daily_brief_candidates_total: 0 }),
    "library-empty",
  );
});

Deno.test("every gap yields non-empty copy, and the company name is used when present", () => {
  const gaps: BriefingGap[] = [
    "not-generated-yet",
    "library-empty",
    "no-providers",
    "no-results",
    "all-stale",
    "all-seen",
    "unknown",
  ];
  for (const gap of gaps) {
    const copy = describeBriefingGap(gap, "Golf Ready");
    assert.ok(copy.title.length > 0, `${gap} has a title`);
    assert.ok(copy.description.length > 0, `${gap} has a description`);
    assert.ok(!copy.title.includes("undefined"), `${gap} title has no undefined`);
    assert.ok(!copy.description.includes("undefined"), `${gap} description has no undefined`);
  }
  assert.ok(describeBriefingGap("not-generated-yet", "Golf Ready").title.includes("Golf Ready"));
  assert.ok(describeBriefingGap("not-generated-yet", null).title.includes("your company"));
  assert.ok(describeBriefingGap("not-generated-yet", "   ").title.includes("your company"));
});

Deno.test("copy reports the counts the run actually recorded", () => {
  const stats: BriefingStats = {
    providers_configured: ["brave_web"],
    daily_brief_candidates_total: 40,
    daily_brief_candidates_eligible: 0,
  };
  assert.ok(describeBriefingGap("all-stale", "Golf Ready", stats).description.includes("40"));
});

Deno.test("hasBriefingBasis — only true when there is something to show", () => {
  assert.equal(hasBriefingBasis(null), false);
  assert.equal(hasBriefingBasis({}), false);
  assert.equal(hasBriefingBasis({ query_plan: [], context_terms: [] }), false);
  assert.equal(hasBriefingBasis({ query_plan: [{ q: "sports industry developments", intent: "timely" }] }), true);
  assert.equal(hasBriefingBasis({ context_terms: ["sports"] }), true);
});
