# 11 — Provider switch (where the sign-in screen actually changes)

**Start URL (log in first):** https://lovable.dev/projects/3d30aa39-abcb-406b-9441-e7a7f14b5734

**§1 RECON runs FIRST, before scripts 09 and 10.** It is read-only and it captures the
callback URL that Google and Apple must be told to return to. Then run 09 and 10, then come
back here for §2 onward.

Scripts 09 and 10 create credentials. **This is the one that uses them.** Until it is saved,
the app still presents Lovable's client and nothing visible changes.

Need from scripts 09 and 10 (paste here):
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=   (do NOT paste into chat — you will type it into the console)
SERVICES_ID=com.foundermodeadvice.app.auth
APPLE_TEAM_ID=H8G3D6S8P4
SIWA_KEY_ID=
```

--- COPY FROM HERE ---

You are switching **Founder Mode Advice**'s auth providers from Lovable-managed credentials
to credentials we own. I am signed in to lovable.dev with the Founder Mode Advice project
(`3d30aa39-abcb-406b-9441-e7a7f14b5734`) open. The production origin is
https://foundermodeadvice.com and the Supabase project ref is `iffcuueutmsusgdfekvm`.

I will paste secrets into the fields myself when you tell me which field is which — do not
ask me to type them into this chat.

## GROUND RULES

- Only touch the auth provider settings and redirect allowlist named below. Do not change
  the database, edge functions, deployments, custom domain, or any other setting.
- Do not remove any existing entry from the redirect allowlist.
- Never print or transcribe a client secret, `.p8` contents, service-role key, or password.
- Read every value back after saving and report what the dashboard actually shows.
- Keep a ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED.
- **Pause for my explicit OK before** changing any provider's credential mode.

---

## §1 — RECON (read-only; run this before scripts 09 and 10)

Do not change anything in this section. Navigate, read, report.

### 1a. Find the auth settings

In the Lovable project, go to **Cloud → Users → Auth settings → Sign-in methods** (label
wording varies by dashboard version; report what you actually see).

Report for **both** the Google and Apple providers:

- enabled or disabled
- whether each says **"Managed by Lovable"** or **"Use your own credentials"**
- **the exact callback / redirect URL the screen displays**, character for character

That callback URL is the whole point of this pass. Scripts 09 and 10 need it and cannot
guess it. If the screen shows more than one URL, report all of them and say which is labelled
as the redirect/callback URI to register with the provider.

### 1b. Which console owns provider config?

I am not certain whether I hold direct Supabase dashboard access to this project. Check:

Open https://supabase.com/dashboard/project/iffcuueutmsusgdfekvm

- If it loads and shows a project named for Founder Mode Advice, report **SUPABASE_DIRECT=yes**
  and also read Authentication → Providers and Authentication → URL Configuration.
- If it 404s, asks to be added to an organization, or the project is not listed, report
  **SUPABASE_DIRECT=no** and we do everything on the Lovable screens.

Report which surface exposes the Google and Apple provider credential fields. If both do,
say so — they are the same underlying project and we will use the Lovable one.

**Stop here and give me the §1 report.** I will run scripts 09 and 10, then tell you to
continue.

---

## §2 — Google provider

Pause for my OK first.

Switch Google to **"Use your own credentials"**. Tell me when the Client ID and Client Secret
fields are visible and I will fill them in.

After I confirm, save, reload, and read back:
- whether the provider is enabled
- which credential mode it is in
- the client ID (safe to print; the secret is not)

## §3 — Apple provider

Pause for my OK first. Switch Apple to **"Use your own credentials"**. Then:

**Client IDs must be the Services ID only — never comma-join the bundle ID:**

```
com.foundermodeadvice.app.auth
```

**Why the old comma-separated pair breaks web sign-in:** Supabase forwards the
Client IDs string as `client_id` on the Apple authorize URL. Apple rejects
`com.foundermodeadvice.app.auth,com.foundermodeadvice.app` with `invalid_client`
(yellow error page, no login form). Web OAuth must present the Services ID alone.

**Native iOS is a separate code path:** the App Store build uses
AuthenticationServices + `supabase.auth.signInWithIdToken`, whose token carries
the bundle ID (`com.foundermodeadvice.app`) as `aud`. That does **not** go
through this OAuth client_id field. Do not concatenate the bundle ID here.

Then tell me which fields the UI wants for the signing key — Team ID, Key ID, and either a
`.p8` file upload or a pasted private key. I will supply those values.
Team ID is `H8G3D6S8P4`.

Save, reload, and **read back the stored Client IDs string character by character.**

## §4 — Redirect allowlist

Find the auth URL configuration / redirect allowlist (on Supabase this is
Authentication → URL Configuration). Confirm all of these are present, and report the full
list verbatim. **Add only what is missing; delete nothing.**

```
https://foundermodeadvice.com/auth/callback
https://foundermodeadvice.com/**
com.foundermodeadvice.app://auth/callback
http://localhost:8080/auth/callback
http://localhost:8080/**
```

Site URL should be `https://foundermodeadvice.com`.

`com.foundermodeadvice.app://auth/callback` is the native deep link. The iOS shell completes
OAuth in an `ASWebAuthenticationSession` and the provider must be allowed to return through
that scheme, or sign-in in the app dead-ends on a blank browser sheet.

## §5 — What NOT to do

- Do **not** set any environment variable or trigger a redeploy. Unlike some other Lovable
  projects, nothing in this switch is build-time — there is no feature flag to flip. If you
  find yourself looking for one, you are on the wrong runbook.
- Do not disable the Lovable auth bridge or change the app's code.
- Do not touch the Email provider's "Confirm email" setting.

## REPORT BACK

1. §1 recon results (provider modes, callback URLs, SUPABASE_DIRECT yes/no).
2. Google provider: enabled? credential mode? client ID? (never quote the secret)
3. Apple provider: enabled? credential mode? **exact Client IDs string read back after
   saving.**
4. The full redirect allowlist and Site URL, verbatim.
5. Any warning or error text, quoted exactly.
6. Anything you could not complete, and why.

## CAPTURE

```
BROKER_CALLBACK_URL=
SUPABASE_DIRECT=yes/no
GOOGLE_MODE=managed/own
GOOGLE_ENABLED=yes/no
APPLE_MODE=managed/own
APPLE_ENABLED=yes/no
APPLE_CLIENT_IDS=[read back character by character]
REDIRECT_ALLOWLIST=[verbatim]
SITE_URL=
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| §1 Recon + callback URL | | |
| §1b Supabase access branch | | |
| §2 Google own credentials | | |
| §3 Apple own credentials + client IDs | | |
| §4 Redirect allowlist | | |

---

## Rollback

If sign-in behaves worse after this, switch both providers back to **"Managed by Lovable"**.
That returns every surface to the managed client within a minute — no redeploy, no new build,
no App Store round trip.

Nothing in this runbook changes the app's code or its bundle, which is exactly why the exit
is this cheap. Keep it that way.

## Test in this order once §4 is saved

1. **Google sign-in on the phone.** The sheet's address bar must read `accounts.google.com`,
   and the consent screen must say **"to continue to Founder Mode Advice"** — never Lovable.
   That sentence is the whole deliverable.
2. **Sign out, then sign in again.** Consecutive attempts are what a broker path fails first.
3. **Force-quit and reopen.** Still signed in proves the session persisted rather than you
   landing on a silent guest session.
4. **Apple twice — they are two different code paths.** Web Apple sign-in exercises the
   Services ID; Apple in a TestFlight build exercises the native identity token. The Client
   IDs field in §3 is the only thing keeping the second one alive, so testing only the web
   one proves nothing about the app.
5. **Email/password sign-in.** Untouched by this runbook — a regression there means something
   else changed.

## Why the broker stays (and what it would cost to remove it)

The app calls `lovable.auth.signInWithOAuth()` rather than `supabase.auth.signInWithOAuth()`;
the broker holds the secret, and calling Supabase directly returns *"missing OAuth secret"*.
This runbook does not change that — it changes *whose client the broker presents*.

Removing the broker entirely would mean a code change in `src/pages/Auth.tsx` **and a new iOS
binary**: the shell intercepts OAuth only on the broker's `/~oauth/initiate` path
(`native/App.tsx`), while a direct `…supabase.co/auth/v1/authorize` URL matches the shell's
internal-host allowlist and would load *inside* the WebView, where Google rejects it with
`disallowed_useragent`. That is a deliberate not-now, recorded here so it is not
re-litigated later.
