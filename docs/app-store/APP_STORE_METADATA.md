# App Store Metadata — US English (v1.0)

Everything below is derived from the shipping app's real behavior. Fields
marked (ASC-only) cannot be pushed via EAS Metadata and must be entered in
App Store Connect. `native/store.config.json` mirrors the EAS-supported
subset — do not push it without review.

## Identity

| Field | Value | Notes |
| --- | --- | --- |
| App name (30) | `Founder Mode Advice` | 19 chars |
| Subtitle (30) | `Advice memos from any source` | 28 chars |
| Bundle ID | `com.foundermodeadvice.app` | immutable; must match cert/profile |
| SKU | `FMA-IOS-001` | internal, immutable |
| Primary language | English (U.S.) | |
| Primary category | Business | |
| Secondary category | Productivity | |
| Copyright | `© 2026 Saint Marlo Labs LLC` | |

## Promotional text (170 max)

> Turn any founder interview, investor podcast, article, or private deck into an operating memo for YOUR company — lessons, risks, and next moves, grounded in the source.

(168 chars)

## Description

```
Founder Mode Advice turns the endless stream of founder, investor, and
operator content into decisions you can actually execute.

Paste almost any public link — a YouTube interview, podcast episode, article,
newsletter, or post — or upload private documents like PDFs, notes, and
screenshots on paid plans. In minutes you get a transcript-grounded operating
memo: the core lessons, the risks that apply to you, concrete action items,
and advice mapped to your company's stage and industry.

BUILT FOR OPERATORS
• Operating memos, not summaries — every insight is grounded in what was
  actually said, with impact and action scores
• Company-aware analysis — create business profiles (stage, industry, model)
  and get advice tailored to each venture you run or advise
• Ask follow-up questions — go deeper on any analyzed source with
  transcript-grounded Q&A (The Boardroom plan)
• Build a founder intelligence library — organize analyses into folders,
  bookmark the insights that matter, find them again instantly
• Share with your team — invite teammates and advisors to shared folders and
  discuss individual insights (The Boardroom plan)
• Share any insight — turn a lesson into a branded card for Slack, iMessage,
  or your feed, or share a link straight from any app to start an analysis
• Community Library — search general lessons other founders have already
  pulled from public sources when you're not sure where to start
• Native app experience — Sign in with Apple, haptics, share sheet, optional
  daily founder prompt and weekly briefing notifications

PLANS
Free: 1 business profile, 3 source analyses per month, organized library.
The C-Suite: 20 analyses/month, private document upload, up to 5 profiles.
The Boardroom: unlimited analyses and profiles, Ask-the-video AI chat,
exports, multi-profile batch analysis, and team sharing.

Paid plans are auto-renewing monthly subscriptions billed to your Apple
Account. The exact price is shown at checkout before you pay, renewal can be
cancelled anytime in Settings → Apple Account → Subscriptions, and access
continues to the end of the paid period.

Founder Mode Advice analyzes public content and the documents you choose to
upload. It is independent and does not provide private access to, or
endorsement from, any person referenced in a source, and its output is
informational — not professional, legal, financial, or investment advice.

Privacy Policy: https://foundermodeadvice.com/privacy-policy
Terms of Use: https://foundermodeadvice.com/terms-of-service
```

## Keywords (100 bytes max)

```
founder,startup,advice,ai memo,podcast summary,transcript,investor,vc,pitch deck,operator
```
(89 bytes; no duplicated words from name/subtitle wasted — "advice" repeats the
app name and can be swapped for `mentor` if search performance warrants.)

## URLs

| Field | Value |
| --- | --- |
| Marketing URL | https://foundermodeadvice.com |
| Support URL | https://foundermodeadvice.com/contact |
| Privacy Policy URL | https://foundermodeadvice.com/privacy-policy |
| Terms of Use (EULA) | https://foundermodeadvice.com/terms-of-service (entered in the License Agreement/App Information field; standard Apple EULA + these terms) |
| User privacy choices / deletion URL | https://foundermodeadvice.com/account-deletion |

## Version release text (What's New, v1.0)

```
Welcome to Founder Mode Advice 1.0:
• Turn links, videos, podcasts, and private documents into operating memos
• Company-aware insights via business profiles
• Ask-the-video Q&A, exports, and team sharing on The Boardroom
• Organized library with folders, bookmarks, and search
```

## Release options

- Manual release after approval (recommended for 1.0 so store setup, webhook,
  and web parity can be verified on release day).
- Phased release: optional; not required for a new app.

## Age rating questionnaire (answer honestly in the live form)

| Topic | Answer | Rationale |
| --- | --- | --- |
| Violence/horror/sexual content/nudity/profanity (all) | None | business content app |
| Alcohol/tobacco/drugs, gambling, contests | None | |
| Unrestricted web access | **No** | The shell restricts navigation to the app + auth origins; outbound links open in the system in-app browser (SFSafariViewController), the app is not a general browser |
| User-generated content exposure | Users see only their own submitted content plus content explicitly shared with them by invited teammates; there is no public feed. Answer the UGC questions accordingly (invite-only sharing, reportable via support). |
| AI-generated content | **Yes** — the app generates AI text (memos, Q&A) from user-submitted business sources. Mature/unfiltered AI chat: No (analysis is grounded in submitted business content; server-side prompts constrain output). |
| Medical/treatment info | None |
| Expected result | Low age band (4+/9+ under the current tiered system) — accept whatever the live questionnaire computes; never answer to force a rating. |

## App Review configuration (ASC-only)

- Sign-in required: YES → provide demo account (see APP_REVIEW_NOTES.md;
  credentials are a launch blocker until created).
- Review contact: first/last name + phone + email of the owner
  (CA@saintmarlolabs.com unless the owner supplies a different reviewer contact).
- Notes: paste from docs/app-store/APP_REVIEW_NOTES.md.
- Attachment: none required (paywall screenshot goes on the SUBSCRIPTION
  review field, not the app record).

## Export compliance

- Uses only standard TLS/HTTPS via Apple frameworks and standard libraries;
  no proprietary cryptography. `ITSAppUsesNonExemptEncryption=false` is set in
  the binary, so no per-build questions appear.
- France: standard-encryption exemption applies; no French declaration filed.
- If Apple's form asks: "Does your app use encryption?" → Yes (HTTPS) →
  "exempt under category 5D992 mass-market/standard encryption".

## Content rights declaration

- The app accesses third-party content: YES (users submit public URLs;
  transcripts are retrieved via the Supadata API; AI output quotes/derives
  from that content for the submitting user's private use).
- Declare that you have the rights or permissions needed. Read
  LEGAL_AND_POLICY_GAPS.md §Transcript sourcing before signing this —
  counsel should bless the fair-use/API-terms posture.

## Advertising identifier (IDFA) / ATT

- The app contains NO advertising SDK, does not track users across apps or
  websites, and shares no data with data brokers.
- IDFA question: **No, the app does not use the Advertising Identifier.**
- ATT prompt: NOT included (correct — apps that don't track must not show it).

## Subscription group & product localization (ASC-only)

Group reference name: `Founder Mode Advice Subscriptions`
Group display name (en-US): `Founder Mode Advice`

| | The C-Suite | The Boardroom |
| --- | --- | --- |
| Product ID | `seed_monthly` | `series_z_monthly` |
| Reference name | The C-Suite Monthly | The Boardroom Monthly |
| Display name (en-US) | The C-Suite | The Boardroom |
| Description (45) | `20 analyses/mo, doc upload, 5 profiles` | `Unlimited analyses, AI chat, sharing` |
| Duration | 1 month | 1 month |
| Price (US base) | $9.99 | $19.99 |
| Free trial | none | none |
| Group level | 2 | 1 (higher service level) |
| Review notes | Unlocks 20 analyses/month, private document upload, 5 business profiles. | Unlocks unlimited analyses/profiles, Ask-the-video chat, exports, team sharing. |
| Review screenshot | Capture the LIVE RevenueCat paywall on a real build showing this product with its localized price (see SCREENSHOT_BRIEF.md §Paywall) | same |

Both products must be attached to the 1.0 version submission ("first
subscription must be submitted with a new app version").

## App Store subscription disclosure (shown in metadata per 3.1.2)

Included in the description above ("Paid plans are auto-renewing…") plus the
Privacy Policy and Terms links in the metadata fields — Apple requires both
links present on the store page for auto-renewing subscriptions.
