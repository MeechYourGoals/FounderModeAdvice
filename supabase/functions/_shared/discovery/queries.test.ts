import assert from "node:assert/strict";
import { buildRecommendationContext, type StartupProfileRow } from "./context.ts";
import { baseQueries, buildQueryPlan, type DiscoveryQuery } from "./queries.ts";

const rocket: StartupProfileRow = {
  id: "p1",
  company_name: "Astra Launch Systems",
  description:
    "Reusable launch vehicles for small satellite operators, scaling additive manufacturing " +
    "for propulsion parts, selling to government and defense customers.",
  industry: "Hardware / Consumer Products",
  stage: "series_a",
  role: "CEO",
};

const fitness: StartupProfileRow = {
  id: "p2",
  company_name: "Streakly",
  description:
    "Consumer fitness mobile app built on habit formation with subscription pricing, " +
    "growing through creator marketing.",
  industry: "Health / Wellness / Fitness",
  stage: "seed",
  role: "Founder",
};

Deno.test("baseQueries — two profiles get materially different search intents", () => {
  const a = baseQueries(buildRecommendationContext(rocket)).map((q) => q.query);
  const b = baseQueries(buildRecommendationContext(fitness)).map((q) => q.query);
  const shared = a.filter((q) => b.includes(q));
  assert.equal(shared.length, 0, `queries overlap: ${shared.join(" | ")}`);
});

Deno.test("baseQueries — never emits one generic catch-all search", () => {
  const queries = baseQueries(buildRecommendationContext(rocket));
  assert.ok(queries.length >= 6, `too few intents: ${queries.length}`);
  for (const q of queries) {
    assert.ok(q.query.trim().split(/\s+/).length >= 2, `too generic: ${q.query}`);
  }
});

Deno.test("baseQueries — mixes timely and evergreen intents", () => {
  const queries = baseQueries(buildRecommendationContext(rocket));
  assert.ok(queries.some((q) => q.intent === "timely"));
  assert.ok(queries.some((q) => q.intent === "evergreen"));
});

Deno.test("baseQueries — a bare profile still produces a usable plan", () => {
  const queries = baseQueries(buildRecommendationContext({ id: "p", company_name: "Thing" }));
  assert.ok(queries.length > 0);
  assert.ok(queries.every((q) => q.query.length >= 8));
});

Deno.test("buildQueryPlan — dedupes, caps, and keeps deterministic intents first", () => {
  const ctx = buildRecommendationContext(rocket);
  const expanded: DiscoveryQuery[] = [
    { query: "rocket engine test stand economics", intent: "evergreen" },
    { query: "rocket engine test stand economics", intent: "timely" }, // duplicate text
    { query: "small satellite launch pricing trends", intent: "timely" },
  ];
  const plan = buildQueryPlan(ctx, expanded, 5);

  assert.equal(plan.length, 5);
  assert.equal(new Set(plan.map((q) => q.query.toLowerCase())).size, plan.length);
  assert.equal(plan[0].query, baseQueries(ctx)[0].query, "deterministic intents lead");
  assert.ok(plan.some((q) => q.query === "rocket engine test stand economics"));
});

Deno.test("buildQueryPlan — works with no model expansion at all", () => {
  const plan = buildQueryPlan(buildRecommendationContext(fitness), [], 10);
  assert.ok(plan.length > 0);
  assert.ok(plan.length <= 10);
});

Deno.test("buildQueryPlan — a zero cap still returns one query", () => {
  const plan = buildQueryPlan(buildRecommendationContext(fitness), [], 0);
  assert.equal(plan.length, 1);
});

Deno.test("baseQueries — a thin profile does not collapse to generic startup search", () => {
  // domain used to fall straight through to the literal "startups" whenever a
  // profile had no industry and a short description, making every thin
  // profile's plan interchangeable with every other one's.
  const thin: StartupProfileRow = {
    id: "p3",
    company_name: "Golf Ready",
    description: "Helping golfers practice better with a mobile training app.",
    industry: null,
    stage: "seed",
    role: "Founder",
  };
  const queries = baseQueries(buildRecommendationContext(thin)).map((q) => q.query);
  assert.ok(queries.length > 0);
  assert.ok(
    !queries.some((q) => q.startsWith("startups ")),
    `thin profile fell back to generic startup queries: ${queries.join(" | ")}`,
  );
  // And it never searches the company's own name — that returns news about
  // them, not material to learn from.
  assert.ok(!queries.some((q) => q.toLowerCase().includes("golf ready")));
});

Deno.test("baseQueries — covers adjacent angles, not just the core domain", () => {
  const queries = baseQueries(buildRecommendationContext(fitness));
  const text = queries.map((q) => q.query);
  // The customer's own world, one step sideways from the company's lane.
  assert.ok(
    text.some((q) => q.startsWith("what ") && q.includes("care about now")),
    `no customer-angle query: ${text.join(" | ")}`,
  );
  // A mix of timely and evergreen intents, so an edition is not ten takes on
  // one news story.
  assert.ok(queries.some((q) => q.intent === "timely"));
  assert.ok(queries.some((q) => q.intent === "evergreen"));
});
