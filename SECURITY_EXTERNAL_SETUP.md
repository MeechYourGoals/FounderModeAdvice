# Pre-launch security setup outside the repository

Date prepared: 2026-09-04

These settings cannot be made safe by frontend code alone. Complete them in the Founder Mode Advice Lovable-managed backend before production deployment. Do not paste secret values into Lovable chat, GitHub, or a ticket.

## Cloudflare Turnstile + Supabase Auth

1. In Cloudflare Turnstile, create a managed widget allowlisted only for the production Founder Mode Advice domain(s), the active Lovable preview domain used for QA, and localhost only if local testing is required.
2. Put the public site key in the web deployment as `VITE_TURNSTILE_SITE_KEY`.
3. In the Lovable-managed Supabase project, open Auth → Bot and Abuse Protection, enable CAPTCHA, select Cloudflare Turnstile, and enter the Turnstile secret there.
4. Redeploy the web app. The `/auth` email sign-in, sign-up, and password-reset calls now pass `captchaToken`; Supabase Auth performs the server-side verification.
5. Confirm a missing, expired, reused, and invalid token is rejected. Confirm a valid token permits each email-auth flow.
6. Google and Apple OAuth remain provider-native. In the Expo iOS shell, Apple must remain on AuthenticationServices and OAuth must not run inside the WebView.

Production fails closed when `VITE_TURNSTILE_SITE_KEY` is absent: email-auth forms display that verification is unavailable. Configure both sides before deploying this branch.

## Auth abuse controls

In the Lovable-managed Supabase project, inspect Auth → Rate Limits and preserve or tighten the platform protections. At minimum, verify:

- [ ] Signup-confirmation requests have a per-request cooldown.
- [ ] Password-recovery requests have a per-request cooldown.
- [ ] OTP/magic-link requests have a per-request cooldown and hourly cap if enabled.
- [ ] Verification and token endpoints retain Supabase's IP-based rate limits.
- [ ] Email confirmation is enabled for production.
- [ ] Custom SMTP is configured before launch-volume email; the built-in provider is not a launch-scale delivery system.
- [ ] The frontend returns the same reset response whether or not an account exists and never displays provider/database error text.

## Live policy inspection

Run these read-only checks in the Lovable-managed database SQL console before applying the migration, then again afterward:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'episodes', 'user_subscriptions', 'user_monthly_usage',
    'folder_invites', 'analysis_invites'
  )
order by tablename, cmd, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'episodes', 'user_subscriptions', 'user_monthly_usage',
    'folder_invites', 'analysis_invites'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Apply `20260904090000_prelaunch_security_guards.sql` through the Lovable-managed migration workflow. Then run `supabase/tests/prelaunch_security_guards.sql` against a disposable branch/local database, not production data.
