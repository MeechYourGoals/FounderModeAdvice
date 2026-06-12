# Extend video analysis beyond YouTube

## Goal
Accept any public video URL — YouTube, TikTok, Instagram Reels, X/Twitter video, Vimeo, podcast MP3, LinkedIn, generic — and produce the same transcript-grounded insights + Ask-this-video chat we ship today.

## Provider choice
Use **Supadata** as the transcription provider. It's the cleanest fit for this app: one HTTP call (`GET /v1/transcript?url=...&text=true`) returns plain-text transcripts for YouTube, TikTok, Instagram, X, and Vimeo with no per-platform plumbing. Async jobs (`/transcript/{id}`) cover anything that requires audio download + ASR. Pricing is per-minute, cheaper than AssemblyAI/Deepgram for short-form social video, and there's a free tier for dev.

User provides `SUPADATA_API_KEY` as a Supabase secret.

## Server: new shared transcript adapter

New file `supabase/functions/_shared/transcript.ts`:
- `detectPlatform(url)` → `"youtube" | "tiktok" | "instagram" | "x" | "vimeo" | "linkedin" | "podcast" | "generic"`.
- `fetchOEmbedOrOg(url)` → `{ title, author, thumbnail, description }` using YouTube/Vimeo/TikTok oEmbed where available, OpenGraph scrape otherwise.
- `fetchTranscriptViaSupadata(url, { lang? })` → `{ text, language, source }` or `null`. Hits `https://api.supadata.ai/v1/transcript?url=...&text=true`. Polls the async job endpoint when the sync call returns `jobId`. 30s overall timeout, retry once on 5xx.
- `getVideoContext(url)` → orchestrates: detect → call Supadata → on success return transcript + metadata; on failure return metadata-only with `transcript: null`. Keep existing free YouTube-captions path as a fast first try for `youtube` to save Supadata credits.

## `supabase/functions/analyze-episode/index.ts`
- Remove `isYouTube` branching. Always run through the new `getVideoContext(url)`.
- Drop `videoId`/`videoTitle` YouTube-only logic; use the metadata returned by the adapter (title/author/thumbnail) to populate `episodes` row, including a new `platform` column.
- Pass the unified `transcript` (when present) to the existing Gemini prompt; when absent, keep today's "Transcript excerpt: Not available" branch so analysis still produces lessons from the title/description/profile (already supported).
- Persist into `episode_transcripts` for every platform, not just YouTube.
- Save `platform` on the episode row for UI badges.

## `supabase/functions/video-chat/index.ts`
- Already platform-agnostic after the last change. Add the same `getVideoContext` fallback inside the `hasTranscript` check: if the episode has no stored transcript yet, attempt one Supadata fetch on first chat to backfill `episode_transcripts`, then proceed. One-time cost per video.

## Database
New migration:
```sql
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS platform text;
```
No new tables, no RLS changes (column on existing table inherits policies). Backfill is unnecessary; existing rows stay `null` and default to "youtube" in the UI.

## Frontend

### `src/components/AnalysisForm.tsx`
- `normalizeUrl`: stop forcing YouTube canonicalization for non-YouTube hosts. Lowercase host only; keep path/query for TikTok/Instagram/X share links (their IDs are case-sensitive).
- Update placeholder to "Paste any public video link — YouTube, TikTok, Instagram, X, Vimeo, podcast MP3..."
- Add lightweight client-side URL sanity check (must parse, must be http/https). Real platform detection happens server-side.
- Update duplicate-check `eq('url', url)` lookup so it still matches after the normalization change (uses the same `normalizeUrl` output already).

### `src/components/EpisodesTable.tsx` + `EpisodeDetail.tsx`
- Show a small platform chip using the new `episodes.platform` value (YouTube / TikTok / Instagram / X / Vimeo / Web). Default chip "Web" when null.

### Copy updates
- Hero subhead, onboarding, and the `VideoChatSheet` empty-state copy: drop "YouTube" exclusivity language ("Paste any public video link..." everywhere).

## Secrets
Add `SUPADATA_API_KEY` via the secrets tool. Surface a clear server error if missing: "Transcript provider not configured — paste a YouTube link with captions or contact the admin."

## Out of scope (state explicitly)
- Private/auth-walled posts (private TikToks, locked Instagram, protected tweets). Supadata can't reach those either.
- Long-form podcast files >2h: still work but cost more Supadata credits; no special chunking yet.
- Speaker diarization (who said what) — Supadata returns plain text in `text=true` mode, which is what the current Gemini prompt expects.
- Replacing existing YouTube caption extractor; we keep it as the free fast-path for YouTube.

## Verification
1. Paste a TikTok URL → expect a successful analysis with title, author, lessons, and a "TikTok" chip.
2. Paste an Instagram Reel URL → same.
3. Paste an X video tweet URL → same.
4. Paste a Vimeo URL with captions → transcript-grounded lessons.
5. Paste a generic blog video / MP3 → metadata-only analysis succeeds (no red error).
6. Paste a YouTube URL with captions → unchanged behavior; Supadata not called (cost check via logs).
7. Open "Ask this video" on a freshly analyzed TikTok → answer cites transcript; subsequent questions reuse cached transcript row.
8. Paste a malformed URL → client-side rejection before any server call.
9. Temporarily unset `SUPADATA_API_KEY` and analyze a TikTok → clear error toast, no crash.
