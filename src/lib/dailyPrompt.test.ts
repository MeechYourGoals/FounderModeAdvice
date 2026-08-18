import assert from "node:assert/strict";
import { DAILY_PROMPTS, todaysPrompt } from "@/lib/dailyPrompt.ts";

Deno.test("daily prompts — ten coaching questions, none empty", () => {
  assert.equal(DAILY_PROMPTS.length, 10);
  assert.ok(DAILY_PROMPTS.every((prompt) => prompt.trim().length > 20));
});

Deno.test("todaysPrompt — stable for a given UTC day", () => {
  const noon = Date.UTC(2026, 7, 18, 12, 0, 0);
  const laterSameDay = Date.UTC(2026, 7, 18, 23, 59, 0);
  assert.equal(todaysPrompt(noon), todaysPrompt(laterSameDay));
  assert.ok(DAILY_PROMPTS.includes(todaysPrompt(noon) as (typeof DAILY_PROMPTS)[number]));
});
