# 6 — Expo / EAS

**Start URL (log in first):** https://expo.dev

**You are already signed in.** Paste everything below the line into the browser agent.

Need from previous scripts:
RC_PUBLIC_IOS_SDK_KEY (appl_…)
ONESIGNAL_APP_ID
ASC_APP_ID_NUMERIC
APPLE_TEAM_ID

--- COPY FROM HERE ---

You are linking and configuring the Expo/EAS project for **Founder Mode Advice** (slug `founder-mode-advice`, bundle `com.foundermodeadvice.app`). Work ONLY on expo.dev in this authenticated session.

Ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED. Never print Apple credentials, keystore passwords, or secret RevenueCat keys. The iOS public RevenueCat key (`appl_`) and OneSignal App ID are public-class and may be transcribed.

**Pause for my OK before:** creating a new Expo project; triggering a paid EAS build; changing production env vars; deleting credentials.

## Important limits

- `eas init`, `eas build`, and `eas submit` are **CLI commands I run on my machine**. You cannot run them in the browser. You prepare expo.dev, then hand off the CLI lines.
- Production builds **must not** have `FMA_WEB_URL` set (the app defaults to https://foundermodeadvice.com). Production `FMA_REVENUECAT_IOS_API_KEY` must start with `appl_` — never `test_`.

## Steps

### 1. Account / org
Confirm which Expo account or organization will own the app (should be Saint Marlo Labs / the same team that ships the store build). Record the owner slug.

### 2. Project
Search for slug `founder-mode-advice` or name Founder Mode Advice. If it exists, reuse it and record **projectId** (UUID). If it does not exist: USER ACTION REQUIRED — I run locally:

```
cd native
npm install
npx eas-cli@latest login
npx eas-cli@latest init
```

That writes `extra.eas.projectId` into `native/app.json`. After I say done, you refresh expo.dev and verify the project exists. Capture projectId.

### 3. Environment variables
Project → Environment variables. Create the same names for environments **development**, **preview**, and **production**:

| Name | Visibility | development | preview | production |
| --- | --- | --- | --- | --- |
| FMA_REVENUECAT_IOS_API_KEY | Plain | appl_… (or RevenueCat Test Store `test_…` ONLY here) | appl_… | appl_… (MUST start with appl_) |
| FMA_ONESIGNAL_APP_ID | Plain | OneSignal App ID | same | same |
| FMA_WEB_URL | Plain | optional LAN/staging URL | optional staging | **LEAVE UNSET** |
| FMA_REVENUECAT_ANDROID_API_KEY | Plain | skip until Android ships | skip | skip |

You may paste the `appl_` key and OneSignal App ID into the form. Do not set a `test_` key on production (the app.config.ts production guard will fail the build).

Re-open each environment and verify.

### 4. Apple credentials
Credentials → iOS. If empty, they will be created on first `eas build` (distribution cert + provisioning profile + push). Do not upload credentials unless I ask. Record whether credentials already exist.

### 5. Hand off CLI (print these for me; do not try to run them)

After env vars are saved:

```
cd native
npx eas-cli@latest build --profile development --platform ios
```

I install that on a device and run the TestFlight-equivalent sandbox checks (Sign in with Apple, paywall, restore, deletion).

When I confirm the development build is good:

```
cd native
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --profile production --platform ios
```

If submit asks for App Store Connect app, the numeric id is ASC_APP_ID_NUMERIC from the ASC script. Optionally I will later set `native/eas.json` → `submit.production.ios.ascAppId`.

You verify on expo.dev that the production build reaches Finished. Do NOT click anything that purchases more EAS credits without my OK.

### 6. Do not
Do not change bundle identifier. Do not set FMA_WEB_URL on production. Do not submit to App Review from Expo.

## CAPTURE

```
EXPO_OWNER=
EXPO_PROJECT_ID=
EXPO_SLUG=founder-mode-advice
FMA_REVENUECAT_IOS_API_KEY_SET_PROD_APPL=yes/no
FMA_ONESIGNAL_APP_ID_SET=yes/no
FMA_WEB_URL_UNSET_ON_PROD=yes/no
DEV_BUILD_STATUS=
PROD_BUILD_STATUS=
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 Owner | | |
| 2 Project / projectId | | |
| 3 Env vars (3 environments) | | |
| 4 Credentials | | |
| 5 CLI handoff / build status | | |
