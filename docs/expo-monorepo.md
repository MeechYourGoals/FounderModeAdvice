# Expo Monorepo — native iOS/Android via Expo Go + EAS

This repo is now a monorepo that can ship a **React Native app through Expo Go,
EAS Build, and EAS Submit**, alongside the existing web app.

> **Read this first.** Expo Go / EAS run **React Native**, not the web bundle.
> Unlike Capacitor/Despia (which wrap the existing `dist/` web build), the Expo
> app has its **own native UI** under `apps/mobile/app`. What is shared with the
> web app is *logic* (`packages/shared`: Supabase client, auth types, runtime,
> constants), not screens. Porting the full web feature set to React Native is the
> follow-up — see "Status".

---

## Layout

```
/                      # existing Vite web app — UNCHANGED, still builds/deploys from root
  apps/
    mobile/            # NEW Expo (React Native) app — Expo Router, EAS config
      app/             # routes (auth-first entry, login, authed area)
      src/             # supabase client, AuthProvider, runtime
      app.config.ts    # name/scheme/bundle ids (match Capacitor build)
      eas.json         # EAS Build + Submit profiles
      metro.config.js  # monorepo-aware resolver
  packages/
    shared/            # NEW framework-agnostic logic (web + mobile)
      src/
        supabase.ts    # createSupabaseClient({ storage, detectSessionInUrl })
        auth.ts        # AuthState, resolveAuthEntry()
        runtime.ts     # RuntimeSurface
        constants.ts   # APP_BUNDLE_ID, NATIVE_OAUTH_REDIRECT
```

### Why "web stays at root" (incremental, not a full move)

The web app is **Lovable-managed** (Lovable auto-commits to the repo root and
Vercel builds from it) and has a committed `package-lock.json`. Moving it into
`apps/web` would force a Vercel/Lovable root-directory rewire and a lockfile
regen, risking the live web deploy. So this monorepo is deliberately incremental:

- The web app's `package.json`, lockfile, and build are **untouched** — zero risk
  to the existing deploy.
- `apps/mobile` installs and builds **independently** (its own `node_modules`,
  its own `.npmrc` with `legacy-peer-deps=true`), and consumes `packages/shared`
  via a `file:` dependency that Metro resolves (SDK 52 follows symlinks).

To converge on a single-install workspace later (pnpm or npm workspaces with
`apps/web`), see "Promote to a unified workspace" at the bottom — do it when you
can also reconfigure Vercel/Lovable and regenerate the root lockfile.

---

## First-time setup

```bash
# 1) Install the mobile app (separate from the web install at root)
cd apps/mobile
cp .env.example .env            # fill EXPO_PUBLIC_SUPABASE_URL + _ANON_KEY
npm install                     # uses apps/mobile/.npmrc (legacy-peer-deps)
npx expo install --fix          # reconcile native module versions to the SDK
npx expo-doctor                 # sanity-check the install

# 2) Run in Expo Go (or a dev client)
npx expo start                  # press i / a, or scan the QR in Expo Go
```

`EXPO_PUBLIC_*` vars are bundled into the app exactly like `VITE_*` on the web;
the Supabase anon key is publishable, not a secret.

> Pinned versions in `apps/mobile/package.json` target **Expo SDK 52**
> (React 18.3.1 / RN 0.76, matching the web app's React). `npx expo install --fix`
> is the source of truth for exact native module versions — run it after install
> and after any SDK bump.

---

## EAS Build & Submit

```bash
cd apps/mobile
npm i -g eas-cli        # or: npx eas-cli@latest <cmd>
eas login
eas init                # creates the EAS project + writes extra.eas.projectId

# Builds (profiles in eas.json)
eas build --profile development --platform ios       # dev client, simulator
eas build --profile preview     --platform android   # internal QA build
eas build --profile production   --platform all       # store builds

# Submit (fill the placeholders in eas.json submit.production first)
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

Before `eas submit`, replace the placeholders in `eas.json`:

- iOS: `appleId`, `ascAppId`, `appleTeamId`
- Android: drop your Play service-account JSON at
  `apps/mobile/google-service-account.json` (gitignored)

`EAS Build` runs in Expo's cloud, so no local Xcode/Android Studio is required to
produce store binaries (a Mac is still needed only for local iOS *simulator*
runs). This is the EAS Build / EAS Submit flow — Expo's product names (the
prompt's "EIS" was a typo).

---

## Supabase — no new config needed

The Expo app reuses the **same native OAuth redirect** as the Capacitor build, so
it's already covered by `docs/store-readiness.md`:

```
com.foundermodeadvice.app://auth/callback     # native (Capacitor / Despia / Expo)
https://foundermodeadvice.com/auth/callback   # web
http://localhost:8080/auth/callback           # web dev
```

The app's `scheme` (`app.config.ts`) is `com.foundermodeadvice.app`, so
`expo-web-browser` returns to `com.foundermodeadvice.app://auth/callback`, which
must stay in Supabase → Authentication → URL Configuration. Email/password needs
nothing extra. For Google/Apple, confirm the providers are enabled in Supabase and
their console callback URLs point at the Supabase auth callback.

---

## Auth-first entry (the core requirement)

Native launch never shows marketing — `app/index.tsx` decides:

| Session state | Result |
| --- | --- |
| restoring | spinner (no flash) |
| no session | `→ /auth` (login screen) |
| valid session | `→ /home` (app shell, in the `(app)` guard group) |

`app/(app)/_layout.tsx` re-guards the authenticated area (expired session →
`/auth`). The session is restored once by `src/auth/AuthProvider.tsx` (one
`onAuthStateChange` + one `getSession()`), mirroring the web `AuthProvider`.
Sessions persist in AsyncStorage; OAuth uses PKCE and exchanges the code from the
deep link explicitly (`detectSessionInUrl: false`).

---

## Status — what's done vs. follow-up

**Done (this pass):**

- Monorepo layout (`apps/mobile`, `packages/shared`) with the web app untouched.
- Expo SDK 52 app: Expo Router, EAS Build/Submit profiles, monorepo Metro config.
- Shared logic package consumed by the mobile app.
- Auth-first entry: login (email/password + Google/Apple OAuth), session restore,
  route guard, sign-out. Bundle ids/scheme aligned with the existing native build.

**Follow-up (not in this pass):**

- Port web features to React Native: analysis flow, library/folders, episode
  detail, settings, account, sharing, onboarding.
- Native subscriptions: `react-native-purchases` (RevenueCat) + the existing
  `sync-revenuecat-subscription` edge function. (The Capacitor app already does
  this; the RN app needs its own integration.)
- Push: `expo-notifications` or the OneSignal RN SDK, mapped to the Supabase user
  id like the web `syncPushUser()`.
- App icons / splash (currently Expo defaults) before store submission.
- Decide the long-term native path (Expo vs Capacitor/Despia) — see below.

---

## Relationship to Capacitor / Despia

Both native paths now exist in the repo, **kept side by side** (nothing was
removed):

- **Capacitor / Despia** wrap the *web* build — fastest to ship, full feature
  parity today (`docs/mobile-wrapping.md`).
- **Expo / EAS** is a *native* app — more native control, but features must be
  built in React Native.

They share the same bundle id, Supabase redirect, and store listings, so only one
should be submitted per platform. Pick the long-term path before store upload; if
Expo wins, removing the Capacitor/Despia plugins is a separate cleanup.

---

## Promote to a unified workspace (optional, later)

When you can reconfigure Vercel/Lovable and regenerate the root lockfile:

1. Add `"workspaces": ["apps/*", "packages/*"]` to the root `package.json`.
2. Optionally move the web app into `apps/web` and set the Vercel/Lovable root
   directory accordingly.
3. Swap `apps/mobile`'s `file:` dependency on `@foundermode/shared` for `"*"`.
4. Add root `.npmrc` `legacy-peer-deps=true`, run a fresh install, commit the lock.
5. Verify `npx expo-doctor` and the web build both still pass.
