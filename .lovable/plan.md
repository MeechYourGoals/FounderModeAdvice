
# App Store Hardening for Despia Submission

## Goal
Take Founder Mode Advice from "good native scaffolding" to "passes Apple Review §4.2 minimum-functionality". Most foundation already exists (bottom tab bar, safe-area tokens, Capacitor + Despia detection, RevenueCat paywall, OAuth deep-link, Settings page). This pass closes the four real gaps.

## What's already in place (no work needed)
- Bottom tab bar with haptics + safe-area padding (`MobileBottomNav.tsx`)
- `--safe-area-top` / `--safe-area-bottom` CSS variables + `.safe-top` / `.safe-bottom` utilities
- Despia runtime detection (`useDespia`, `isDespia()`)
- Capacitor haptics, status bar, splash, keyboard, back-button, OAuth URL handling
- Settings page (privacy, terms, sign out, theme, profile)
- Biometric-gated content via RevenueCat paywall on premium

## Scope of this pass

### 1. Tab labels + Share action (small)
Rename existing 5 tabs for App-Review clarity without breaking routes:
- Library → **Home**
- Bookmarks → **Saved**
- + FAB → **Ask** (keeps Analyze behavior)
- Profiles → **Profiles**
- Account → **Profile**

Add a native **Share** action (not a tab):
- New `<ShareButton/>` component that calls Despia's `share://` URL scheme when inside Despia, Capacitor Share plugin when native, and Web Share API otherwise.
- Mount on each bookmarked item card (Saved screen) and on the analysis result header (Ask flow).

### 2. Native share + haptics wrapper (small)
- New `src/services/nativeShare.ts` — single entry point: `shareNative({ title, text, url })`.
- Extend `src/services/despiaService.ts` with `triggerHaptic()`, `openDeepLink()`, and `registerForPush(externalId)` helpers using `despia-native` URL schemes.

### 3. OneSignal push notifications (medium)
Full integration since you confirmed.

**Requires from you before submission (not blocking this build):**
- OneSignal App ID
- OneSignal REST API key
- APNs key (.p8) uploaded to OneSignal dashboard

**What I build now:**
- Web SDK init in `main.tsx` guarded behind `isDespia() || isNative` (no SW pollution in Lovable preview).
- `setExternalUserId(user.id)` on auth.
- New table `user_notification_prefs` (user_id PK, daily_prompt bool, plan_reminders bool, marketing bool, push_token text, timezone text) with RLS.
- Settings screen: three toggles + "Send test notification" button (visible only in installed app).
- Edge function `send-daily-prompt` (cron-triggerable) that pulls users with `daily_prompt=true` and calls OneSignal REST API with a rotating founder prompt from a seeded prompts table. Cron wiring deferred (one-line `pg_cron` snippet provided in README) — needs your OneSignal keys first.
- Secrets needed (I'll request via add_secret when you're ready): `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`.

### 4. Offline cache: Saved + last analysis (medium)
- Add Dexie (IndexedDB wrapper, ~16kb gz) — lighter than building raw IDB code.
- New `src/lib/offlineCache.ts`: `cacheSavedItems(items)`, `getCachedSavedItems()`, `cacheLastAnalysis(episodeId, payload)`, `getCachedLastAnalysis()`.
- Wire into `EpisodesTable` / bookmarks query: on successful fetch, write-through to Dexie. On fetch failure or `navigator.onLine === false`, read from Dexie and show an "Offline — showing cached" banner.
- Wire `EpisodeDetail` to cache last-viewed analysis and serve from cache if offline.
- Add `<OfflineBadge/>` to the top bar that appears when `!navigator.onLine`.

### 5. Settings polish for App Review (small)
- Add "App version" row (from `package.json` via Vite `define`).
- Add notification toggles (wired to `user_notification_prefs`).
- Add "Clear offline cache" button.
- Ensure Privacy Policy, Terms, Account Deletion, Contact are all linked (already exist as pages — just verify and group them under a "Legal" section).

### 6. App Review notes file
Create `APP_REVIEW_NOTES.md` at project root with the exact text to paste into App Store Connect's review notes — calls out: bottom-tab navigation, share sheet, haptics, push opt-in, biometric-gated premium, offline Saved screen, deep links. Reviewers literally read this; it's the single biggest 4.2-rejection mitigator.

## Technical details

### Files created
```
src/services/nativeShare.ts
src/lib/offlineCache.ts
src/components/ShareButton.tsx
src/components/OfflineBadge.tsx
src/components/NotificationSettings.tsx
supabase/functions/send-daily-prompt/index.ts
supabase/migrations/<ts>_user_notification_prefs.sql
APP_REVIEW_NOTES.md
```

### Files modified
```
src/components/MobileBottomNav.tsx       (relabel only)
src/services/despiaService.ts            (add share/haptic/push/deep-link wrappers)
src/pages/Settings.tsx                   (notification toggles, version, clear cache, legal group)
src/pages/Index.tsx                      (mount OfflineBadge, wire share button into result)
src/components/BookmarkedEpisodeCard.tsx (add ShareButton)
src/components/EpisodeDetail.tsx         (cache + serve last analysis offline)
src/main.tsx                             (OneSignal init, guarded)
vite.config.ts                           (expose APP_VERSION from package.json)
package.json                             (add: dexie, react-onesignal)
```

### Database
One new table, RLS scoped to `auth.uid() = user_id`, grants to `authenticated` + `service_role`.

### Preview safety
OneSignal Web SDK is gated behind `isDespia() || Capacitor.isNativePlatform()` — never initializes in Lovable preview, dev, or plain browser. No service worker registration outside the native runtime.

### Out of scope (call out for later)
- Building the iOS bundle in Despia, App Store Connect listing, screenshots, TestFlight — those are dashboard steps you do after this code is published.
- Cron schedule for daily prompts — wired in code, you trigger it once you have OneSignal keys.
- Android publishing.

## Verification before handoff
- `MobileBottomNav` renders with new labels at mobile viewport.
- Share button visible on a bookmarked card; on web it triggers Web Share or copies to clipboard fallback.
- Settings shows 3 notification toggles, app version, clear cache, grouped legal links.
- Offline cache: with DevTools "Offline" toggled, Saved tab still renders cached items + shows offline banner.
- OneSignal init does NOT run in preview (console log confirms `Skipping push init: not native`).
- Migration applies cleanly; RLS verified via `pg_policies`.
