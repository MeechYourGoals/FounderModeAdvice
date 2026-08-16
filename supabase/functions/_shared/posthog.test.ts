import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { verifyBulkDeleteBody } from "./posthog.ts";

Deno.test("empty body counts as queued success", () => {
  assertEquals(verifyBulkDeleteBody(""), { ok: true, detail: "empty-body" });
  assertEquals(verifyBulkDeleteBody("   \n"), { ok: true, detail: "empty-body" });
});

Deno.test("verified delete requires queued events and recordings", () => {
  assertEquals(
    verifyBulkDeleteBody(JSON.stringify({
      persons_found: 1,
      persons_deleted: 1,
      events_queued_for_deletion: true,
      recordings_queued_for_deletion: true,
    })),
    { ok: true, detail: "verified" },
  );
});

Deno.test("zero-person no-op is valid", () => {
  assertEquals(
    verifyBulkDeleteBody(JSON.stringify({ persons_found: 0, persons_deleted: 0 })),
    { ok: true, detail: "no-op" },
  );
});

Deno.test("unqueued history is rejected", () => {
  assertEquals(
    verifyBulkDeleteBody(JSON.stringify({
      persons_found: 1,
      persons_deleted: 1,
      events_queued_for_deletion: true,
      recordings_queued_for_deletion: false,
    })),
    { ok: false, reason: "history-not-queued" },
  );
});

Deno.test("malformed and inconsistent bodies are rejected", () => {
  assertEquals(verifyBulkDeleteBody("not json"), { ok: false, reason: "malformed-json" });
  assertEquals(verifyBulkDeleteBody("[]"), { ok: false, reason: "unexpected-body-shape" });
  assertEquals(verifyBulkDeleteBody("{}"), { ok: false, reason: "missing-counts" });
  assertEquals(
    verifyBulkDeleteBody(JSON.stringify({ persons_found: 2, persons_deleted: 1 })),
    { ok: false, reason: "incomplete-deletion" },
  );
  assertEquals(
    verifyBulkDeleteBody(JSON.stringify({ persons_found: 1, persons_deleted: 2 })),
    { ok: false, reason: "deleted-exceeds-found" },
  );
  assertEquals(
    verifyBulkDeleteBody(JSON.stringify({ persons_found: -1, persons_deleted: -1 })),
    { ok: false, reason: "invalid-counts" },
  );
  assertEquals(
    verifyBulkDeleteBody(JSON.stringify({
      persons_found: 1,
      persons_deleted: 1,
      deletion_errors: ["boom"],
    })),
    { ok: false, reason: "deletion-errors-present" },
  );
});
