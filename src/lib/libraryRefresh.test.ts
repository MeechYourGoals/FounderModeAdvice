import assert from "node:assert/strict";
import {
  requestLibraryRefreshFrom,
  signalLibraryRefreshDone,
} from "@/lib/libraryRefresh.ts";

Deno.test("requestLibraryRefreshFrom resolves when the list signals done", async () => {
  const target = new EventTarget();
  let requested = false;
  target.addEventListener("libraryRefresh", () => {
    requested = true;
    signalLibraryRefreshDone(target);
  });
  await requestLibraryRefreshFrom(target, 1_000);
  assert.equal(requested, true);
});

Deno.test("requestLibraryRefreshFrom times out if nobody is listening", async () => {
  const target = new EventTarget();
  const started = Date.now();
  await requestLibraryRefreshFrom(target, 20);
  assert.ok(Date.now() - started >= 20);
});
