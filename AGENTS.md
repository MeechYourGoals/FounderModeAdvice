# AGENTS.md

## Cursor Cloud specific instructions

This is a **Vite + React + TypeScript** single-page app ("Founder Mode Advice") that talks to a
**remote, hosted Supabase** backend (Auth, Postgres/RLS, Storage, Edge Functions). There is no
local backend to run — the frontend connects directly to the hosted Supabase project configured in
`.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The Supabase anon key in `.env` is a
public client key (safe in the frontend), not a secret.

### Service: web frontend (the only thing you run locally)

- Dev server: `npm run dev` → serves at `http://localhost:8080` (port/host set in `vite.config.ts`).
- Build: `npm run build` (production) or `npm run build:dev` (development mode build).
- Lint: `npm run lint`. NOTE: the repo currently has many pre-existing lint errors (mostly
  `@typescript-eslint/no-explicit-any` in `supabase/functions/**` and similar). A non-zero exit from
  lint is the repo's existing baseline, not a result of your environment setup.

### Dependency install gotcha (important)

- `npm install` fails with an `ERESOLVE` peer-dependency conflict (`@revenuecat/purchases-capacitor`
  wants `@capacitor/core >=7` while the project pins Capacitor 6). You **must** install with
  `npm install --legacy-peer-deps`. This is already handled by the startup update script.
- Multiple lockfiles exist (`package-lock.json`, `bun.lock`, `bun.lockb`). Use **npm** (matches the
  README and `package-lock.json`); bun is not installed here.

### Auth / testing notes

- Email/password signup on the hosted Supabase **auto-confirms** (no email verification step), and the
  app auto-signs-in right after signup. So you can create a throwaway account
  (e.g. `clouddev+<rand>@example.com` / `Test123456!`) and immediately reach the authenticated home.
- Google/Apple OAuth go through the Lovable Cloud auth bridge and are not expected to work in a plain
  local browser; use email/password for testing.
- Core authenticated flow to smoke-test: sign in → (skip the first-run onboarding dialog) →
  open "Business Profiles" → "New Profile" → fill Company Name, Stage, Industry, **Description (required)** → "Create Profile".
- The "Analyze" flow calls Supabase Edge Functions that depend on server-side secrets configured in
  the Supabase dashboard (e.g. AI keys); it may not produce results from a local frontend even though
  the rest of the app works.

### Other

- `remotion/` is a separate sub-package (video rendering) with its own `package.json`/lockfile; it is
  not part of the main web app dev loop.
- Capacitor (`cap:*`) and Playwright screenshot scripts target native/CI builds and are not needed for
  local web development.
