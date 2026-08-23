# AGENTS.md

## Cursor Cloud specific instructions

This is **Founder Mode Advice** — a Vite + React + TypeScript single-page app (Lovable
project) backed by a **hosted (remote) Supabase** project. There is no local backend to
run: the app talks directly to the hosted Supabase URL/anon key in `.env`.

### Dependency install (non-obvious)
- Root `.npmrc` sets `legacy-peer-deps=true`. Keep that. A strict `npm install`
  without it **fails** with an `ERESOLVE` peer-dependency conflict
  (`@revenuecat/purchases-capacitor` wants `@capacitor/core` >=7, the app pins v6).
  The startup update script already uses `--legacy-peer-deps`; only re-run install
  after changing dependencies.

### Services
- **Web app (the only service to run): `npm run dev`** — Vite dev server on
  `http://localhost:8080` (configured in `vite.config.ts`, host `::`).
- **Supabase** is remote/hosted and already live; credentials are in `.env`
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The client in
  `src/integrations/supabase/client.ts` throws if those two vars are missing.
- Supabase **edge functions** (`supabase/functions/`) are deployed remotely; they
  are not run locally. Analyze-video calls remote `analyze-episode`. Discover
  “For You” calls remote `generate-recommendations` (results are limited to the
  past 30 days).
- Optional / not needed for web dev: the Expo store shell in `native/` (`eas`
  builds, RevenueCat IAP, OneSignal), leftover Capacitor `cap:*` scripts,
  PostHog, and the `remotion/` sub-project (uses **bun**).

### Auth / hello-world
- Email signup **auto-confirms** on the hosted project, so sign up → immediate
  session. Smoke test: open `/auth`, sign up (or sign in) with email+password,
  land on the authenticated home desk (`/`). `/discover` is a separate signed-in
  route (Boardroom-gated “For You”).
- Web Google/Apple OAuth is brokered through Lovable Cloud. Native Sign in with
  Apple is an Expo AuthenticationServices sheet in `native/` — not required for
  web smoke tests.

### Lint / build / test
- `npm run lint` currently reports **pre-existing** errors (mostly
  `@typescript-eslint/no-explicit-any` in `supabase/functions/**` and a few
  others). Do not treat a non-zero lint exit as a setup failure.
- `npm run build` (Vite + PWA) builds cleanly.
- Other useful scripts: `npm run test:subscription-mapping`,
  `npm run test:discovery` (Deno — Discover ranking/recency + client helpers),
  `npm run verify:deploy`, `npm run screenshots` (Playwright, optional).
