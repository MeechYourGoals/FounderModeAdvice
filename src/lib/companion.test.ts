import assert from "node:assert/strict";
import { firstNameFromUser, timeOfDayGreeting } from "@/lib/companion.ts";

const user = (overrides: { email?: string; user_metadata?: Record<string, unknown> } = {}) =>
  ({
    id: "u1",
    email: "founder@example.com",
    user_metadata: {},
    ...overrides,
  }) as Parameters<typeof firstNameFromUser>[0];

Deno.test("timeOfDayGreeting — morning, afternoon, evening", () => {
  assert.equal(timeOfDayGreeting(new Date("2026-08-18T08:00:00")), "Good morning");
  assert.equal(timeOfDayGreeting(new Date("2026-08-18T13:00:00")), "Good afternoon");
  assert.equal(timeOfDayGreeting(new Date("2026-08-18T19:00:00")), "Good evening");
});

Deno.test("firstNameFromUser — prefers full_name, then email local-part", () => {
  assert.equal(firstNameFromUser(user({ user_metadata: { full_name: "Ada Lovelace" } })), "Ada");
  assert.equal(firstNameFromUser(user({ user_metadata: { name: "Grace" } })), "Grace");
  assert.equal(firstNameFromUser(user()), "founder");
  assert.equal(firstNameFromUser(null), null);
});
