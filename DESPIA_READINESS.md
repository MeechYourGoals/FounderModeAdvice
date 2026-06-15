# Despia / Native Readiness — Founder Mode Advice

Single-page deployment source of truth for shipping this app to iOS/Android.

> **This app is not a plain Lovable web app.** It is a **Capacitor-primary +
> Despia-fallback hybrid**: native iOS/Android can ship via Capacitor (full
> control, native RevenueCat/OneSignal plugins) *or* via Despia (web-wrapped,
> bridge commands). The web bridge layer is runtime-aware and supports both.
> See `docs/mobile-wrapping.md` (wrappers) and `docs/store-readiness.md`
> (store-compliance runbook) for the long-form versions of this checklist.

---

## 1. Project summary

| | |
| --- | --- |
| App name | Founder Mode Advice |
| Bundle id / package | `com.foundermodeadvice.app` |
| Production URL | `https://foundermodeadvice.com` (custom domain — preferred over temporary Lovable URLs) |
| Framework | Vite + React 18 + TypeScript, Tailwind + shadcn, React Router v6 |
| Native strategy | Capacitor 6 (primary) + Despia (fallback); runtime detection in `src/lib/appMode.ts` |
| Auth | Supabase (`@supabase/supabase-js`) + Lovable Cloud Auth bridge for preview hosts |
| Payments | RevenueCat (native IAP) + Stripe (web only, blocked in native) |
| Analytics | PostHog — native `posthog://` bridge in Despia, web SDK (CDN) in Capacitor/PWA, gated to installed apps |
| Push | OneSignal — native bridge in Despia, `react-onesignal` in Capacitor; per-user external id mapping |

**Assumptions:** "Despia" means the web-wrapped native runtime; digital
subscriptions inside native apps must use Apple/Google billing (RevenueCat),
never Stripe. Public `VITE_*` frontend vars are not secrets.

---

## 2. Code readiness checklist (in this repo)

- [x] `despia-native` installed — `package.json`
- [x] Despia bridge utilities — `src/services/despiaService.ts` (`revenuecat://`, `haptics://`, `deeplink://`, `push://register`, `getpurchasehistory://`)
- [x] Runtime detection (`Despia` UA token, Capacitor platform, installed PWA) — `src/lib/appMode.ts`, `src/services/despiaService.ts`, `src/hooks/use-despia.ts`
- [x] Browser-safe no-ops for every native call
- [x] Safe-area CSS (`--safe-area-top/bottom`, `.safe-top/.safe-bottom`, `.despia-scroll`, `.pb-nav`, keyboard handling) — `src/index.css`
- [x] Viewport meta (`viewport-fit=cover`, non-zoom in installed apps) — `index.html`, `src/main.tsx`
- [x] Root/body scroll behavior (fixed shell, inner `.despia-scroll`) — `src/pages/Index.tsx`, `src/index.css`
- [x] RevenueCat: native paywall/customer-center/entitlements + Stripe web fallback + server re-verification — `src/services/subscriptionService.ts`
- [x] Entitlement refresh callbacks (`window.onRevenueCatPurchase`, `iapSuccess`) — `src/contexts/SubscriptionContext.tsx`
- [x] **Route/screen tracking** — `src/components/AppChrome.tsx` → `captureScreen()`
- [x] **Auth/user identity adapter** (PostHog identify/reset on login/logout) — `src/components/AppChrome.tsx` → `identifyUser()`/`resetAnalyticsUser()`
- [x] **OneSignal per-user mapping** (signed-in id → external user id) — `src/services/pushService.ts` → `syncPushUser()`, wired in `AppChrome`
- [x] **PostHog helper** (capture/screen/identify/reset/opt-in/opt-out/flags) — `src/services/analytics.ts`
- [x] **Long-list rendering containment** (`.cv-row` on grouped library views) — `src/index.css`, `src/components/EpisodesTable.tsx`
- [ ] Build / typecheck / lint status — see report; verified locally against the public npm registry

**Env vars:** the canonical list lives in **`.env.example`** (this repo does not
keep a separate `DESPIA_ENV_EXAMPLE.md` — `.env.example` already documents every
`VITE_*` var, Supabase edge-function secrets, and RevenueCat/PostHog/OneSignal
guidance). PostHog adds `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`,
`VITE_DESPIA_POSTHOG_ENABLED`.

---

## 3. Manual dashboard checklist (Despia path)

- [ ] Point Despia at the deployed HTTPS app URL (prefer the custom domain `foundermodeadvice.com`, not a temporary Lovable URL)
- [ ] Enable required native integrations (RevenueCat, OneSignal, PostHog)
- [ ] Add RevenueCat iOS public SDK key (in Despia dashboard for the Despia build)
- [ ] Add RevenueCat Android public SDK key
- [ ] Add PostHog project API key (`phc_…`) + host
- [ ] Add OneSignal configuration
- [ ] **Rebuild the native app after enabling any native SDK integration** (RevenueCat / PostHog / OneSignal are compiled in — OTA web updates cannot enable them)

> Capacitor path instead? Generate `ios/`/`android/` via the `cap:*` scripts in
> `package.json` and set the `VITE_REVENUECAT_*` keys in the build env. See
> `docs/store-readiness.md` and `docs/mobile-wrapping.md`.

---

## 4. RevenueCat setup checklist

Identifiers must stay aligned across `src/types/subscription.ts`,
`supabase/functions/sync-revenuecat-subscription/index.ts`, the RevenueCat
dashboard, and App Store Connect / Google Play. Accepted identifiers today:

- Entitlement: `Founder Mode Advisor Pro` / `founder_mode_advisor_pro` → `series_z`
- Legacy entitlements: `series_z_subscription`, `seed_subscription`
- Products: `seed_monthly`, `series_z_monthly`; Offering: `default`

- [ ] RevenueCat project + iOS app (`com.foundermodeadvice.app`) + Android app
- [ ] Entitlements, products, and `default` offering created and linked
- [ ] Store products created in App Store Connect / Google Play Console
- [ ] iOS public SDK key → `VITE_REVENUECAT_IOS_API_KEY`; Android → `VITE_REVENUECAT_ANDROID_API_KEY`
- [ ] Secret key → Supabase secret `REVENUECAT_API_KEY` (server re-verifies before writing tier)
- [ ] Sandbox purchase, restore, and post-purchase entitlement refresh tested
- [ ] Web purchase fallback URL (only if a web IAP flow is ever needed — currently web uses Stripe)

---

## 5. PostHog setup checklist

- [ ] Project created; copy project API key (`phc_…`) and host
- [ ] **Despia:** enable PostHog integration in the Despia dashboard + native rebuild (web app calls the `posthog://` bridge)
- [ ] **Capacitor / PWA:** set `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` (web SDK auto-loads from CDN)
- [ ] Confirm `native_app_opened`, `$pageview` (screen), `identify` on login, `reset` on logout
- [ ] Consent: if GDPR/CCPA consent is required, gate `optInAnalytics()`/`optOutAnalytics()` from a consent UI (default is capture-on)
- [ ] Feature flags via `getFeatureFlag()` if used (web SDK only)
- [ ] To track plain-browser visitors too, widen `inInstalledApp()` in `src/services/analytics.ts`

---

## 6. OneSignal checklist

- [ ] App configured; `VITE_ONESIGNAL_APP_ID` set; Supabase secrets `ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY`
- [ ] APNs `.p8` uploaded to OneSignal (iOS) / FCM configured (Android)
- [ ] External user id mapping tested — confirm a device shows the Supabase user id in OneSignal after login (`syncPushUser`)
- [ ] `send-daily-prompt` reaches an opted-in test user (it targets `include_external_user_ids`)
- [ ] Push permission prompt timing decided; logout behavior tested (`syncPushUser(null)`)

---

## 7. Apple iOS deployment checklist

See `docs/store-readiness.md` §"App Store Connect checklist" and `APP_REVIEW_NOTES.md`.

- [ ] Apple Developer account; HTTPS app URL works
- [ ] App icon exactly 1024×1024 PNG, no transparency, safe padding (`app-store-assets/icon-1024.png`)
- [ ] Splash asset prepared; metadata, screenshots (`npm run screenshots`), support/privacy/terms URLs
- [ ] App Privacy labels completed (see §10)
- [ ] TestFlight: sign-in, free-limit enforcement, purchase/restore/expire, deletion, offline, push, deep links, no Stripe visible in-app

---

## 8. Google Android deployment checklist

See `docs/store-readiness.md` §"Google Play checklist".

- [ ] Play Console; copy the Despia/Capacitor package name **before** creating the listing — `com.foundermodeadvice.app` is permanent
- [ ] AAB for production; APK only for local testing; current target API level
- [ ] Store listing + Data Safety form; account deletion URL `https://foundermodeadvice.com/account-deletion`
- [ ] Internal testing: auth, purchase/restore, deletion, push opt-in, offline, deep links

---

## 9. OTA vs. rebuild ledger

**Ship over-the-air (web deploy — no native rebuild):** UI copy, layout/CSS,
web bug fixes, frontend business logic, route/page changes, **analytics events
and screen tracking**, OneSignal per-user mapping logic.

**Requires a native rebuild:** bundle id/package changes, enabling any native
SDK integration (**RevenueCat, PostHog, OneSignal native config**), app icon,
splash, associated domains / deep links, app groups/extensions, native
permission or capability changes.

---

## 10. Privacy / data inventory

| Category | Collected | Purpose | Linked to user | Tracking | Disclosed |
| --- | --- | --- | --- | --- | --- |
| Account / user id (email) | Yes | Auth, account | Yes | No | Yes (`PrivacyPolicy.tsx`) |
| Startup profiles & saved analyses | Yes | Core product | Yes | No | Yes |
| Subscription / entitlement status | Yes | Billing | Yes | No | Yes |
| Analytics events (PostHog) | Yes (when enabled) | Product analytics | Yes (after identify) | No¹ | **TODO** — add PostHog to privacy policy |
| Device identifiers | Via SDKs | Diagnostics/push | Maybe | No | TODO confirm |
| Push token / OneSignal id | Yes (push opt-in) | Notifications | Yes (external id) | No | Yes |
| Diagnostics / logs | Minimal | Debugging | No | No | Confirm at native build |

¹ Autocapture, session recording, and pageview-autocapture are disabled in
`posthogLoader.ts`; events are explicit. Update privacy disclosures + App
Privacy / Data Safety labels to include PostHog before submission.

---

## 11. Test matrix

| Surface | Logged out | Logged in |
| --- | --- | --- |
| Desktop browser | ☐ | ☐ |
| Mobile Safari | ☐ | ☐ |
| Mobile Chrome | ☐ | ☐ |
| Despia iOS (TestFlight) | ☐ | ☐ |
| Despia Android (internal) | ☐ | ☐ |
| Capacitor iOS | ☐ | ☐ |
| Capacitor Android | ☐ | ☐ |

Flows: signup/login/logout · all primary routes · paywall + restore + entitlement
refresh · **analytics events fire (`native_app_opened`, screen, identify/reset)**
· **push registration maps user id; daily-prompt delivers** · feature flags (if
used) · deep links · offline/relaunch · low-power iOS · mid/low-end Android ·
keyboard open/close on forms · notch/safe-area · orientation.
