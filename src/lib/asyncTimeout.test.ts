import assert from "node:assert/strict";
import { isTimeoutError, TimeoutError, withTimeout } from "@/lib/asyncTimeout.ts";

Deno.test("withTimeout — returns the value when the promise wins", async () => {
  assert.equal(await withTimeout(Promise.resolve("ok"), 50, "fast"), "ok");
});

Deno.test("withTimeout — rejects with TimeoutError when the promise never settles", async () => {
  await assert.rejects(
    () => withTimeout(new Promise<never>(() => {}), 15, "hang"),
    (error: unknown) => {
      assert.ok(error instanceof TimeoutError);
      assert.equal(error.name, "TimeoutError");
      assert.match(error.message, /hang/);
      assert.equal(isTimeoutError(error), true);
      return true;
    },
  );
});

Deno.test("withTimeout — forwards a real rejection before the deadline", async () => {
  await assert.rejects(
    () => withTimeout(Promise.reject(new Error("nope")), 50, "fail"),
    (error: unknown) => error instanceof Error && error.message === "nope",
  );
});

Deno.test("isTimeoutError — ignores ordinary errors", () => {
  assert.equal(isTimeoutError(new Error("nope")), false);
  assert.equal(isTimeoutError(null), false);
});
