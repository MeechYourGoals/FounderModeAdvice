# 10 — Apple Developer (Sign in with Apple for our own credentials)

**Start URL (log in first):** https://developer.apple.com/account
This is the **Developer portal**, not App Store Connect — different site, same Apple ID.

**Run `11-provider-switch.md` §1 RECON first** (it reports the callback URL Apple must
return to), and read `01-apple-developer.md` first if you have not run it. Much of what
follows is a **verify-and-read-back** pass over what script 01 already created; it only
creates something when script 01 was skipped.

Need from script 11 §1 (paste here):
```
BROKER_CALLBACK_URL=
```

--- COPY FROM HERE ---

You are configuring Sign in with Apple for **Founder Mode Advice** (Saint Marlo Labs LLC).
I am signed in at developer.apple.com/account. Work through the steps and give me the report
at the end.

## GROUND RULES

- Only touch the identifiers, keys and services named below. Do not revoke or edit any
  existing certificate, provisioning profile, key, or App ID other than the one named.
- Never delete an existing entry. If something already exists with a different value, stop
  and report it rather than changing it.
- Do **NOT** paste the contents of any `.p8` private key into the chat. Tell me it
  downloaded; I will handle the file.
- Read every value back after saving and report what the portal actually shows.
- Keep a ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED.

## CONTEXT VALUES

```
Team ID (expected):     H8G3D6S8P4
iOS App ID / bundle:    com.foundermodeadvice.app
Services ID:            com.foundermodeadvice.app.auth
Supabase auth domain:   iffcuueutmsusgdfekvm.supabase.co
Supabase callback:      https://iffcuueutmsusgdfekvm.supabase.co/auth/v1/callback
Web origin:             foundermodeadvice.com
```

## STEP 1 — Confirm the team

Read the Team ID shown in the account header. Confirm it is **H8G3D6S8P4**. If it is
different, STOP immediately and tell me — everything downstream would be wrong, including
the app's already-committed `apple-app-site-association` file.

## STEP 2 — App ID capability

Go to Certificates, Identifiers & Profiles → Identifiers, filter to App IDs, open
`com.foundermodeadvice.app`.

- Confirm **Sign In with Apple** is enabled in the Capabilities list. If it is not, enable
  it, choosing "Enable as a primary App ID".
- Leave the **Server-to-Server Notification Endpoint BLANK.** Supabase does not consume it.
- Do not disable Push Notifications or Associated Domains if they are already on — the app
  ships with both.
- Save, then reload and confirm the capability persisted.

## STEP 3 — Services ID

Go to Identifiers, switch the filter to **Services IDs**.

- If `com.foundermodeadvice.app.auth` already exists, open it. Otherwise create it:
  ```
  Description: Founder Mode Advice Auth
  Identifier:  com.foundermodeadvice.app.auth
  ```
- Enable **Sign In with Apple**, then click **Configure** and set:
  ```
  Primary App ID:          com.foundermodeadvice.app
  Domains and Subdomains:  iffcuueutmsusgdfekvm.supabase.co
                           foundermodeadvice.com
  Return URLs:             https://iffcuueutmsusgdfekvm.supabase.co/auth/v1/callback
                           <BROKER_CALLBACK_URL from script 11 §1, if it differs>
  ```
- Save. Reload and read back exactly what is stored in **Domains** and in **Return URLs**.

Two notes on this screen:

- The domain that matters is the **Supabase** domain, not foundermodeadvice.com. That is
  deliberate: Apple posts back to whoever exchanges the code, and Supabase then redirects
  onward to the app. If the portal rejects the Supabase domain, report the exact error.
- An older version of `01-apple-developer.md` lists `https://foundermodeadvice.com/auth/callback`
  as a Return URL. Apple sends a `form_post` to the return URL, and the app's SPA route
  cannot consume a POST — so that entry does nothing. It is harmless to leave in place
  (extra return URLs are ignored), but do not add it if it is absent.

## STEP 4 — Signing key

Go to Certificates, Identifiers & Profiles → **Keys**.

- If a key with Sign in with Apple already exists for this team **and we still hold its
  `.p8`**, do NOT create a second one. Report its name and Key ID and skip to step 5.
- If the `.p8` was lost, a new key is required — Apple allows the `.p8` download exactly once
  and never again. Tell me before creating one.
- If creating:
  ```
  Key Name: FMA Sign in with Apple
  Enable:   Sign in with Apple, configured with primary App ID com.foundermodeadvice.app
  ```
- USER ACTION REQUIRED: I download the `.p8` and store it privately. Confirm to me that the
  file downloaded and tell me its filename. Do not open or print its contents.
- Record the **Key ID** (10 characters).

## STEP 5 — Email relay sources

Go to Certificates, Identifiers & Profiles → Services →
**"Sign in with Apple for Email Communication"** → Configure.

Register the domain `foundermodeadvice.com` and any sender addresses used for outbound mail
(for example `CA@saintmarlolabs.com`). Report the verification status shown for each.

Without this, users who pick "Hide My Email" never receive mail from the app — including
password resets and share invitations.

## REPORT BACK

1. Team ID as displayed.
2. Whether Sign In with Apple was already enabled on `com.foundermodeadvice.app`, or you
   enabled it.
3. The Services ID string, plus the Domains and Return URLs read back after saving.
4. The Key ID, and confirmation the `.p8` downloaded (filename only, never contents).
5. Whether you created a new key or reused an existing one.
6. Email relay domain/sender verification status.
7. Any error text, quoted exactly.
8. Anything you could not complete, and why.

## CAPTURE

```
APPLE_TEAM_ID=H8G3D6S8P4        (confirm, do not assume)
APP_ID=com.foundermodeadvice.app
SIWA_ON_APP_ID=yes/no
SERVICES_ID=com.foundermodeadvice.app.auth
SERVICES_DOMAINS=[read back verbatim]
SERVICES_RETURN_URLS=[read back verbatim]
SIWA_KEY_ID=
SIWA_KEY_REUSED=yes/no
EMAIL_RELAY_STATUS=
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Team ID | | |
| 2 App ID capability | | |
| 3 Services ID + return URLs | | |
| 4 SIWA key (Key ID only) | | |
| 5 Email relay | | |

## Diary note — six months from now

The Apple client secret is a **JWT signed with that `.p8`, and Apple caps those at six
months.** When it expires, web Apple sign-in breaks for everyone with no code change to
blame. Keep the `.p8` somewhere you will find it and set a calendar reminder now.

This applies to the **web** Apple path only. In the iOS store build, Sign in with Apple runs
natively through AuthenticationServices and exchanges an identity token
(`supabase.auth.signInWithIdToken`) — that path has no six-month secret and does not rotate.
