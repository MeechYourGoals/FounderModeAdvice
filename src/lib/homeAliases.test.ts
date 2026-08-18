import assert from "node:assert/strict";
import { AUTH_ALIASES, HOME_HASH_ALIASES } from "@/lib/homeAliases.ts";

Deno.test("auth aliases send typed login URLs to /auth", () => {
  assert.deepEqual([...AUTH_ALIASES], ["/login", "/signin"]);
});

Deno.test("home aliases map marketing paths to existing homepage hashes", () => {
  assert.equal(HOME_HASH_ALIASES["/product"], "/#product");
  assert.equal(HOME_HASH_ALIASES["/pricing"], "/#pricing");
  assert.equal(HOME_HASH_ALIASES["/use-cases"], "/#use-cases");
  assert.equal(HOME_HASH_ALIASES["/demo"], "/#demo");
  assert.equal(HOME_HASH_ALIASES["/analyze"], "/");
});
