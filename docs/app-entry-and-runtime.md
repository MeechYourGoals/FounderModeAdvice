# App‑vs‑Browser Entry & Runtime Detection

How Founder Mode Advice decides whether to open on the **marketing homepage** or
straight on the **auth/app shell**, how it tells the runtimes apart, and how auth
flows back into each one.

This is the FounderModeAdvice adaptation of a task originally written for an
Expo/EAS app. The requirement is the same — *installed apps open into login, the
mobile web/PWA can still browse the marketing page first* — but the architecture
here is different, so the implementation is too. Read this alongside
`docs/mobile-wrapping.md` (wrapper options) and `docs/store-readiness.md`
(store/Supabase runbook); this doc does not repeat their dashboard steps.

---

## TL;DR for the Expo/EAS reader

| Original (golfready) assumption | Reality in this repo |
| --- | --- |
| Expo Router / React Navigation | **Vite + React DOM SPA**, React Router v6 (`src/App.tsx`) |
| Separate `apps/mobile` Expo app in a monorepo | **One web build wraps natively** via Capacitor 6 (primary) or Despia (fallback). No second app, so no monorepo split — see below. |
| `EAS Build` / `EAS Submit` (the prompt's "EIS" typo) | **`npm run cap:*`** → Xcode / Android Studio, or the **Despia dashboard**. EAS does not build a Vite DOM app directly (`docs/mobile-wrapping.md` Option C). |
| `Platform.OS === 'ios' \| 'android'` | `Capacitor.isNativePlatform()` + `Capacitor.getPlatform()`, the `Despia` UA token, and installed‑PWA checks — centralized in `src/lib/appMode.ts`. |
| Native deep‑link scheme `golfready://` | `com.foundermodeadvice.app://auth/callback` (matches the bundle id). |

### Why there is no monorepo / Expo app

A monorepo with `apps/web` + `apps/mobile` exists to host **two separate
codebases** that share logic. This app does not have two codebases: iOS, Android,
and web all run the **same `dist/` bundle**, wrapped by Capacitor or Despia
(`capacitor.config.ts` → `webDir: 'dist'`). The "shared code" goal a monorepo
buys you is already met — there is only one code path. Splitting into an Expo
`apps/mobile` would mean *rewriting the UI in React Native* and re‑implementing
the RevenueCat / OneSignal / PostHog bridges that are already wired for
Capacitor + Despia. That is a strictly larger, deploy‑breaking change with no
benefit to the stated requirement.

If a true React Native client is ever wanted, the migration path is in
`docs/mobile-wrapping.md` Option C; do the package extraction then, not now.

---

## Runtime model — one source of truth

All "where are we running" logic lives in **`src/lib/appMode.ts`**. Components
must not re‑derive it from `navigator.userAgent` or viewport width.

```ts
type RuntimeSurface =
  | "native-ios"
  | "native-android"
  | "web-desktop"
  | "web-mobile-browser"
  | "web-pwa";
```

| Helper | Returns | Used for |
| --- | --- | --- |
| `isNativeWrapper()` | Capacitor native **or** `Despia` UA token **or** `?source=app` | the native gate |
| `isStandalonePWA()` | `display-mode: standalone` / iOS `navigator.standalone` | installed PWA |
| `isLovablePreview()` | Lovable sandbox hosts only | route OAuth through the Lovable bridge |
| `shouldShowAppAuthFirst()` | `isStandalonePWA() \|\| isNativeWrapper()` | **the entry routing decision** |
| `getRuntimeSurface()` | the `RuntimeSurface` above | analytics labels / layout hints |
| `getOAuthRedirectUrl()` | native scheme vs `${origin}/auth/callback` | OAuth `redirectTo` |

**Native is never inferred from a mobile user‑agent or a small viewport.** It
comes from real runtime signals (the Capacitor bridge, the Despia UA token, or an
explicit `?source=app` launch param for a generic WebView shell). Desktop‑vs‑
mobile‑browser is a viewport check used only for layout, never to decide
native‑ness. All helpers are `typeof window`‑guarded, so they are safe to call at
module scope and are trivially unit‑testable (pure functions over `window` /
`navigator` / `Capacitor`).

---

## Entry routing

`src/pages/Index.tsx` (the `/` route) is the single decision point:

```tsx
if (!loading && !user) {
  // Installed app / PWA / native → login immediately. Browser → marketing.
  return shouldShowAppAuthFirst() ? <Navigate to="/auth" replace /> : <PublicLanding />;
}
if (loading) {
  return <AppLoadingScreen label="Preparing your library..." />;
}
// authenticated → the app shell renders below
```

Resulting behavior:

| Surface | Unauthenticated launch | Authenticated launch |
| --- | --- | --- |
| Native iOS / Android (Capacitor or Despia) | `/auth` immediately | app shell |
| Installed PWA | `/auth` immediately | app shell |
| Mobile browser | marketing homepage | app shell |
| Desktop browser | marketing homepage | app shell |

**No marketing flash:** while the session is still restoring, Index renders
`AppLoadingScreen` (a neutral spinner), *not* the marketing page — so an
authenticated native relaunch never flashes marketing before the app. The
auth/marketing decision is only made after `loading` is `false`.

> **Product note:** installed **PWA** is currently treated as auth‑first
> (`shouldShowAppAuthFirst` includes `isStandalonePWA()`). The golfready default
> was "PWA stays marketing‑first." If you want the PWA to land on marketing like a
> normal browser, drop `isStandalonePWA()` from `shouldShowAppAuthFirst()` — that
> one line is the only lever. Left as‑is because the existing product chose
> auth‑first for installed surfaces.

`src/pages/Auth.tsx` complements this: it hides its close (✕) button in
installed‑app/PWA contexts (nowhere to close *to*), and it redirects an
already‑authenticated user to `/` instead of showing a redundant login form —
except during a password‑reset (`?reset=true`) so the recovery flow can finish.

---

## Auth / session handling

* **Single provider.** `src/hooks/useAuth.tsx` is an `AuthProvider` (wrapped in
  `src/App.tsx`) with **one** `onAuthStateChange` listener and **one**
  `getSession()` restore for the whole tree. (It was previously a bare hook, so
  every consumer opened its own listener + session request and resolved `loading`
  on its own timeline.) The listener is registered before the restore call and
  cleaned up on unmount.
* **Session persistence.** `localStorage`, `persistSession`, `autoRefreshToken`
  (`src/integrations/supabase/client.ts`). Capacitor/Despia webviews expose
  `localStorage`, so no native secure‑store shim is required today.
* **Redirect targets** (`getOAuthRedirectUrl()`):
  * Web → `https://foundermodeadvice.com/auth` (apex PKCE return; `/auth` exchanges `?code=`)
  * Native → `com.foundermodeadvice.app://auth/callback`, caught by the Capacitor
    `appUrlOpen` listener in `src/lib/capacitor.ts`, which calls
    `exchangeCodeForSession(url)`, then routes to `/` on success or **`/auth` on
    failure** so a failed exchange is recoverable.
  * Native Apple (Expo shell) → `signInWithIdToken` with bundle
    `com.foundermodeadvice.app` — not web OAuth.

### Supabase dashboard — redirect URLs

Authentication → URL Configuration must allow (already documented in
`docs/store-readiness.md`):

```
https://foundermodeadvice.com/auth                  # production web PKCE return
https://foundermodeadvice.com/**                    # production web
http://localhost:8080/auth                          # local dev
http://localhost:8080/**                            # local dev
com.foundermodeadvice.app://auth/callback           # native (Capacitor/Despia/Expo)
```

If Google/Apple OAuth is enabled, confirm each provider's callback still points at
the Supabase auth callback; the native round‑trip returns through the scheme above.
**No RLS / Edge Function / secret changes are required by the entry‑routing work** —
it is entirely client‑side routing and session wiring.

---

## What changed (2026‑06)

| File | Change |
| --- | --- |
| `src/hooks/useAuth.tsx` | Bare hook → `AuthProvider` context; one listener + one session restore; identical public API (`user`, `session`, `loading`, `signOut`, `deleteAccount`). |
| `src/App.tsx` | Wrap the tree in `<AuthProvider>` (outside the Subscription/ActiveProfile providers that consume it). |
| `src/pages/Auth.tsx` | Redirect already‑authenticated users to `/` (skipped during `?reset=true`). |
| `src/lib/capacitor.ts` | OAuth deep‑link: route to `/auth` on exchange failure instead of always `/`. |
| `src/lib/appMode.ts` | Add typed `RuntimeSurface` + `getRuntimeSurface()`, derived from the existing predicates (no second source of truth). |
| `src/main.tsx` | Tag the `native_app_opened` analytics event with `surface`. |

The core entry behavior (`shouldShowAppAuthFirst()` in `Index.tsx`) and the
detection helpers already existed; this pass hardened the auth/session layer and
formalized the runtime surface.

---

## Manual QA matrix

| Check | Expected |
| --- | --- |
| Desktop browser, logged out | marketing homepage |
| Mobile browser, logged out | marketing homepage |
| Native iOS/Android, logged out | `/auth` immediately, no marketing flash |
| Native iOS/Android, valid session | app shell, no login |
| Native relaunch with expired session | spinner → `/auth` |
| Installed PWA, logged out | `/auth` (see product note) |
| Native OAuth round‑trip | returns into the app via the scheme; failure → `/auth` |
| Web login still works | email + Google/Apple unchanged |
| Logout (web & native) | returns to the correct unauthenticated surface |

Console/network sanity: a single auth/session request on load (one listener, one
`getSession`), no repeated login‑form mount loop, no 401 loop, no marketing flash
during restore.
