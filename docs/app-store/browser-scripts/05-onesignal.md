# 5 — OneSignal

**Start URL (log in first):** https://dashboard.onesignal.com

**You are already signed in.** Paste everything below the line into the browser agent.

Need from previous scripts:
APPLE_TEAM_ID, APNS_KEY_ID, bundle id `com.foundermodeadvice.app`
You will upload the APNs .p8 yourself when asked.

--- COPY FROM HERE ---

You are configuring OneSignal push for **Founder Mode Advice** (iOS bundle `com.foundermodeadvice.app`). Work ONLY in this authenticated dashboard.onesignal.com session.

Ledger: DONE / BLOCKED / USER ACTION REQUIRED / FAILED. Never print REST API keys or .p8 contents. I type/upload those.

**Pause for my OK before:** creating a new OneSignal app; uploading a new APNs key; any plan upgrade.

## Target

- App name: Founder Mode Advice
- Platform: Apple iOS
- Bundle ID: com.foundermodeadvice.app
- External user id in our app = Supabase auth user UUID (do not change OneSignal to email)
- Permission prompt: we request OS permission only when the user enables a notification preference in-app. In OneSignal, do **not** enable an automatic start-up web prompt (this is a native iOS app).
- Public App ID goes to Expo env `FMA_ONESIGNAL_APP_ID` and Supabase secret `ONESIGNAL_APP_ID`
- REST API key goes only to Supabase secret `ONESIGNAL_REST_API_KEY`

## Steps

### 1. App
Search existing apps for Founder Mode Advice / this bundle id. Reuse if present. If creating: pause for OK, create iOS app with bundle `com.foundermodeadvice.app`.

### 2. APNs
Settings → Platforms → Apple iOS → APNs.
USER ACTION REQUIRED: I upload the APNs Auth Key (.p8) from Apple Developer, and type **Key ID**, **Team ID**, and bundle id `com.foundermodeadvice.app`. You verify the platform shows Configured / Valid. Never echo the .p8.

### 3. Keys
Settings → Keys & IDs.
- Record **OneSignal App ID** (UUID, public-class) in CAPTURE.
- REST API Key: USER ACTION REQUIRED — I copy it into Supabase secret `ONESIGNAL_REST_API_KEY`. You confirm a REST key exists; do not print it.

### 4. iOS notification settings
- Confirm the app is using native iOS (not web push) as the primary channel.
- Disable any “prompt on app open” / auto-prompt if that toggle exists for this app type.
- Leave default notification icons unless a Founder Mode icon is already uploaded.

### 5. Test (optional)
If an EAS development build is installed on a device, I can trigger a test push later. Mark NOT TESTED unless I confirm a device received a notification.

## CAPTURE

```
ONESIGNAL_APP_ID=
ONESIGNAL_BUNDLE=com.foundermodeadvice.app
ONESIGNAL_APNS_CONFIGURED=yes/no
ONESIGNAL_REST_KEY_SET_IN_SUPABASE=yes/no (do not print key)
ONESIGNAL_AUTO_PROMPT_DISABLED=yes/no
```

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| 1 App | | |
| 2 APNs | | |
| 3 App ID + REST key exists | | |
| 4 Auto-prompt off | | |
| 5 Test push | | |
