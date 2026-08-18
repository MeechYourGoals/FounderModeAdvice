import assert from "node:assert/strict";
import { shouldShowAppStoreComingSoonBadge } from "@/lib/appStoreBadge.ts";

Deno.test("App Store coming-soon badge hides in the native and PWA shells", () => {
  assert.equal(shouldShowAppStoreComingSoonBadge({ nativeWrapper: false, standalonePwa: false }), true);
  assert.equal(shouldShowAppStoreComingSoonBadge({ nativeWrapper: true, standalonePwa: false }), false);
  assert.equal(shouldShowAppStoreComingSoonBadge({ nativeWrapper: false, standalonePwa: true }), false);
  assert.equal(shouldShowAppStoreComingSoonBadge({ nativeWrapper: true, standalonePwa: true }), false);
});
