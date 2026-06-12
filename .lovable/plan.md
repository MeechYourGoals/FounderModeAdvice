# Remove the transcript hard-block on "Ask this video"

## Problem
`supabase/functions/video-chat/index.ts` returns 409 "no transcript available" whenever `episode_transcripts` is empty. But most YouTube videos don't expose captions, so users see a dead end — even though `analyze-episode` already produced lessons, callouts, and personalized insights for the same video, and Gemini can ingest the YouTube URL directly as a video.

## Approach
Tiered grounding inside `video-chat`. Whichever sources exist, use them; only refuse if literally nothing is available.

Source priority per question:
1. **Stored transcript** (today's path) — best fidelity, free.
2. **YouTube native video input to Gemini** — for any YouTube URL, send the URL as a `file_data`/`fileUri` part to `google/gemini-2.5-flash` (the Gateway forwards to Google, which natively ingests YouTube videos). This replaces the missing transcript with the model watching the video itself.
3. **Extracted insights fallback** — lessons + callouts + personalized insights + episode metadata, which `analyze-episode` already produced and saved. This guarantees a useful answer even if (2) fails or the video isn't YouTube.

## Changes

### `supabase/functions/video-chat/index.ts`
- Detect YouTube URL from `episode.url` (reuse the id-extraction pattern used in `analyze-episode`).
- Replace the `if (!transcriptText) return 409` block with a strategy picker:
  - If transcript present → current path (unchanged).
  - Else if YouTube → build a multimodal `messages` body with a `file_data` part pointing at the YouTube watch URL, plus the insights context and the user question. Adjust system prompt: "You can watch the linked YouTube video directly. Ground answers in what the video actually says; if a claim isn't supported by the video or the extracted insights, say so."
  - Else → insights-only path with a system prompt that says answers are grounded in the app's extracted insights for this video (not the full transcript), and to flag uncertainty.
- On (2) failure (provider rejects video, 4xx/5xx), automatically retry with the insights-only path instead of bubbling the error.
- Opportunistically persist any transcript-equivalent text we manage to derive (skip for now — keep change small).
- Return a new `groundingMode: "transcript" | "video" | "insights"` field alongside `sessionId`/`message` so the UI can label the source.

### `src/components/VideoChatSheet.tsx`
- Remove the `hasTranscript === false` disabled states on the textarea, suggested-question buttons, and submit button.
- Replace the red "No transcript available… re-analyze with captions" warning with a neutral info line: "No captions found for this video — answers are grounded in the video itself (when available) and the insights already extracted." Keep the shield card.
- When a response comes back, show a small chip under the assistant bubble reflecting `groundingMode` ("From transcript" / "From video" / "From extracted insights").
- Update the history fetch to read `groundingMode` if present; otherwise default to "transcript".

### No DB / schema changes
Nothing new to migrate. `episode_transcripts` stays optional.

## Out of scope
- Server-side Whisper/yt-dlp transcription fallback. Worth doing later if Gemini's direct YouTube ingest proves unreliable, but it adds infra and cost; not needed to unblock the user-reported error.
- Non-YouTube providers (Vimeo, podcast audio). Those still fall to the insights-only path.

## Verification
1. Open a YouTube episode whose `episode_transcripts` row is empty → Ask a question → expect an answer with a "From video" chip, no red error.
2. Open an episode with a stored transcript → unchanged behavior, "From transcript" chip.
3. Force the YouTube ingest to fail (e.g., malformed url) → expect graceful fallback to "From extracted insights" answer.
4. Re-check the screenshotted episode — the red warning is gone and the composer is enabled.
