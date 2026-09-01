import assert from "node:assert/strict";
import {
  APPLE_WEB_SERVICES_CLIENT_ID,
  CANONICAL_WEB_ORIGIN,
} from "./canonicalOrigin.ts";
import { buildWebOAuthOptions } from "./webOAuthBuild.ts";

Deno.test("buildWebOAuthOptions — Apple web OAuth uses the Services ID only", () => {
  const options = buildWebOAuthOptions(
    "apple",
    false,
    `${CANONICAL_WEB_ORIGIN}/auth`,
  );
  assert.deepEqual(options.queryParams, { client_id: APPLE_WEB_SERVICES_CLIENT_ID });
  assert.equal(options.redirectTo, `${CANONICAL_WEB_ORIGIN}/auth`);
  assert.equal(options.skipBrowserRedirect, false);
});

Deno.test("buildWebOAuthOptions — Google does not override client_id", () => {
  const options = buildWebOAuthOptions(
    "google",
    false,
    `${CANONICAL_WEB_ORIGIN}/auth`,
  );
  assert.equal(options.queryParams, undefined);
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
