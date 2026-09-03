# Agentic browser scripts — iOS launch consoles

Copy **one script at a time** into ChatGPT / Claude / Perplexity’s browser
agent **after you are already signed in** on that site. Each file is
self-contained (no repo needed).

## How to use

1. Open the **Start URL** for that script and log in with your credentials
   (2FA stays with you — never paste codes into the agent).
2. Copy everything below the `--- COPY FROM HERE ---` line in that file.
3. Paste it into the browser agent and let it run.
4. When it says **USER ACTION REQUIRED**, you type the secret / upload the
   file / confirm an immutable create. Then tell it to continue.
5. At the end it prints a **CAPTURE** block. Paste those values into the
   next script’s “Values from previous consoles” section.

## Run order (do not skip)

Dependencies: Apple IDs → App Store Connect products → RevenueCat import →
ASC notification URLs. OneSignal + PostHog before Supabase so those secrets
exist when you fill Edge Function secrets. Expo last among consoles except
Lovable (Team ID for AASA can be done anytime after Apple Developer).

| # | Website | Start signed-in at | Script |
| --- | --- | --- | --- |
| 1 | Apple Developer | https://developer.apple.com/account | `01-apple-developer.md` |
| 2 | App Store Connect | https://appstoreconnect.apple.com/apps | `02-app-store-connect.md` |
| 3 | RevenueCat | https://app.revenuecat.com | `03-revenuecat.md` |
| 4 | App Store Connect (return — Server Notifications) | https://appstoreconnect.apple.com/apps | `02b-asc-server-notifications.md` |
| 5 | OneSignal | https://dashboard.onesignal.com | `05-onesignal.md` |
| 6 | PostHog | https://us.posthog.com | `07-posthog.md` |
| 7 | Supabase | https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm | `04-supabase.md` |
| 8 | Expo / EAS | https://expo.dev | `06-expo-eas.md` |
| 9 | Lovable (web env) | https://lovable.dev/projects/3d30aa39-abcb-406b-9441-e7a7f14b5734 | `08-lovable-web-env.md` |

CLI you still run locally after #8 (the browser cannot): `cd native && eas init`, `eas build`, `eas submit`. The Expo script tells you exactly when.

---

## OAuth ownership (scripts 09–12) — separate track

Scripts 01–08 get the **iOS build** to the App Store. Scripts 09–12 fix a different
problem: Google's consent screen should name **Founder Mode Advice**, not Lovable.
The app signs in through **Supabase Auth** (`supabase.auth.signInWithOAuth` in
`src/pages/Auth.tsx`) with OAuth clients we own — not the Lovable Cloud Auth broker.

These four configure Google and Apple dashboard credentials and Supabase provider
secrets. **Deploy the auth code change** (Supabase PKCE on apex) before expecting
production sign-in to match this runbook.

### Run order — recon first

The redirect URI Google and Apple need is whatever the auth dashboard displays, so a
read-only pass runs before the credential-creating scripts:

```
11 §1 RECON  →  09 Google Cloud  →  10 Apple Developer  →  11 §2+ SWITCH  →  12 ASC audit
(read-only;     (uses the           (uses the              (enters the        (read-only)
 captures the    captured             captured               credentials)
 callback URL)   callback)            callback)
```

Run 09 before 11 §1 and you will have to return to Google Cloud a second time to add a
redirect URI.

| # | Website | Start signed-in at | Script |
| --- | --- | --- | --- |
| 11 §1 | Lovable (recon only) | https://lovable.dev/projects/3d30aa39-abcb-406b-9441-e7a7f14b5734 | `11-provider-switch.md` §1 |
| 9 | Google Cloud Console | https://console.cloud.google.com | `09-google-cloud-oauth.md` |
| 10 | Apple Developer | https://developer.apple.com/account | `10-apple-oauth.md` |
| 11 §2+ | Lovable (the switch) | https://lovable.dev/projects/3d30aa39-abcb-406b-9441-e7a7f14b5734 | `11-provider-switch.md` §2–§4 |
| 12 | App Store Connect | https://appstoreconnect.apple.com | `12-app-store-connect-audit.md` |

### Three things that will bite you

- **The rename waits on Google.** Brand verification gates the display of an External app's
  name *and* logo on the consent screen — typically 2-3 business days. Everything else in
  scripts 09-12 takes effect on save; the consent-screen wording does not. Start script 09
  early. Because the name is on that path anyway, upload the logo
  (`src/assets/fma-google-auth-1024.png`) in the same pass — it rides the same review.

- **The Apple Client IDs field must contain both** `com.foundermodeadvice.app.auth` **and**
  `com.foundermodeadvice.app`. The Services ID serves web sign-in; the bundle ID serves the
  native AuthenticationServices sheet, whose identity token carries the bundle ID as its
  audience. Drop the bundle ID and native Apple sign-in breaks in the shipped app.
- **There is no feature flag.** Some Lovable projects gate a Supabase-direct auth path behind
  a `VITE_FEATURE_*` variable. This repo has none and needs none — nothing in scripts 09–12
  is build-time. If a script tells you to set an env var and redeploy, it is not this one.

### Overlap with script 01

`01-apple-developer.md` already creates the App ID, Services ID and SIWA key. If you ran it,
`10-apple-oauth.md` is mostly a verify-and-read-back pass; it only creates what 01 skipped.
