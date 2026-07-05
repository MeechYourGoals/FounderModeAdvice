## Current state (verified against DB + edge functions)

| Item | Status |
|---|---|
| `user_subscriptions.status` column | ✅ applied (12 cols present) |
| `20260705120000_add_source_uploads_and_document_sources.sql` | ❌ **NOT applied** — `source-uploads` bucket missing, `episodes.source_type` + `episodes.file_path` missing |
| `analyze-episode` upload handler (PDF / DOCX / TXT / MD / CSV / images) | ✅ code present, but blocked because bucket/columns don't exist |
| Excel (`.xlsx` / `.xls`) support | ❌ not in `SourceUploadZone` ACCEPT list, not in `extractDocumentText` |
| Rate limits on `video-chat` / `parse-deck` | ❌ not implemented (was awaiting your (a)/(b) decision — assuming (a) below) |
| SSRF guard in `_shared/transcript.ts` | ✅ done last round |

The single biggest blocker is that migration `20260705120000` never ran. Until it does, every document upload will 500 at `storage.from('source-uploads').upload(...)` because the bucket doesn't exist, and even if it uploaded, the `episodes` insert would fail on `source_type`.

## What I'll do in code (build mode)

### 1. Re-apply the source-uploads migration
Same SQL as `20260705120000_add_source_uploads_and_document_sources.sql`, wrapped so it's idempotent against partial prior runs:
- `INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING` for `source-uploads` (private).
- Three `CREATE POLICY IF NOT EXISTS` on `storage.objects` scoping insert/select/delete to `auth.uid() = (storage.foldername(name))[1]`.
- `ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'url'`.
- `ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS file_path text`.

No new public tables → no new GRANTs needed. Rollback is `DROP COLUMN` + `DELETE FROM storage.buckets`.

### 2. Add Excel (.xlsx / .xls) support end-to-end
- **Client (`src/components/SourceUploadZone.tsx`)**: add `xlsx`, `xls` to `ACCEPT` + `ALLOWED_EXT`; extend the "PDF, TXT, …" helper text and the unsupported-type toast.
- **Edge (`supabase/functions/analyze-episode/index.ts`)** — in `extractDocumentText`, add a branch before the multimodal fallback:
  - `.xlsx` → `SheetJS` (`npm:xlsx@0.18`) `read(buffer, { type: 'array' })` → for each sheet, `utils.sheet_to_csv(sheet)` joined with `\n\n# Sheet: <name>\n`, sliced to `MAX_GROUNDING_CHARS`.
  - `.xls` → same SheetJS call (it handles both). If parse throws, return the same user-actionable "Could not extract text from this document." error.
- No AI round-trip for spreadsheets — deterministic CSV extraction, cheaper and lossless for the analysis pipeline.

### 3. Redeploy touched edge functions
`analyze-episode` (Excel branch). `parse-deck` and `video-chat` only if step 4 lands the rate-limit code — otherwise skipped.

### 4. Rate limits on `video-chat` + `parse-deck` (option (a) from last round)
Assumed you want (a) — the ~30-line DB-backed limiter. If you'd rather defer, say so and I'll drop this step.

- New migration: `public.rate_limits(user_id uuid, key text, window_start timestamptz, count int, primary key (user_id, key, window_start))`, `GRANT ALL ON public.rate_limits TO service_role;` (no anon/authenticated — only edge functions touch it), RLS enabled with no policies (service-role-only access).
- New `public.check_and_increment_rate_limit(_user_id uuid, _key text, _window interval, _limit int) returns boolean` — security definer, upserts current bucket, returns `false` when over cap.
- `video-chat`: gate at 30 requests / 1 min per user. `parse-deck`: 10 / 1 min per user. On `false`, return 429 with `{ error: "Rate limit exceeded, please wait a moment." }`.

## Decisions I need from you before I switch to build mode

1. **Rate limits: (a) implement now, or (b) defer?** Default = (a).
2. **Excel row cap.** SheetJS will happily emit 500k-row CSVs. I'll slice to `MAX_GROUNDING_CHARS` (same cap as every other source) — confirm that's fine, or give me a row cap you'd prefer.
3. **`.xls` (legacy binary)** — worth supporting alongside `.xlsx`? Free with SheetJS; only cost is one more line in the allow-list. Default = yes.

Answer those (or say "go with defaults") and I'll switch to build.