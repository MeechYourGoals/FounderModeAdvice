import assert from "node:assert/strict";
import { THEME_DEFAULT, THEME_ENABLE_SYSTEM } from "@/lib/theme.ts";

Deno.test("theme defaults follow the system appearance", () => {
  assert.equal(THEME_DEFAULT, "system");
  assert.equal(THEME_ENABLE_SYSTEM, true);
});
