# App Store Readiness — Founder Mode Advice iOS 1.0

Audited and implemented on branch `claude/founder-mode-ios-release-lkib0q`,
2026-08-09. Verdicts: **PASS** (validated here) · **FAIL** · **BLOCKED**
(cannot be executed in this environment) · **NOT TESTED** (needs
device/TestFlight) · **EXTERNAL** (authenticated console setup required).

## What this app actually is (audit result)

- **Product**: Vite + React 18 web app (repo root) — the full product UX.
  Supabase auth/Postgres+RLS/storage/edge functions. AI: Google
  `gemini-2.5-flash` via Lovable AI gateway; transcripts via Supadata.
  Web billing: Paddle (MoR) — Stripe code is legacy. Analytics: PostHog
  (explicit events). Push: OneSignal.
- **Store vehicle**: `native/` — Expo SDK 57 (RN 0.86, React 19.2 —
  verified current, Aug 2026) shell around the production web origin with a
  postMessage bridge to native RevenueCat (`react-native-purchases[-ui]`
  10.x), OneSignal, haptics, share, deep links. CNG project (no committed
  ios/ dir; EAS prebuilds).
- **Not Expo Go dependent**: purchases/push load natively in dev/preview/
  production builds; Expo Go remains a UI-only convenience.
- **Honest 4.2 posture**: this is a high-quality hybrid, not a full native
  rewrite — see BLOCKERS.md.

## Readiness matrix

| Area | Verdict | Evidence / gap |
| --- | --- | --- |
| **Expo/EAS config** | | |
| SDK/deps current | PASS | expo 57.0.x = latest SDK line (expo.dev changelog); all 13 SDK-managed deps match bundledNativeModules exactly |
| eas.json profiles + environments | PASS | dev/preview/production with EAS env scoping; remote build numbers, autoIncrement; submit profile has no fake IDs |
| Production config guard | PASS | `EAS_BUILD_PROFILE=production` + `test_` key → build fails with explicit message; `appl_` key passes (executed both cases) |
| App icon | PASS | native/assets/icon.png 1024×1024 RGB, no alpha |
| Splash | PASS | expo-splash-screen plugin, brand color #0c0e15 |
| Generated Info.plist / entitlements | PASS | real `expo prebuild -p ios` executed and inspected: ATS arbitrary-loads FALSE, aps-environment=production, associated domains, OneSignal app group, camera/photo strings, iPhone portrait + iPad all orientations, ITSAppUsesNonExemptEncryption=false, NSE target generated |
| Privacy manifests | PASS (design) | app code uses no required-reason APIs; RN/Expo/RevenueCat/OneSignal pods ship their own PrivacyInfo, aggregated at archive. App-level data declarations live in ASC (APP_PRIVACY_MATRIX.md) |
| EAS owner/projectId | EXTERNAL | `eas init` not yet run (no credentials here) |
| expo-doctor | PASS* | 18/20 pass; 2 failures are sandbox egress blocks (api.expo.dev, reactnative.directory), not project issues |
| **Subscriptions (RevenueCat)** | | |
| Single init path, UUID app user ids | PASS | shell configures once per login with Supabase UUID; logIn/logOut on switch |
| Offerings/paywall via RevenueCat UI | PASS (code) / EXTERNAL (dashboard) | native paywall presents StoreKit-localized prices; dashboard objects per REVENUECAT_MAPPING.md |
| No hardcoded prices in native | PASS | tierPriceLabel + PricingPlans/UpgradePrompt/UsageDisplay/SubscriptionSettingsCard suppress USD in app contexts |
| Disclosure + legal links at plans | PASS | SubscriptionDisclosure on every plan surface |
| Duplicate-tap protection | PASS | upgradeInFlightRef (web) + purchaseUIActiveRef (shell) |
| Restore | PASS | explicit ack protocol; visible buttons on Account + modal |
| Manage subscription | PASS | RevenueCat Customer Center in shell; portal on web |
| Entitlement refresh points | PASS | launch, auth change, purchase, restore, customer-center close, 30s-throttled foreground |
| Lapse/refund/transfer downgrade | PASS (code) / EXTERNAL (deploy+URL) | revenuecat-webhook re-verifies via REST; idempotent/replay-safe |
| Web-subscriber protection | PASS | Paddle blend in every RC-driven write |
| Server-side enforcement of paid AI | PASS (pre-existing, verified) | analyze-episode quota/upload gate, video-chat Boardroom gate re-read tier from DB |
| Secrets hygiene | PASS | only public SDK keys client-side; secret key + webhook auth are server env; nothing committed |
| **Privacy/account compliance** | | |
| Sign in with Apple parity | PASS | Apple + Google + email/password |
| In-app account deletion | PASS | immediate, covers 20+ tables + 3 buckets incl. source-uploads (fixed); manage-subscription route in dialog |
| AI disclosure + consent | PASS | one-time per-user dialog naming Google Gemini + Supadata before first send; policy §6/§10 updated |
| Push permission timing | PASS | silent registration at login; OS prompt only on enabling a notification pref |
| Permission strings | PASS | camera/photo only (WebView file inputs); accurate copy; nothing else requested |
| ATT/IDFA | PASS | no tracking, no ATT prompt, IDFA unused |
| Legal pages match behavior | PASS | Paddle+Apple rails, AI vendors, PostHog, refund paths, static dates |
| **Quality/UX** | | |
| Cold launch w/o Metro | NOT TESTED (device) | shell is production-origin; needs device pass |
| Offline/retry | PASS (code review) / NOT TESTED (device) | branded retry screen, renderer-crash auto-recovery |
| iPhone/iPad layouts | PARTIAL PASS | 1320×2868 + 2064×2752 captures render true responsive layouts; device QA remains (test gate 20) |
| Accessibility (Dynamic Type, VoiceOver) | NOT TESTED | WebView inherits web a11y; audit on device |
| No dev/debug/placeholder surfaces | PASS | production build verified free of dev banners; README/docs cleaned of boilerplate |
| **Store package** | | |
| Metadata | PASS (drafted) | APP_STORE_METADATA.md + native/store.config.json |
| Privacy answers | PASS (drafted) | APP_PRIVACY_MATRIX.md |
| Review notes + demo path | PASS (drafted) / BLOCKED (credentials) | demo account must be created+seeded |
| Screenshots | PARTIAL | pipeline fixed to exact Apple sizes; 6 public frames captured; authenticated frames + IAP review shot BLOCKED on demo account/native build |
| Store console work | EXTERNAL | three ChatGPT Work prompts prepared |

## Validation log (executed in this environment, 2026-08-09)

| Command | Result |
| --- | --- |
| `npm install` (root) / `npm install` (native) | PASS (0 vulnerabilities reported paths used: legacy-peer-deps per .npmrc) |
| `npx tsc -p tsconfig.app.json --noEmit` | PASS (0 errors) |
| `cd native && npx tsc --noEmit` | PASS (0 errors) |
| `npm run lint` | PASS relative to baseline: 171 problems before branch → 170 after (−1; no new issues; pre-existing `no-explicit-any` debt untouched) |
| `npm run build` (vite production) | PASS (PWA 44 precache entries) |
| `npm run test:subscription-mapping` | PASS (6 mappings verified across client + shared edge module + both functions) |
| `npx expo config --type public` / `--type introspect` | PASS (SDK 57.0.0 resolves; introspect inspected) |
| `npx expo prebuild -p ios --no-install` | PASS — generated project inspected (see matrix), then removed (CNG) |
| Production guard negative/positive test | PASS (rejects `test_…`, accepts `appl_…`) |
| `npx expo-doctor@latest` | 18/20 PASS; 2 checks BLOCKED by sandbox egress (api.expo.dev, reactnative.directory) |
| `npx expo install --check` | BLOCKED by egress; equivalent validation done offline against `expo/bundledNativeModules.json` → all aligned (would be a no-op) |
| Playwright capture run | PASS — 6 frames at exact store dimensions |
| `supabase functions` runtime tests | BLOCKED (no Deno/Supabase credentials in sandbox); functions are typed, share one module, and follow the existing deployed patterns |
| Device/TestFlight gate (steps 1–22) | NOT TESTED here — RELEASE_CHECKLIST.md carries the acceptance record |

*Approval by App Review is never guaranteed; the material risk register is
BLOCKERS.md.*
