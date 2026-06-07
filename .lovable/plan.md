## What I found

**Google sign-in code is intact** in `src/pages/Auth.tsx`:
- In Lovable preview it calls `lovable.auth.signInWithOAuth("google", ...)` (managed bridge)
- On published/custom domain/native it calls `supabase.auth.signInWithOAuth({ provider: "google" })`

So the most likely cause isn't the React code — it's that the managed Google provider on the Cloud backend has drifted (disabled, or BYOC credentials expired/misconfigured after the recent security pass). The same applies to Apple, which was intentionally hidden behind a comment at lines 69–70 and never restored.

## Plan

### 1. Re-enable managed Google + Apple on the backend
Use `configure_social_auth` with `providers: ["google", "apple"]`. This (re)provisions the Lovable-managed OAuth credentials for both providers so no Apple Developer / Google Cloud setup is required from you. Email/password stays enabled.

### 2. Restore the Apple button + handler in `src/pages/Auth.tsx`
- Add `appleLoading` state and a `handleAppleSignIn` that mirrors `handleGoogleSignIn` (uses `lovable.auth.signInWithOAuth("apple", ...)` in preview, `supabase.auth.signInWithOAuth({ provider: "apple" })` elsewhere).
- Add a "Continue with Apple" outline button under the Google button in both the Sign In and Sign Up tabs, with the Apple logo SVG.
- Remove the dead comment block at lines 69–70.

### 3. Sanity-check the Google flow
- Confirm `src/integrations/lovable/index.ts` still exists and exports `lovable.auth.signInWithOAuth` (it should after the configure step).
- After the configure call, try Google on the published URL (`foundermodeadvice.com`). Per Lovable's known issue, sandboxed preview iframes can block third-party cookies during OAuth even when the provider is correctly configured — published is the source of truth.

### 4. Note on Apple credentials
This plan uses Lovable's **managed** Apple credentials (the default, zero-config option). The Apple sign-in sheet will show "Lovable" as the app name. If you later want your own app name on the Apple sheet, we can switch to BYOC and I'll walk you through the Services ID / .p8 key / Team ID setup in the Apple Developer console.

## Files touched
- `src/pages/Auth.tsx` — restore Apple button + handler, drop the hidden-comment lines
- Backend auth providers — via `configure_social_auth` (no file diff)

## Out of scope
- No changes to the email/password flow, forgot-password page, or the auth UI layout beyond adding the Apple button.
- No Capacitor/native Apple Sign In plugin work — the existing OAuth flow handles both web and the Despia wrapper.
