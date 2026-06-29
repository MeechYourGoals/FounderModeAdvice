# AGENTS.md

## Cursor Cloud specific instructions

This is **Founder Mode Advice** — a Vite + React + TypeScript single-page app (Lovable
project) backed by a **hosted (remote) Supabase** project. There is no local backend to
run: the app talks directly to the hosted Supabase URL/anon key in `.env`.

### Dependency install (non-obvious)
- A plain `npm install` **fails** with an `ERESOLVE` peer-dependency conflict
  (`@revenuecat/purchases-capacitor` wants `@capacitor/core` >=7, the app pins v6).
  Always install with `npm install --legacy-peer-deps`. The startup update script
  already does this; only re-run it after changing dependencies.

### Services
- **Web app (the only service to run): `npm run dev`** — Vite dev server on
  `http://localhost:8080` (configured in `vite.config.ts`, host `::`).
- **Supabase** is remote/hosted and already live; credentials are in `.env`
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The client in
  `src/integrations/supabase/client.ts` throws if those two vars are missing.
- Supabase **edge functions** (`supabase/functions/`) are deployed remotely; they are
  not run locally. The core "analyze video" action calls the remote `analyze-episode`
  function (server-side LLM via `LOVABLE_API_KEY` set in the Supabase dashboard).
- Optional/not needed for web dev: Capacitor native builds (`cap:*`), RevenueCat,
  OneSignal, PostHog, and the `remotion/` sub-project (video rendering, uses **bun**).

### Auth / hello-world
- Email signup **auto-confirms** on the hosted project, so sign up → immediate session.
  A quick smoke test: open `/auth`, sign up (or sign in) with email+password, and you
  land on the authenticated home page. Google/Apple OAuth is brokered through Lovable
  Cloud and is not required for email/password auth.

### Lint / build / test
- `npm run lint` currently reports **pre-existing** errors (mostly
  `@typescript-eslint/no-explicit-any` in `supabase/functions/**` and a few others).
  These are existing code issues, not environment problems — do not treat a non-zero
  lint exit as a setup failure.
- `npm run build` (Vite + PWA) builds cleanly.
- Other scripts (see `package.json`): `npm run verify:deploy`,
  `npm run test:subscription-mapping`, `npm run screenshots` (Playwright, optional).
