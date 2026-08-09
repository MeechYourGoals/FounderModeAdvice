# App Store readiness

**Assessment date:** 2026-08-09. **Release path:** `native/` Expo SDK 57 managed/CNG app → EAS Build → EAS Submit. **Verdict: BLOCKED — not yet a release candidate.**

## Initial-to-current matrix

| Area | Initial | After repository work | Evidence / remaining gate |
|---|---|---|---|
| Native build config | FAIL | BLOCKED | Profiles and production guards repaired; EAS owner/project ID, Apple team and credentials unknown. |
| App identity | PARTIAL | PARTIAL | Name and bundle ID exist in repo; must be reconciled before creating immutable records. |
| iPhone/iPad UX | NOT TESTED | NOT TESTED | `supportsTablet` remains true, portrait. Native simulator/device QA is required. |
| Minimum functionality | FAIL | FAIL | Shipping app is explicitly a hosted-site WebView shell. Native haptics, sharing, push, deep links and IAP reduce but do not eliminate Apple 4.2 risk. |
| RevenueCat client | PARTIAL | PARTIAL | Stable Supabase UUID identity, native UI, serialized purchase, verified restore, listener and foreground refresh exist. Commercial mapping and sandbox tests are blocked. |
| Server entitlement | PARTIAL | PARTIAL | Authenticated RevenueCat REST verification exists, but renewal/revocation webhook or scheduled reconciliation is absent. |
| Auth | PARTIAL | PARTIAL | Email, Google and Apple exist. Embedded Google OAuth is unsupported/fragile and needs device validation or system-browser PKCE migration. |
| Privacy/AI consent | FAIL | FAIL | AI/Lovable/Google/Supadata disclosure and explicit pre-processing consent are absent. PostHog defaults on despite consent language. |
| Account deletion | PARTIAL | FAIL | In-app flow exists, but fresh reauthentication and complete storage/relational cleanup are not proven. |
| Legal copy | FAIL | FAIL | Repository confirms Saint Marlo Labs LLC and contact, but native Apple billing/refund wording and vendor/retention disclosures need counsel review. |
| Metadata | MISSING | DRAFT | US-English draft produced; commercial and account fields remain deliberately blank. |
| Screenshots | FAIL | BLOCKED | Exact-size capture tooling/brief and raw directories exist; authenticated fictional demo state and native captures are not available. |
| Final archive/TestFlight | NOT TESTED | NOT TESTED | Requires authenticated EAS/Apple/RevenueCat setup and authorization for paid builds/submission. |

## Architecture inventory

- Root: npm-based Vite 5/React 18 SPA, React Router, Supabase Auth/Postgres/Storage/Edge Functions, Lovable hosting/auth and AI gateway, Google Gemini, Supadata transcript extraction, Paddle web billing with legacy Stripe code, PostHog analytics, OneSignal push.
- Native: npm subproject, Expo SDK 57, React Native 0.86, React 19, CNG/managed (no committed `ios/`), single `react-native-webview` shell. Native modules include RevenueCat Purchases/UI, OneSignal, haptics, browser, linking, splash and safe-area.
- No Expo Updates package is configured; release channels were removed rather than imply OTA separation.
- The binary requires the hosted app for core behavior. It launches without Metro but core functionality is not offline-native.

## Native archive inspection gate

Before upload, run clean CNG generation in a disposable directory and inspect generated `Info.plist`, entitlements, `PrivacyInfo.xcprivacy`, Pods manifests, URL schemes, associated domains and notification capability. Do not commit generated native folders without review. `ITSAppUsesNonExemptEncryption=false` is a repository assertion, not a completed legal export determination.
