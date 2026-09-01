import assert from "node:assert/strict";
import {
  CANONICAL_WEB_ORIGIN,
  apexRedirectTarget,
  canonicalWebOriginForHost,
  shouldRedirectWwwToApex,
} from "./canonicalOrigin.ts";

Deno.test("canonicalWebOriginForHost — production hosts always use apex", () => {
  assert.equal(
    canonicalWebOriginForHost("foundermodeadvice.com", "https://foundermodeadvice.com"),
    CANONICAL_WEB_ORIGIN,
  );
  assert.equal(
    canonicalWebOriginForHost("www.foundermodeadvice.com", "https://www.foundermodeadvice.com"),
    CANONICAL_WEB_ORIGIN,
  );
});

Deno.test("canonicalWebOriginForHost — other hosts keep their origin", () => {
  assert.equal(
    canonicalWebOriginForHost("localhost", "http://localhost:8080"),
    "http://localhost:8080",
  );
  assert.equal(
    canonicalWebOriginForHost("my-app.lovable.app", "https://my-app.lovable.app"),
    "https://my-app.lovable.app",
  );
});

Deno.test("shouldRedirectWwwToApex — only www triggers", () => {
  assert.equal(shouldRedirectWwwToApex("www.foundermodeadvice.com"), true);
  assert.equal(shouldRedirectWwwToApex("foundermodeadvice.com"), false);
  assert.equal(shouldRedirectWwwToApex("localhost"), false);
});

Deno.test("apexRedirectTarget — preserves path, query, and hash on apex", () => {
  assert.equal(
    apexRedirectTarget("/auth", "?next=%2Fdiscover", ""),
    "https://foundermodeadvice.com/auth?next=%2Fdiscover",
  );
  assert.equal(
    apexRedirectTarget("/auth/callback", "?code=abc", "#fragment"),
    "https://foundermodeadvice.com/auth/callback?code=abc#fragment",
  );
});
