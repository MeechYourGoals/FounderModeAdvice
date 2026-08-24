# 9 — Google Cloud Console (OAuth client + consent-screen branding)

**Start URL (log in first):** https://console.cloud.google.com

**Run `11-provider-switch.md` §1 RECON first.** That read-only pass reports the exact
callback URL the auth dashboard expects. Without it you will create the OAuth client, then
have to come back to this console a second time to add a redirect URI.

**You are already signed in** as the Saint Marlo Labs Google account. Paste everything below
the line into the browser agent.

Need from script 11 §1 (paste here):
```
BROKER_CALLBACK_URL=
```

--- COPY FROM HERE ---

You are setting up a Google OAuth client for **Founder Mode Advice**, a web + iOS app owned
by **Saint Marlo Labs LLC**. I am already signed in to Google Cloud Console. Work through
the steps below, then give me the report at the end.

## Why this exists

Today the app signs users in through Lovable Cloud's *managed* OAuth client, so Google's
consent screen names **Lovable** instead of Founder Mode Advice. This script creates the
client we own. Step 11 is where it actually gets used.

## GROUND RULES

- Only touch the screens named below. Do not enable APIs, create service accounts, change
  billing, or modify any other Google Cloud project.
- Never delete an existing entry. If a field already holds a value that conflicts with what
  I ask for, stop and tell me what you found instead of overwriting it.
- Do **NOT** print the OAuth client secret in the chat. I will copy it from the console
  myself. You may print the client ID.
- After each save, reload the page and read the value back. Report what the console actually
  shows, not what you typed.
- Keep a ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED, one line of evidence each.

## STEP 1 — Project

Go to console.cloud.google.com. Select an existing project named **Founder Mode Advice** if
one exists; otherwise create a new project named exactly:

```
Founder Mode Advice
```

Tell me the project ID you ended up in.

## STEP 2 — Branding (this is what renames the sign-in screen)

Go to https://console.cloud.google.com/auth/branding and set:

```
App name:                Founder Mode Advice
User support email:      CA@saintmarlolabs.com
Application home page:   https://foundermodeadvice.com
Privacy policy link:     https://foundermodeadvice.com/privacy-policy
Terms of service link:   https://foundermodeadvice.com/terms-of-service
Developer contact email: CA@saintmarlolabs.com
```

Those legal paths are the long forms and they are exact. The app has **no** `/privacy`,
`/terms`, or `/legal` route — those return a 404 page, which is what a Google reviewer would
see.

**Authorized domains — this list must contain ONLY `foundermodeadvice.com`.**

- If `saintmarlolabs.com` is required for verification, add it and tell me.
- Do **NOT** add `supabase.co` or `lovable.app`. If either is already listed, tell me it is
  there and ask before removing it. An unowned domain in this list is what makes the consent
  screen display a raw backend URL instead of the app name.

**Logo — upload it.** The asset is in this repo at `src/assets/fma-google-auth-1024.png`
(same file also at `app-store-assets/brand/fma-google-auth-1024.png`).

Google requires **brand verification** before an External app's consent screen will display
your chosen app name *or* your logo. The name alone already puts us on that path, so adding
the logo rides the same review instead of starting a second one — there is no reason to
withhold it. Google documents brand verification as typically 2-3 business days, with a
manual review in some cases.

After saving, report whether the console shows a verification prompt or banner, and quote its
wording exactly. **Do not click "Submit for verification" without my explicit OK** — but tell
me clearly if you see it, because until that review passes the consent screen will keep
showing something other than "Founder Mode Advice".

## STEP 3 — Audience

Go to https://console.cloud.google.com/auth/audience

- User type must be **External**. If it currently says Internal, tell me before changing it —
  Internal restricts sign-in to saintmarlolabs.com accounts only and would lock out every
  real user.
- Publishing status must be **In production**. If it says "Testing", click PUBLISH APP and
  report exactly what confirmation dialog Google shows, including any verification warning.
  Do not dismiss a warning without reporting its wording to me.

## STEP 4 — Scopes

Go to https://console.cloud.google.com/auth/scopes

The app needs only these three non-sensitive scopes:

```
openid
.../auth/userinfo.email
.../auth/userinfo.profile
```

If any additional or "sensitive"/"restricted" scope is listed, do not remove it — just report
it, because sensitive scopes are what force a multi-week Google verification review.

## STEP 5 — Create the OAuth client

Go to https://console.cloud.google.com/apis/credentials
Click **Create credentials → OAuth client ID**.

```
Application type: Web application
Name:             Founder Mode Advice Auth
```

**Authorized JavaScript origins** — add both:

```
https://foundermodeadvice.com
https://www.foundermodeadvice.com
```

**Authorized redirect URIs** — add both of these:

```
<BROKER_CALLBACK_URL from script 11 §1 — paste the exact string that screen displayed>
https://iffcuueutmsusgdfekvm.supabase.co/auth/v1/callback
```

Both matter. The first is the callback the auth broker actually presents; the second is the
Supabase project's own callback, which is where the flow terminates. If you were not given a
BROKER_CALLBACK_URL, add only the Supabase one and flag that script 11 §1 has not been run —
do not guess at a broker URL.

Click **Create**.

**IMPORTANT:** if Google refuses to save a redirect URI because its domain is not an
authorized domain, do **NOT** add that domain to Authorized domains to force it through.
Stop, and report the exact error text to me — that trade-off is my call, not yours.

## REPORT BACK

1. Project ID.
2. The OAuth client ID (ends in `.apps.googleusercontent.com`).
3. Whether a client secret was generated, and confirmation that you did NOT print it.
4. The exact contents of the Authorized domains list, read back after saving.
5. Publishing status, verbatim.
6. The exact list of scopes now configured.
7. The redirect URIs saved on the client, read back after saving.
8. Whether a brand-verification prompt appeared, quoted word for word, and confirmation
   that you did NOT submit it.
9. Anything else Google warned about, quoted word for word.
10. Anything you could not complete, and why.

## CAPTURE

```
GOOGLE_PROJECT_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET_GENERATED=yes/no   (value stays out of chat)
AUTHORIZED_DOMAINS=[read back verbatim]
PUBLISHING_STATUS=
SCOPES=[read back verbatim]
REDIRECT_URIS=[read back verbatim]
LOGO_UPLOADED=yes/no
BRAND_VERIFICATION_PROMPT=[quote verbatim, or none]
BRAND_VERIFICATION_SUBMITTED=no  (needs my OK)
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Project | | |
| 2 Branding + authorized domains | | |
| 3 Audience / publishing status | | |
| 4 Scopes | | |
| 5 OAuth client + redirect URIs | | |

## What you should have when this is done

- A client ID ending `.apps.googleusercontent.com`, and a secret in your password manager.
- Publishing status reading **In production** — in Testing, sign-in caps at 100 users and
  refresh tokens die after 7 days.
- Authorized domains containing `foundermodeadvice.com` and nothing you do not own.
- The logo uploaded, and a clear answer on whether brand verification is pending.

**The rename is not instant.** Google gates the display of both the app name and the logo on
brand verification for External apps. Everything else in this runbook takes effect
immediately; the consent screen wording is the one part that waits on Google's review, so
start it early rather than saving it for launch week.
