# Mobile Wrapping Guide — Despia, Capacitor, Expo/EAS

How to ship this web app as an iOS/Android app, and what is already wired up
for each path. See `docs/store-readiness.md` for the store-compliance runbook
and `docs/app-entry-and-runtime.md` for the app-vs-browser entry routing and
runtime-detection model.

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

## Option C — Expo / EAS

This is a Vite + React DOM app, **not** a React Native/Expo project, so
`eas build` cannot build it directly. Two ways to use EAS:

1. **WebView shell**: create a minimal Expo app whose root screen is
   `react-native-webview` pointed at the production URL, then build that shell
   with EAS. Append `?source=app` to the URL (or set a `Despia`-free custom
   user agent and adapt `isNativeWrapper()`) so the web app enters
   installed-app mode. You re-implement push/IAP bridges in the shell.
2. **Full migration** to Expo Router + React Native — a rewrite of the UI
   layer; only worth it if you need deep native UI later.

Despia (A) and Capacitor (B) are strictly less work than an EAS shell today,
because their bridges are already wired.

## Smoke test checklist (any wrapper)

- [ ] Tab bar visible on Home / Saved / Speakers / Settings / Account, hidden on the auth screen
- [ ] Tab bar clears the home indicator (safe area) and hides while typing
- [ ] No pinch-zoom, no zoom on input focus, no pull-to-refresh
- [ ] Status bar readable in both themes; splash matches `#0f1420`
- [ ] OAuth round-trips back into the app (deep link, not Safari)
- [ ] Haptics fire on tab taps
