# 1 — Apple Developer

**Start URL (log in first):** https://developer.apple.com/account

**You are already signed in.** Paste everything below the line into the browser agent.

--- COPY FROM HERE ---

You are configuring Apple Developer for **Founder Mode Advice**, published by **Saint Marlo Labs LLC**. Work ONLY in this already-authenticated browser session on developer.apple.com. Do not navigate to other companies’ sites.

Keep a completion ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED + one-line evidence. Never ask for, transcribe, or screenshot: passwords, 2FA codes, .p8/.p12 private-key contents, banking, or tax numbers. When a secret must be created, hand off: tell me which screen is open, I type/upload, I say “done”, you verify the masked/saved state and continue.

**Pause and wait for my explicit OK in chat before:** creating an App ID or Services ID; creating a signing/push/Sign in with Apple key; accepting paid agreements; changing tax/banking.

## Goal

Prepare the App ID, Sign in with Apple, Push, Associated Domains, and the keys later consoles need. Capture Team ID, Key IDs, and Services ID.

## Steps

### A. Membership
1. Open https://developer.apple.com/account
2. Confirm the team/membership is **Organization: Saint Marlo Labs LLC**. If it is an Individual membership, STOP → USER ACTION REQUIRED (the App Store seller name would be the individual).
3. Open https://developer.apple.com/account/resources/agreements/list (or Membership → Agreements). Note Paid Applications / Apple Developer Program status. If agreements are pending, USER ACTION REQUIRED: I accept them myself; you only verify the resulting “Active” badge.
4. Record the **Team ID** (10-character, Membership details). This is public-class; put it in the CAPTURE block.

### B. App ID
1. Open https://developer.apple.com/account/resources/identifiers/list
2. Search `com.foundermodeadvice.app`. Reuse if it exists and is owned by this team. If owned by another team, STOP.
3. If missing: pause, confirm with me, then create **App IDs → App** with:
   - Description: Founder Mode Advice
   - Bundle ID: **Explicit** `com.foundermodeadvice.app`
4. Edit the App ID and enable (do not enable anything else):
   - **Sign In with Apple** (Enable as Primary App ID)
   - **Push Notifications**
   - **Associated Domains**
   - In-App Purchase is usually already on for explicit App IDs — leave it on
5. Save. Re-open and verify each capability is On.

### C. Services ID (web Apple sign-in fallback + Supabase)
1. Identifiers list → filter Services IDs. Look for `com.foundermodeadvice.app.auth` or similar.
2. If missing: pause, confirm, then create Services ID:
   - Description: Founder Mode Advice Auth
   - Identifier: `com.foundermodeadvice.app.auth`
3. Enable **Sign In with Apple** → Configure:
   - Primary App ID: `com.foundermodeadvice.app`
   - Domains and Subdomains: `foundermodeadvice.com` and `iffcuueutmsusgdfekvm.supabase.co`
   - Return URLs (exact):
     - `https://iffcuueutmsusgdfekvm.supabase.co/auth/v1/callback`
     - `https://foundermodeadvice.com/auth/callback`
4. Save. Record the Services ID string in CAPTURE.

### D. Keys (user uploads the files; you never see contents)
We need two Apple keys (they can be separate keys or combined if Apple still allows multiple services on one key — prefer separate for blast-radius):

1. **Sign in with Apple key**
   - Open https://developer.apple.com/account/resources/authkeys/list
   - If a key already exists with Sign in with Apple enabled and we still have the .p8, reuse it. If the .p8 was lost, we must create a new key (Apple only lets you download .p8 once).
   - If creating: pause for OK → Keys → + → name `FMA Sign in with Apple` → enable Sign in with Apple → configure with Primary App ID `com.foundermodeadvice.app` → Continue → Register.
   - USER ACTION REQUIRED: I download the .p8 and store it privately. You record **Key ID** only (never the file).
2. **Apple Push Notifications (APNs) key** — used by OneSignal and by EAS
   - If a key already has Apple Push Notifications service (APNs), reuse it and record its Key ID.
   - If creating: pause for OK → name `FMA APNs` → enable APNs → Register.
   - USER ACTION REQUIRED: I download the .p8. You record **Key ID**.
3. Optionally note whether an **In-App Purchase key** should be created in App Store Connect instead (Users and Access → Integrations → In-App Purchase). Do NOT create that here; the RevenueCat script handles it on appstoreconnect.apple.com.

### E. App Groups (informational)
EAS/OneSignal NSE may create `group.com.foundermodeadvice.app.onesignal` at build time. Do not create extra groups. If Apple asks later, allow that group.

## CAPTURE (print this at the end; I will paste it into later scripts)

```
APPLE_TEAM_ID=
APP_ID=com.foundermodeadvice.app
SERVICES_ID=com.foundermodeadvice.app.auth
SIWA_KEY_ID=
APNS_KEY_ID=
MEMBERSHIP=Organization Saint Marlo Labs LLC? yes/no
PAID_AGREEMENT=Active/Pending
CAPABILITIES_VERIFIED=Sign in with Apple, Push, Associated Domains
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| A Membership + Team ID | | |
| B App ID + capabilities | | |
| C Services ID + return URLs | | |
| D SIWA key (Key ID only) | | |
| D APNs key (Key ID only) | | |
