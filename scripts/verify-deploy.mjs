#!/usr/bin/env node
/**
 * verify-deploy.mjs
 *
 * Automated post-deploy check that confirms the live preview/published URL is
 * serving the freshly built index.html (i.e. the service worker is correctly
 * revalidating navigations and not pinning a stale shell).
 *
 * How it works
 *  1. Reads the build id from `dist/build-id.txt` (written by vite.config.ts).
 *     Falls back to `--expected <id>` flag or BUILD_ID env var.
 *  2. Polls each target URL, fetching `index.html` with `cache: no-store`
 *     plus a cache-busting query string. Parses `<meta name="build-id">` and
 *     compares it to the expected id.
 *  3. Also fetches `/sw.js` and asserts the workbox config does NOT precache
 *     navigations as cache-first (we require NetworkFirst for `request.mode === "navigate"`).
 *  4. Exits 0 on success, 1 on failure. Designed to be run from CI, a
 *     post-deploy hook, or manually:
 *
 *       node scripts/verify-deploy.mjs
 *       node scripts/verify-deploy.mjs --expected 1.2.3-lxabcd \
 *         --url https://foundermodeadvice.lovable.app
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_URLS = [
  "https://id-preview--3d30aa39-abcb-406b-9441-e7a7f14b5734.lovable.app",
  "https://foundermodeadvice.lovable.app",
  "https://foundermodeadvice.com",
];

const TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS ?? 180_000); // 3 min
const POLL_INTERVAL_MS = Number(process.env.VERIFY_POLL_MS ?? 5_000);

function parseArgs(argv) {
  const args = { urls: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--expected") args.expected = argv[++i];
    else if (a === "--url") args.urls.push(argv[++i]);
    else if (a === "--no-sw-check") args.skipSw = true;
  }
  return args;
}

function readExpectedBuildId(explicit) {
  if (explicit) return explicit;
  if (process.env.BUILD_ID) return process.env.BUILD_ID;
  const p = path.join(projectRoot, "dist", "build-id.txt");
  if (!existsSync(p)) {
    throw new Error(
      `Could not find dist/build-id.txt. Run \`vite build\` first or pass --expected <id>.`,
    );
  }
  return readFileSync(p, "utf-8").trim();
}

async function fetchText(url) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function extractBuildId(html) {
  const m = html.match(
    /<meta\s+name=["']build-id["']\s+content=["']([^"']+)["']/i,
  );
  return m ? m[1] : null;
}

async function verifyShellFreshness(baseUrl, expected) {
  const bust = `?_v=${Date.now()}`;
  const html = await fetchText(baseUrl.replace(/\/$/, "") + "/index.html" + bust);
  const actual = extractBuildId(html);
  if (!actual) {
    return { ok: false, reason: "no <meta name=\"build-id\"> in served HTML" };
  }
  if (actual !== expected) {
    return { ok: false, reason: `build-id mismatch: served=${actual} expected=${expected}` };
  }
  return { ok: true, actual };
}

async function verifyServiceWorker(baseUrl) {
  const swUrl = baseUrl.replace(/\/$/, "") + "/sw.js";
  const sw = await fetchText(swUrl);
  // Guardrails: must not precache HTML, must use NetworkFirst for navigations.
  const precachesHtml = /precacheAndRoute\([^)]*\.html/i.test(sw);
  const hasNetworkFirstNav =
    /NetworkFirst/i.test(sw) && /navigate/i.test(sw);
  if (precachesHtml) {
    return { ok: false, reason: "sw.js precaches *.html (will pin stale shell)" };
  }
  if (!hasNetworkFirstNav) {
    return { ok: false, reason: "sw.js missing NetworkFirst navigation handler" };
  }
  return { ok: true };
}

async function pollUntil(fn, label) {
  const start = Date.now();
  let lastErr = "unknown";
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const r = await fn();
      if (r.ok) return r;
      lastErr = r.reason;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    process.stdout.write(`  … ${label}: ${lastErr} (retrying)\n`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { ok: false, reason: `timeout after ${TIMEOUT_MS}ms — last: ${lastErr}` };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const expected = readExpectedBuildId(args.expected);
  const urls = args.urls.length ? args.urls : DEFAULT_URLS;

  console.log(`Expected build-id: ${expected}`);
  console.log(`Targets: ${urls.join(", ")}`);

  let failed = 0;
  for (const url of urls) {
    console.log(`\n→ ${url}`);
    const shell = await pollUntil(
      () => verifyShellFreshness(url, expected),
      "shell freshness",
    );
    if (shell.ok) console.log(`  ✓ shell up-to-date (build-id=${shell.actual})`);
    else {
      console.log(`  ✗ shell check failed: ${shell.reason}`);
      failed++;
    }

    if (!args.skipSw) {
      const sw = await pollUntil(() => verifyServiceWorker(url), "sw.js config");
      if (sw.ok) console.log(`  ✓ sw.js uses NetworkFirst nav handler`);
      else {
        console.log(`  ✗ sw.js check failed: ${sw.reason}`);
        failed++;
      }
    }
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(`\n✓ all post-deploy checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
