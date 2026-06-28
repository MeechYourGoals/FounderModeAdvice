# Multi-platform video support: verify & harden

## Current state (already shipped)
- `supabase/functions/_shared/transcript.ts` already detects YouTube, TikTok, Instagram, X/Twitter, Vimeo, LinkedIn, podcasts, and generic web video, and fetches transcripts via **Supadata** (`SUPADATA_API_KEY` is configured).
- `analyze-episode` and `video-chat` both consume that adapter, so non-YouTube URLs already flow through the same insight pipeline.
- `AnalysisForm` placeholders already advertise "YouTube, TikTok, Instagram, X, Vimeo, or any public video link".

So functionally this should already work end-to-end for X, TikTok, and Instagram. What's missing is **proof + UX polish + failure handling** so users don't think it's YouTube-only.

## Plan

### 1. Verification pass (no code change first)
- Run one real URL per platform through `analyze-episode` and inspect `edge_function_logs`:
  - YouTube (control), TikTok, Instagram Reel, X video post, Vimeo.
- Confirm each returns `platform` + a non-empty transcript (or a clean tiered-grounding fallback when Supadata returns nothing, e.g. silent videos).

### 2. Frontend URL validation
- In `src/components/AnalysisForm.tsx`, replace any YouTube-only regex with a generic `http(s)://` + known-host allowlist (youtube, youtu.be, tiktok, instagram, x.com, twitter.com, vimeo, plus a permissive "other" path).
- Normalize input (trim, strip tracking params, expand `youtu.be`, `vm.tiktok.com`, `t.co` short links via HEAD redirect on the server) before persisting.

### 3. Edge-function hardening (`_shared/transcript.ts`)
- Add short-link resolution for `vm.tiktok.com`, `t.co`, `instagr.am`.
- Return a structured `{ reason: "no_transcript_available" | "private" | "geo_blocked" | "unsupported" }` when Supadata yields nothing, so the UI can show a precise message instead of a generic error.
- Cache transcripts by canonical URL (existing `episodes` row already does most of this — just key on normalized URL).

### 4. UX copy + empty-state messaging
- Update landing/marketing copy and the Analyze form helper text to explicitly list supported platforms with small icons.
- When a transcript can't be obtained (e.g. silent TikTok), surface: "We couldn't pull spoken audio from this clip — insights are based on title, caption, and on-screen description." (already the tiered-grounding behavior; just expose it clearly.)

### 5. Tests
- Add a tiny `supabase/functions/_shared/transcript.test.ts` with `detectPlatform` cases for tiktok/instagram/x/vimeo/youtube/short-links.

## Out of scope
- No new providers, no schema changes, no payments changes.

## Deliverable
After Step 1, if all five platforms return clean transcripts, Steps 2–5 are the only edits; otherwise we patch the specific failing adapter path.
