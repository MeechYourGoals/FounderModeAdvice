# App Store reviewer/demo account: inspection findings + seed plan

Read-only inspection of the connected production backend. Nothing was created or modified.

## 1. Does a dedicated reviewer/demo account exist?

**No.** There are 7 auth users total, and none is a dedicated App Store review/demo account. No email contains `review`, `reviewer`, `demo`, `appstore`, or `apple`, and no user metadata labels an account as a reviewer account (metadata on all accounts is only the default `email` / `email_verified` / `sub` fields).

What does exist (for context only — none is suitable to hand to Apple):

| Email | User id | Notes |
| --- | --- | --- |
| ccamechi@gmail.com | 4686dc7b-2a29-4695-9710-dc8346b6a585 | Founder super-admin (unlimited via `get_tier_max`); has 9 analyses, 2 profiles, 1 bookmark |
| chrisatown@gmail.com | da780683-ae97-4ace-b1c2-db55f3fbfb50 | Personal Google account |
| test@test.com | a43ceccf-b2e0-4e1c-acdb-11a4c82f4973 | Generic test account, currently **series_z** (paid) — wrong tier for paywall review, no content |
| devtest+1782757661@chravel-dev.com | 300ecf9c-569a-41f7-ae24-0f96bbf274b4 | Throwaway harness account |
| devtest+1782660621@example.com | a765cca3-4a7e-49ff-a640-bddb2baa1e11 | Throwaway harness account |
| clouddev+8472@example.com | ac155875-09ba-4514-9fd5-fe6335df2bd1 | Throwaway harness account (1 profile) |
| chravel-hello@chravel-dev.com | b17f2b45-9bc6-48bc-b98b-f5e5c460dbf9 | Throwaway harness account |

No passwords were read, reported, or reset. `docs/app-store/APP_REVIEW_NOTES.md` still carries placeholders for the demo credentials, consistent with this finding.

Conclusion: the demo-account blocker in `APP_REVIEW_NOTES.md` is still open. A fresh, team-controlled mailbox account must be created (email/password, email confirmed, no 2FA) before submission.

## 2. What a normal user needs after signup

Created on demand by existing code, no seeding required:
- `user_subscriptions` — one row per user, via `get_or_create_subscription` (defaults `tier='free'`, `status='active'`).
- `user_monthly_usage` — via `get_or_create_monthly_usage` (`month_year` = `YYYY-MM`, `analyses_count` default 0).
- `user_onboarding` — written when onboarding runs (`completed`, `inspirations` default `[]`).

Needed for the reviewer to see value immediately: at least one `user_startup_profiles` row (the free tier allows exactly 1, enforced by `enforce_profile_limit`), analyses in `episodes` with child `lessons`, one `episode_folders` row plus `episode_folder_assignments`, and 2 bookmarks.

## 3. Seed plan (existing tables and required fields only)

Order matters because of foreign keys and the bookmark-limit triggers.

1. `user_subscriptions` — `user_id`, `tier='free'`, `status='active'`. Free tier keeps the paywall and a sandbox purchase reviewable. Do **not** grant a paid tier.
2. `user_startup_profiles` — 1 row. Required: `company_name`, `stage` (enum `startup_stage`: `pre_seed`/`seed`/`series_a`/`series_b_plus`/`growth`/`public`/`bootstrapped`), `description`; `user_id` set to the reviewer. Use clearly fictional company data.
3. `episodes` — 3 rows, `analyzed_by` = reviewer id. Required: `title`, `url`; `founders` defaults `{}` (better to supply names), `source_type` defaults `'url'`. Set `analysis_status='completed'` and `analyzed_profile_id` to the profile above so the memo renders as finished. Recommended mix: one public YouTube founder interview, one public article URL, one `source_type` document row (with `file_path` pointing at an uploaded fictional PDF in `source-uploads`, or omit the file and keep it URL-based to avoid storage work).
4. `lessons` — 3-5 rows per episode. Required: `lesson_text`, plus `episode_id`; `impact_score` and `actionability_score` must be 1-10 (CHECK constraints). Optionally `chavel_callouts` (`callout_text`) and `personalized_insights` (`personalized_text`, `lesson_id`, `startup_profile_id`) for a richer memo.
5. `episode_transcripts` — optional; only if the reviewer should be able to exercise transcript-grounded Q&A on a free account. Required: `episode_id`, `transcript_text`.
6. `episode_folders` — 1 row: `user_id`, `name` (e.g. "Reviewer walkthrough"), optional `color`.
7. `episode_folder_assignments` — 2 rows linking two of the seeded episodes to that folder: `user_id`, `episode_id`, `folder_id`.
8. Bookmarks — 2 total, both under the free cap of 5 (`enforce_bookmarked_*_limit` uses `get_tier_max`): e.g. 1 `bookmarked_episodes` (`user_id`, `episode_id`) + 1 `bookmarked_lessons` (`user_id`, `lesson_id`), `folder_id` nullable.
9. `user_monthly_usage` — optionally set `analyses_count` to 3 for the current `month_year` so usage display matches the seeded analyses while leaving headroom under the free cap of 3-4. Leaving it at 0 is also fine and gives the reviewer a free run.
10. `user_onboarding` — set `completed=true` so the reviewer lands straight on Home instead of the onboarding flow.

Notes for whoever executes this later:
- All content must be fictional/owned or public-link based; no third-party private material.
- Seeding must run with elevated privileges (RLS on these tables is owner-scoped to `auth.uid()`), i.e. a migration or admin-key script, not the client.
- Re-verify the account and its seed rows before every submission, per `APP_REVIEW_NOTES.md`.

Nothing in this plan has been executed — say the word and I can create the account and apply the seed as a follow-up task.
