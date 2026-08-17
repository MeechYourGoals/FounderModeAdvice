import assert from "node:assert/strict";
import {
  buildRecommendationContext,
  profileFingerprint,
  type StartupProfileRow,
} from "./context.ts";

const rocketProfile: StartupProfileRow = {
  id: "profile-rocket",
  user_id: "user-a",
  company_name: "Astra Launch Systems",
  description:
    "We build reusable launch vehicles for small satellite operators. Our propulsion team " +
    "is scaling additive manufacturing for engine parts and we sell to government and " +
    "defense customers as well as commercial satellite companies.",
  industry: "Hardware / Consumer Products",
  stage: "series_a",
  role: "CEO",
  employee_count: 42,
};

const fitnessProfile: StartupProfileRow = {
  id: "profile-fitness",
  user_id: "user-a",
  company_name: "Streakly",
  description:
    "A consumer fitness mobile app built around habit formation and subscription pricing. " +
    "We grow through creator marketing and care most about retention and churn.",
  industry: "Health / Wellness / Fitness",
  stage: "seed",
  role: "Founder",
  employee_count: 6,
};

Deno.test("two profiles produce materially different contexts", () => {
  const rocket = buildRecommendationContext(rocketProfile);
  const fitness = buildRecommendationContext(fitnessProfile);

  assert.ok(rocket.categories.includes("Aerospace / Space"), rocket.categories.join(","));
  assert.ok(rocket.technologies.includes("propulsion"));
  assert.ok(rocket.customers.includes("government"));

  assert.ok(fitness.categories.includes("Behavioral Science"), fitness.categories.join(","));
  assert.ok(fitness.customers.includes("consumers"));
  assert.equal(fitness.businessModel, "subscription");

  // The two feeds must not be driven by the same vocabulary.
  const overlap = rocket.categories.filter((c) => fitness.categories.includes(c));
  assert.ok(overlap.length <= 2, `categories overlap too much: ${overlap.join(",")}`);
  assert.notDeepEqual(rocket.subindustries, fitness.subindustries);
});

Deno.test("no company facts are invented — extracted terms appear in the profile text", () => {
  const ctx = buildRecommendationContext(rocketProfile);
  const haystack = `${rocketProfile.company_name} ${rocketProfile.description} ${rocketProfile.industry} ${rocketProfile.role}`
    .toLowerCase();
  for (const term of ctx.technologies) {
    assert.ok(haystack.includes(term), `invented technology: ${term}`);
  }
  for (const term of ctx.markets) {
    assert.ok(haystack.includes(term), `invented market: ${term}`);
  }
  // Nothing from the fitness profile leaks in.
  assert.ok(!ctx.technologies.includes("wearable"));
});

Deno.test("stage drives goals and challenges without asserting company facts", () => {
  const seed = buildRecommendationContext({ ...rocketProfile, stage: "seed" });
  const growth = buildRecommendationContext({ ...rocketProfile, stage: "growth" });
  assert.notDeepEqual(seed.challenges, growth.challenges);
  assert.ok(seed.goals.length > 0 && growth.goals.length > 0);
});

Deno.test("a sparse profile is flagged but still yields usable defaults", () => {
  const ctx = buildRecommendationContext({ id: "p", user_id: "u", company_name: "Thing" });
  assert.equal(ctx.sparse, true);
  assert.ok(ctx.categories.length > 0, "must still give the ranker something");
  assert.ok(ctx.relevantTopics.length > 0);
  assert.ok(ctx.goals.length > 0);
});

Deno.test("an unknown stage falls back instead of throwing", () => {
  const ctx = buildRecommendationContext({ ...rocketProfile, stage: "wat" });
  assert.ok(ctx.goals.length > 0);
  assert.ok(ctx.challenges.length > 0);
});

Deno.test("profileFingerprint — stable for identical input, changes on any edit", () => {
  const base = profileFingerprint(rocketProfile);
  assert.equal(base, profileFingerprint({ ...rocketProfile }));
  assert.notEqual(base, profileFingerprint({ ...rocketProfile, description: "Something else" }));
  assert.notEqual(base, profileFingerprint({ ...rocketProfile, stage: "seed" }));
  assert.notEqual(base, profileFingerprint({ ...rocketProfile, employee_count: 43 }));
});

Deno.test("profileFingerprint — moving text between fields changes the hash", () => {
  const a = profileFingerprint({ id: "p", company_name: "Astra", description: "Launch" });
  const b = profileFingerprint({ id: "p", company_name: "AstraLaunch", description: "" });
  assert.notEqual(a, b);
});
