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
  bridge messages → shell presents the in-app paywall (`Paywall.tsx`) with
  monthly length, per-plan features, auto-renew/cancel copy, and Privacy /
  Terms links, then purchases via RevenueCat/StoreKit → shell calls
  `window.iapSuccess()` → web re-verifies the entitlement server-side.
  Restore explicitly acks success/failure back to the web layer. Customer
  Center remains the RevenueCat management UI.
- Bridge security: only pages on the app's own origin can send bridge
  messages; allow-listed third-party hosts (auth, storage) render in the
  WebView but cannot drive native actions.
- Offline / renderer crash → branded retry screen, auto-recover on retry.
- Sign in with Apple: the web app asks the shell for `{ type: "appleSignIn" }`;
  EAS/dev-client/store builds present the system AuthenticationServices sheet
  and return an identity token + nonce for `supabase.auth.signInWithIdToken`.
  Expo Go falls back to web OAuth (its token audience is Expo's bundle id).
- Push: OneSignal click/foreground handlers keep the user inside the WebView
  (daily-prompt payload includes `data.path`). The OS permission prompt is
  only shown when the user enables a notification preference — never at launch.
- Share Extension (iOS) / share intent (Android): sharing a link from any app
  (Safari, YouTube, X, …) via the OS share sheet and picking "Founder Mode"
  routes the shared URL into the WebView as `/?url=<source>` — the same
  prefill path the web app's own share-landing page uses — which starts an
  analysis immediately. Backed by `expo-share-intent` (config plugin in
  `app.json`); requires a dev-client/EAS build (not available in Expo Go) and
  a new build number since it adds an iOS extension target.

## Sign in with Apple (required before first EAS production build)

1. Apple Developer → Identifiers → `com.foundermodeadvice.app` → enable
   **Sign in with Apple**.
2. Create a Services ID (e.g. `com.foundermodeadvice.app.auth`) if you also
   want web Apple sign-in, and an Apple private key (.p8) for the secret.
3. Supabase → Authentication → Providers → Apple: add the **iOS bundle ID**
   `com.foundermodeadvice.app` as a client ID (native tokens use the bundle id
   as `aud`) plus the Services ID if used for web. Configure the secret JWT.
4. Confirm `usesAppleSignIn: true` in `app.json` (already set). EAS prebuild
   writes the `com.apple.developer.applesignin` entitlement.

## Native social-auth routing

Google sign-in must not run inside the embedded WebView: Google rejects that
environment with `disallowed_useragent`. The shell intercepts the Lovable
broker's `/~oauth/initiate` navigation, presents it with
`expo-web-browser`'s `openAuthSessionAsync`, and returns the result through
`com.foundermodeadvice.app://auth/callback`. Keep that exact redirect in the
provider/Supabase allow-lists and verify it on real hardware in every
TestFlight/internal-testing round (see `docs/store-readiness.md`).

**Sign in with Apple is native** in EAS builds (see above) and does not use
this browser session. Supabase's Apple provider must include the iOS bundle ID
as a client ID or it will reject the native identity token's audience.
