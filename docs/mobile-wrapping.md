# Mobile Wrapping Guide — Expo/EAS, Despia, Capacitor

How to ship this web app as an iOS/Android app, and what is already wired up
for each path. See `docs/store-readiness.md` for the store-compliance runbook
and `docs/app-entry-and-runtime.md` for the app-vs-browser entry routing and
runtime-detection model.

**Current plan of record: Option C (Expo/EAS)** — the shell app in `native/`
is committed and store-ready; build with `eas build`, submit with
`eas submit`. Despia and Capacitor remain fully wired as alternatives.

## What the web app already does for native feel

These behaviors are built in and apply to **any** wrapper (they key off runtime
detection in `src/lib/appMode.ts`, not a specific vendor):

| Behavior | Where |
| --- | --- |
| Bottom tab bar (5 slots, raised center FAB) on every signed-in screen, hidden on desktop | `src/components/AppChrome.tsx`, `src/components/MobileBottomNav.tsx` |
| Safe-area insets via `--safe-area-top` / `--safe-area-bottom` (Despia injects these; `env(safe-area-inset-*)` is the fallback) | `src/index.css` |
| Tab bar slides away while the on-screen keyboard is up | Capacitor `Keyboard` plugin + `visualViewport` fallback in `src/lib/capacitor.ts` |
| Pinch-zoom and input-focus zoom disabled in installed-app contexts only (web keeps zoom for accessibility) | `src/main.tsx` |
| No pull-to-refresh / rubber-band on the document; inner lists still scroll natively | `src/index.css` (`overscroll-behavior-y`) |
| Haptic feedback on nav taps (Capacitor Haptics or Despia `haptics://`) | `src/lib/capacitor.ts` |
| Status bar style + color follows dark/light theme | `src/lib/capacitor.ts` |
| Auth-first launch for installed apps; marketing homepage stays web-only | `src/lib/appMode.ts` (`shouldShowAppAuthFirst`) |
| Android hardware back button → history back / exit | `src/lib/capacitor.ts` |
| Push (OneSignal) initialized inside installed apps; signed-in user mapped to the OneSignal external id so server sends can target the device | `src/services/pushService.ts`, `src/components/AppChrome.tsx` |
| Product analytics (PostHog) — native `posthog://` bridge in Despia, web SDK in Capacitor/PWA, gated to installed apps; screen + identify/reset wired | `src/services/analytics.ts`, `src/components/AppChrome.tsx` |
| 16px inputs on mobile (no iOS auto-zoom on focus) | `src/components/ui/input.tsx` |

## Option A — Despia (fastest, recommended for first launch)

Despia wraps the deployed web URL; no native projects live in this repo.

1. Deploy the web app (production build: `npm run build`).
2. In the Despia dashboard, point the app at the production URL.
3. Despia-specific hooks already in the code:
   - safe-area CSS variables (injected by the Despia runtime)
   - `haptics://`, `deeplink://`, `push://register` bridges in `src/services/despiaService.ts`
   - `push://register` is called per-user from `src/services/pushService.ts` (mapped on login in `AppChrome`)
   - `posthog://` analytics bridge in `src/services/analytics.ts`
   - RevenueCat paywall bridge (`revenuecat://launchPaywall`) for IAP
   - runtime detection via the `Despia` user-agent token
4. Configure in the Despia dashboard: app icons, splash, OneSignal app ID,
   PostHog (enable the integration + native rebuild), RevenueCat keys, and the
   `com.foundermodeadvice.app` bundle id.

## Option B — Capacitor (native projects, full control)

Config (`capacitor.config.ts`) and plugins are committed; the `ios/` and
`android/` projects are generated locally (they are not in the repo):

```bash
npm ci
npm run cap:add:ios        # once, on a Mac with Xcode
npm run cap:add:android    # once, with Android Studio
npm run cap:build          # build web + sync both platforms
npm run cap:ios            # open Xcode
npm run cap:android        # open Android Studio
```

Then per platform: signing, icons/splash (`resources/`), push entitlement
(OneSignal), and the OAuth deep-link scheme `com.foundermodeadvice.app://`
(already handled in `src/lib/capacitor.ts`).

## Option C — Expo / EAS (plan of record)

The Expo shell app lives in **`native/`** — a monorepo sibling of the web
app. It renders the deployed web app in a `react-native-webview` and bridges
native capabilities over postMessage. See `native/README.md` for the full
run/build/submit guide.

What is wired up:

- **Runtime detection**: the shell ships a Safari-like user agent with the
  `FMAShell/<version>` token; `src/services/expoShellService.ts` +
  `isNativeWrapper()` treat it as an installed app (auth-first entry, tab
  bar, no pinch zoom). It also loads `/?source=app` as a second signal.
- **Safe areas**: real device insets injected as `--safe-area-top/bottom`
  (same convention Despia uses).
- **Haptics**: `triggerHapticFeedback()` routes to expo-haptics via the
  bridge, including success/warning/error notification patterns.
- **IAP**: `presentPaywall`/`restorePurchases`/`presentCustomerCenter` send
  bridge messages; the shell presents the native RevenueCat paywall/customer
  center (react-native-purchases) and reports back through the same
  `window.iapSuccess` callback Despia uses; the edge function re-verifies
  entitlements server-side. Stripe/Paddle checkout is blocked in the shell,
  same as other native runtimes.
- **Push**: OneSignal initializes natively in the shell; `syncPushUser()`
  maps the signed-in Supabase user id via the bridge (login + logout).
- **Share**: `shareNative()` uses the native share sheet via the bridge.
- **Theme**: status bar + root view follow dark/light theme changes.
- **Navigation**: Android hardware back walks web history; external links
  open the in-app browser; `mailto:`/`tel:` go to the OS; deep links
  (`com.foundermodeadvice.app://` and https app links) route into the WebView.

Quick reference (root `package.json` has `native:*` scripts):

```bash
cd native && npm install
npm start                                   # Expo Go (IAP/push no-op there)
eas build --profile production --platform all
eas submit --platform ios && eas submit --platform android
```

The alternative remains a **full migration** to Expo Router + React Native —
a rewrite of the UI layer; only worth it if you need deep native UI later.

## Smoke test checklist (any wrapper)

- [ ] Tab bar visible on Home / Saved / Speakers / Settings / Account, hidden on the auth screen
- [ ] Tab bar clears the home indicator (safe area) and hides while typing
- [ ] No pinch-zoom, no zoom on input focus, no browser rubber-band pull-to-refresh (the app's own `PullToRefresh` on the home library is expected)
- [ ] Status bar readable in both themes; splash matches `#0c0e15`
- [ ] OAuth round-trips back into the app (deep link, not Safari)
- [ ] Haptics fire on tab taps
