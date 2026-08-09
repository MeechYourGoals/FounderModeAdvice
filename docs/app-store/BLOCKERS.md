# Launch Blockers & Open Decisions

Ordered: hard blockers first. Everything else in the release is ready or
documented. See APP_STORE_READINESS.md for the full matrix.

## Hard blockers (cannot submit without)

| # | Blocker | Owner action | Where documented |
| --- | --- | --- | --- |
| 1 | **Apple Developer membership** for Saint Marlo Labs LLC active, Agreements/Tax/Banking accepted (Paid Apps agreement) | Owner (bank/tax details) | CHATGPT_WORK_APP_STORE_CONNECT_PROMPT.md §1 |
| 2 | **EAS project link** — `eas init` (owner account) writes `extra.eas.projectId`; EAS env vars set (RevenueCat appl_ key, OneSignal id) | Owner or browser agent + one CLI command | EXTERNAL_SETUP_VALUES.json §expoEas |
| 3 | **RevenueCat project configured** (Apple app, In-App Purchase key .p8 + issuer id, products imported, entitlements, offering `default`, paywall, webhook URL + REVENUECAT_WEBHOOK_AUTH secret) | Browser agent + user-assisted .p8 upload | CHATGPT_WORK_REVENUECAT_PROMPT.md |
| 4 | **ASC subscription products** seed_monthly / series_z_monthly created, localized, priced, with review screenshots, attached to the 1.0 submission | Browser agent | CHATGPT_WORK_APP_STORE_CONNECT_PROMPT.md §6 |
| 5 | **Demo reviewer account** created + seeded per APP_REVIEW_NOTES.md; credentials entered only in ASC | Owner | APP_REVIEW_NOTES.md |
| 6 | **Supabase secrets + function deploys**: REVENUECAT_API_KEY, REVENUECAT_WEBHOOK_AUTH set; deploy `revenuecat-webhook`, `sync-revenuecat-subscription`, `delete-user-account` | Owner (dashboard/CLI) | EXTERNAL_SETUP_VALUES.json §supabase |
| 7 | **Production EAS build + TestFlight run of the FINAL TEST GATE** (purchases, restore, deletion, iPad QA) — nothing in this sandbox can execute an iOS binary | Owner devices | RELEASE_CHECKLIST.md §Test gate |
| 8 | **App-record screenshots** — authenticated storyboard frames + paywall review screenshot need the seeded demo account and a native build | Owner/designer | SCREENSHOT_BRIEF.md |

## Decisions pending (defaults proposed — confirm before console work)

| # | Decision | Recommendation | Why it's open |
| --- | --- | --- | --- |
| D1 | **RevenueCat entitlement structure** | Option A: two entitlements (`seed_subscription`, `series_z_subscription`), one per tier | Repo supports both shapes; single-entitlement over-grants C-Suite → Boardroom (REVENUECAT_MAPPING.md) |
| D2 | **Territories** | All territories (Apple default), EU only after DSA trader info is ready | Never established in repo/site; EU adds DSA requirements |
| D3 | **iPad in v1** | SHIP iPad (supportsTablet already true; responsive layouts exist; orientations configured) — pull only if TestFlight iPad QA (test-gate step 20) finds material breakage | Real-device QA impossible from this sandbox |
| D4 | **Annual plans / trials** | v1 = monthly only, no trials (matches code, site, Paddle) | Test-gate mention of "annual" has no product backing — adding SKUs is a business decision |

## Known accepted risks (not blockers, disclosed)

- **Guideline 4.2** — the app is a WebView shell with real native
  capabilities (IAP, sign-in, push, haptics, share, deep links). Precedent
  exists both ways; the mitigation is the native-value list in the review
  notes and flawless billing UX. If rejected under 4.2, the recorded
  fallback plan is: ship the same web app via Capacitor with additional
  native surfaces (bottom tab bar is already native-feeling) or begin a
  React Native screen migration — decision for that moment, not now.
- **Dev-launcher plist strings** (`NSBonjourServices`, local-network usage
  description mentioning Expo Dev Launcher) land in the production
  Info.plist because expo-dev-client is installed; the feature itself is
  compiled out of release builds. Cosmetic; standard across Expo apps.
- **Google OAuth in WebView** — see LEGAL_AND_POLICY_GAPS §7.
- **Dual-rail edge case** — a user with BOTH an active Paddle and Apple
  subscription is resolved to the higher tier by the blend logic; billing
  dedupe across rails is a support workflow, not code.
