# Founder Mode Advice — Expo shell (`native/`)

The iOS/Android app for the stores. It is a thin native wrapper (Expo SDK 57 +
`react-native-webview`) around the production web app in the repo root — one
codebase serves web, PWA, and both app stores. The web app detects this
runtime via the `FMAShell` user-agent token and drives native features
(haptics, RevenueCat paywalls, OneSignal push, share sheet, theming) over the
postMessage bridge. See `src/services/expoShellService.ts` (repo root) for the
web side and `App.tsx` here for the native side.

## Develop with Expo Go

```bash
cd native
npm install
npm start            # scan the QR code with Expo Go
```

By default the shell loads https://foundermodeadvice.com. To point it at your
local dev server instead (device and laptop on the same network):

```bash
# repo root, terminal 1 — expose vite on the LAN
npm run dev -- --host

# native/, terminal 2
FMA_WEB_URL=http://<your-lan-ip>:8080 npm start
```

**Expo Go limits:** RevenueCat and OneSignal are custom native modules, so
paywalls/push silently no-op in Expo Go. Everything else (browsing, auth,
haptics, safe areas, share) works. Use an EAS development build to test
purchases:

```bash
eas build --profile development --platform ios
```

## First-time EAS setup

```bash
npm install -g eas-cli
eas login
cd native
eas init             # links the project, writes extra.eas.projectId
```

Then set build-time secrets (EAS → project → Environment variables, or
`eas env:create`):

| Variable | Purpose |
| --- | --- |
| `FMA_REVENUECAT_IOS_API_KEY` | RevenueCat public SDK key (iOS) — required for IAP |
| `FMA_REVENUECAT_ANDROID_API_KEY` | RevenueCat public SDK key (Android) — required for IAP |
| `FMA_ONESIGNAL_APP_ID` | OneSignal app id — required for push |
| `FMA_WEB_URL` | Optional web origin override (defaults to production) |

## Build & submit

```bash
cd native
eas build --profile production --platform all     # store binaries
eas submit --platform ios                          # App Store Connect
eas submit --platform android                      # Google Play
```

Before the first submit:

- **iOS**: fill `submit.production.ios.ascAppId` in `eas.json` with the App
  Store Connect app id (create the app at appstoreconnect.apple.com with
  bundle id `com.foundermodeadvice.app` first). `eas submit` will prompt for
  Apple credentials and can manage certificates automatically.
- **Android**: download a Play Console service-account JSON key to
  `native/play-service-account.json` (gitignored). The first AAB must be
  uploaded to Play Console manually; `eas submit` handles every build after.

The full store runbook (RevenueCat products, privacy labels, screenshots,
review notes) lives in `docs/store-readiness.md`.

## How the wrapper behaves

- Loads `https://foundermodeadvice.com/?source=app`, so the web app enters
  installed-app mode (auth-first, bottom tab bar, native billing boundary).
- Injects `--safe-area-top/--safe-area-bottom` CSS variables from the real
  device insets (same convention as the Despia wrapper).
- Android hardware back walks web history, then exits at the root.
- External links open in the in-app browser sheet; `mailto:`/`tel:` go to the
  OS; app/auth/Supabase/Google/Apple hosts stay inside the WebView.
- Ships a Safari-like user agent (with the `FMAShell` token) so Google OAuth
  works inside the WebView.
- Deep links (`com.foundermodeadvice.app://…` and
  `https://foundermodeadvice.com/…` app links) route into the WebView.
- Purchases: web sends `paywall` / `restorePurchases` / `customerCenter`
  bridge messages → shell presents RevenueCat native UI → shell calls
  `window.iapSuccess()` → web re-verifies the entitlement server-side.
  Restore explicitly acks success/failure back to the web layer.
- Bridge security: only pages on the app's own origin can send bridge
  messages; allow-listed third-party hosts (auth, storage) render in the
  WebView but cannot drive native actions.
- Offline / renderer crash → branded retry screen, auto-recover on retry.

## Known limitation — Google OAuth in the WebView

Google sign-in runs inside the WebView using a browser-like user agent — the
same mechanism the Despia wrapper for this app uses. Google officially
discourages embedded-WebView OAuth (`disallowed_useragent`), and while the
browser UA keeps it working today, Google could tighten detection. Verify
Google sign-in on real hardware in every TestFlight/internal-testing round
(it's in the `docs/store-readiness.md` checklist). If it breaks, the fix is
to route OAuth through `expo-web-browser`'s `openAuthSessionAsync` and
return via the app scheme — that requires moving the PKCE exchange out of
the WebView's storage, so treat it as a deliberate follow-up, not a quick
patch. Email/password and Apple sign-in are unaffected.
