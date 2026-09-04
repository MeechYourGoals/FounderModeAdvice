# Pre-launch security guard scorecard

Assessment date: 2026-09-04  
Branch: `codex/prelaunch-security-guards-20260904`

This scorecard separates repository evidence from hosted configuration. A guard
is not marked live until the migration/settings have been verified in the
Lovable-managed Supabase project.

| Guard | Repository status | Hosted status | Evidence / remaining action |
| --- | --- | --- | --- |
| 1. Secrets out of Git | PASS | Rotation required | `.env`, `.env.development`, and `.env.production` are removed from the index and ignored; `.env.example` contains names only. Redacted scan: 2,176 text blobs across 834 commits; only a legacy Supabase publishable JWT was detected. Follow `SECURITY_ROTATION_CHECKLIST.md`. No history rewrite or force-push performed or recommended from current evidence. |
| 2. Episode authorization | READY | VERIFY/APPLY | Migration removes public/anon/empty/`USING (true)` episode reads and reinstates authenticated owner, admin, folder-share, and analysis-invite reads. Public discovery remains in the metadata-only `discovery_content` table. Run the live inspection and disposable A/B SQL test in `SECURITY_EXTERNAL_SETUP.md`. |
| 3. Entitlement integrity | READY | VERIFY/APPLY | Migration drops all entitlement policies, recreates own-row SELECT only, and revokes authenticated DML on `user_subscriptions` and `user_monthly_usage`. Stripe, Paddle, and RevenueCat entitlement writers use service-role clients; client code only reads. |
| 4. Single-use invites | READY | VERIFY/APPLY | Accept RPCs lock the invite row, bind it to the signed-in email, permit only same-user idempotent retries, and reject a second user. Dedicated owner-only revoke RPCs atomically remove granted access. Disposable regression SQL covers both invite types. |
| 5. Auth UX + CAPTCHA | READY | CONFIGURE/VERIFY | `/auth` uses fixed non-enumerating error strings and sends a Turnstile token for password sign-in, sign-up, and reset. Production fails closed without the public site key. Add the secret to Supabase Auth bot protection and verify hosted rate limits/anti-enumeration controls. |
| 6. Edge config + spend | PASS (code) | DEPLOY/SMOKE TEST | `[functions.mcp] verify_jwt = false` is explicit because the MCP handler performs OAuth bearer verification/challenges itself. Paddle external IDs are allowlisted and rate-limited. Edge 5xx responses are generic. Native OAuth code is unchanged and retains the Expo auth-session/native Apple paths. Both `npm audit` and `npm audit --omit=dev` report 0 vulnerabilities after the Vite 7 upgrade; Next.js CVEs are not applicable. |
| Marketing | DRAFT ONLY | NOT PUBLISHED | `MARKETING_FIXES.md` drafts Flock removal/disclosure and pre-listing App Store copy. Delaware wording remains unchanged; no HIPAA or SOC 2 claim was added. |

## Validation record

- `npm run build` — PASS with Vite 7.3.6; existing chunk-size/import/Tailwind warnings only.
- `npm audit --omit=dev --audit-level=low` — PASS, 0 vulnerabilities.
- `npm audit --audit-level=low` — PASS, 0 vulnerabilities.
- `npx eslint` on newly added and materially changed guard code — PASS.
- `npx deno test src/lib/authErrors.test.ts` — PASS, 1 test.
- `npm run test:subscription-mapping` — PASS, 6 mappings plus native catalog alignment.
- `git diff --check` — PASS.
- Full Deno suite — ENVIRONMENT BLOCKED because this runner cannot connect to existing `deno.land` imports. No test failure was observed before dependency download failed.
- SQL authorization suite — CREATED, NOT EXECUTED here because no PostgreSQL/Supabase runtime is available. Run only against a disposable/local database.
- Full repository lint — has pre-existing `no-explicit-any` failures. The same failures reproduce from `HEAD`; focused lint for the new guard code passes.
- Dependency tree — retains a pre-existing Capacitor peer mismatch: the installed RevenueCat Capacitor package declares Capacitor 7+ while the app remains on Capacitor 6. This pass does not alter native dependencies.

## Release gate

Do not launch from this scorecard alone. Before production launch:

1. Merge/deploy the migration and edge-function changes through the normal Lovable workflow.
2. Run the post-migration policy/grant query and disposable SQL regression suite.
3. Configure both Turnstile keys and confirm invalid/missing/reused tokens fail server-side.
4. Verify Supabase Auth rate limits, email confirmation, and anti-enumeration behavior.
5. Complete credential rotation and record revocation evidence privately.
6. Resolve or formally accept the existing Capacitor/RevenueCat peer mismatch before the next native build.
