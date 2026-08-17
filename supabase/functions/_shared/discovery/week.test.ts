import assert from "node:assert/strict";
import { isoWeekKey } from "./week.ts";

Deno.test("isoWeekKey — known ISO weeks", () => {
  // 2026-01-01 is a Thursday, so it belongs to ISO week 1 of 2026.
  assert.equal(isoWeekKey(new Date("2026-01-01T12:00:00Z")), "2026-W01");
  assert.equal(isoWeekKey(new Date("2026-08-17T00:00:00Z")), "2026-W34");
  // 2027-01-01 is a Friday: still ISO week 53 of 2026.
  assert.equal(isoWeekKey(new Date("2027-01-01T12:00:00Z")), "2026-W53");
  // 2021-01-01 is a Friday: ISO week 53 of 2020.
  assert.equal(isoWeekKey(new Date("2021-01-01T12:00:00Z")), "2020-W53");
});

Deno.test("isoWeekKey — every hour of a UTC day lands in the same week", () => {
  const keys = new Set<string>();
  for (let hour = 0; hour < 24; hour += 1) {
    keys.add(isoWeekKey(new Date(Date.UTC(2026, 7, 19, hour, 30))));
  }
  assert.equal(keys.size, 1, [...keys].join(","));
});

Deno.test("isoWeekKey — the boundary is Monday 00:00 UTC, not a local midnight", () => {
  // Sunday 23:59 UTC and Monday 00:01 UTC are different editions...
  const sunday = isoWeekKey(new Date("2026-08-16T23:59:00Z"));
  const monday = isoWeekKey(new Date("2026-08-17T00:01:00Z"));
  assert.notEqual(sunday, monday);
  // ...but a user 13 hours ahead, still inside Monday UTC, sees Monday's key.
  assert.equal(isoWeekKey(new Date("2026-08-17T22:00:00Z")), monday);
});

Deno.test("isoWeekKey — week numbers are always zero-padded to two digits", () => {
  assert.match(isoWeekKey(new Date("2026-03-02T00:00:00Z")), /^\d{4}-W\d{2}$/);
  assert.equal(isoWeekKey(new Date("2026-01-05T00:00:00Z")), "2026-W02");
});
