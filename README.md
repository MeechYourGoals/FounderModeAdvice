# Founder Mode Advice

Turn founder, investor, and operator content — links, videos, podcasts, or private
documents — into transcript-grounded operating memos: lessons, risks, action items,
company-specific advice, follow-up Q&A, and an organized intelligence library. Share
any insight as a branded card, browse the crowdsourced Community Library, and get a
push when your weekly briefing is ready.

Product: https://foundermodeadvice.com · Operated by Saint Marlo Labs LLC.

## Architecture

| Layer | Stack |
| --- | --- |
| Web app (this repo root) | Vite + React 18 + TypeScript, Tailwind, shadcn/ui, PWA |
| Backend | Supabase (auth, Postgres + RLS, storage, edge functions) |
| AI | Google Gemini via Lovable AI gateway; Supadata for transcripts |
| Web billing | Paddle (Merchant of Record) |
| iOS/Android app | `native/` — Expo SDK 57 shell (react-native-webview) with native RevenueCat IAP, OneSignal push, haptics; built with EAS |
| Analytics / push | PostHog (installed apps), OneSignal |

## Develop

```bash
npm install
npm run dev            # web app on http://localhost:8080
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm test               # Deno unit tests (edge-function shared modules + pure client helpers)
npm run test:subscription-mapping
```

`npm test` requires [Deno](https://deno.land) on the PATH. Database policy tests
run separately against a live/local database:
`DATABASE_URL=... npm run test:rls`.

Discover (weekly personalized recommendations) needs some configuration outside
this repo — see `docs/discovery-setup.md`.

Native shell: see `native/README.md` (Expo Go for UI work; EAS development build
for purchases/push).

## Release

The iOS/App Store runbook lives in `docs/app-store/` — start with
`docs/app-store/APP_STORE_READINESS.md` and `docs/app-store/RELEASE_CHECKLIST.md`.
