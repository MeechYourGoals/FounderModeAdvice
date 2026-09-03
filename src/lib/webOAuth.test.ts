import assert from "node:assert/strict";
import { CANONICAL_WEB_ORIGIN } from "./canonicalOrigin.ts";
import { buildWebOAuthOptions } from "./webOAuthBuild.ts";

Deno.test("buildWebOAuthOptions — Apple does not override client_id (Supabase dashboard owns ordering)", () => {
  const options = buildWebOAuthOptions(
    "apple",
    false,
    `${CANONICAL_WEB_ORIGIN}/auth`,
  );
  assert.equal("queryParams" in options, false);
  assert.equal(options.redirectTo, `${CANONICAL_WEB_ORIGIN}/auth`);
  assert.equal(options.skipBrowserRedirect, false);
});

Deno.test("buildWebOAuthOptions — Google does not override client_id", () => {
  const options = buildWebOAuthOptions(
    "google",
    false,
    `${CANONICAL_WEB_ORIGIN}/auth`,
  );
  assert.equal("queryParams" in options, false);
});

Deno.test("buildWebOAuthOptions — native shells skip in-webview redirect", () => {
  const options = buildWebOAuthOptions(
    "google",
    true,
    "com.foundermodeadvice.app://auth/callback",
  );
  assert.equal(options.skipBrowserRedirect, true);
  assert.equal(options.redirectTo, "com.foundermodeadvice.app://auth/callback");
});
