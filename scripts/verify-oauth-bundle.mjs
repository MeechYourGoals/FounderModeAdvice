#!/usr/bin/env node
/**
 * Post-build guard: production bundles must use Supabase Auth OAuth, not the
 * Lovable Cloud Auth broker (~oauth/initiate, oauth.lovable.app, cloud-auth-js).
 *
 * Run after `vite build`:
 *   node scripts/verify-oauth-bundle.mjs
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "..", "dist", "assets");

const FORBIDDEN = [
  /oauth\.lovable\.app/,
  /\/~oauth\/initiate/,
  /\/~oauth\/callback/,
  /@lovable\.dev\/cloud-auth-js/,
  /lovable\.auth\.signInWithOAuth/,
  /signInWithOAuth\(\s*["']google["']/,
  /signInWithOAuth\(\s*["']apple["']/,
];

const REQUIRED = [
  /signInWithOAuth\(\{/,
  /foundermodeadvice\.com/,
  /\/auth/,
];

function main() {
  if (!existsSync(assetsDir)) {
    console.error("verify-oauth-bundle: dist/assets not found — run vite build first");
    process.exit(1);
  }

  const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
  if (jsFiles.length === 0) {
    console.error("verify-oauth-bundle: no JS assets in dist/assets");
    process.exit(1);
  }

  const combined = jsFiles
    .map((f) => readFileSync(path.join(assetsDir, f), "utf-8"))
    .join("\n");

  const failures = [];
  for (const pattern of FORBIDDEN) {
    if (pattern.test(combined)) {
      failures.push(`forbidden pattern matched: ${pattern}`);
    }
  }
  for (const pattern of REQUIRED) {
    if (!pattern.test(combined)) {
      failures.push(`required pattern missing: ${pattern}`);
    }
  }

  if (failures.length > 0) {
    console.error("verify-oauth-bundle: FAILED\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }

  console.log(
    `verify-oauth-bundle: OK (${jsFiles.length} asset(s) — Supabase signInWithOAuth, no Lovable broker)`,
  );
}

main();
