
## Goal
Make the Re-Analyze contract explicit and symmetric with first-time analysis: the **client** decides the ingestion mode based on `episode.source_type` and sends the actual payload (`sourceFilePath` + text, or `episodeUrl`), instead of the server looking up the prior episode via `reanalyzeEpisodeId`.

## Why change what already "works"
Today `EpisodeDetail.handleReanalyze` sends `reanalyzeEpisodeId` for documents, and `analyze-episode` re-reads `episodes` + `episode_transcripts` to reconstruct grounding. That works but:
- The server has a second, parallel ingestion path (`reanalyzeSource`) that duplicates auth/validation and diverges from the upload path.
- The client hides which mode it's in behind a magic id, which is what caused the original "Invalid URL protocol" regression.
- No symmetry with the URL branch, which already sends the real payload.

## Client changes — `src/components/EpisodeDetail.tsx`
In `handleReanalyze`, replace the `reanalyzeEpisodeId` branch:

1. Read `source_type` off the loaded episode.
2. **URL episode** (`source_type !== 'document'`): unchanged — send `{ episodeUrl: episode.url, startupProfile, userId }`.
3. **Document episode**:
   a. Fetch the stored transcript owned by the user:
      ```ts
      const { data: t } = await supabase
        .from('episode_transcripts')
        .select('transcript_text')
        .eq('episode_id', episode.id)
        .maybeSingle();
      ```
   b. If `transcript_text` is missing or `< 20` chars, toast: *"The original document text is no longer available. Please upload the document again to re-analyze."* and bail (matches the server's current 410 copy).
   c. Invoke with a new explicit payload:
      ```ts
      {
        reanalyzeText: t.transcript_text,
        sourceFileName: episode.title ?? 'Uploaded document',
        priorEpisodeId: episode.id,   // used only for the post-success delete + audit
        startupProfile,
        userId: user.id,
      }
      ```
   d. Leave the existing "delete old episode after new one succeeds" logic untouched.

## Edge function changes — `supabase/functions/analyze-episode/index.ts`
Replace the current `reanalyzeEpisodeId` block with a `reanalyzeText` branch that mirrors the upload branch:

1. Accept `reanalyzeText` and `priorEpisodeId` from the request body alongside existing fields.
2. If `reanalyzeText` is present:
   - Require `typeof reanalyzeText === 'string'` and `reanalyzeText.trim().length >= 20`; else 400.
   - Cap at `MAX_GROUNDING_CHARS` (slice, don't reject).
   - Require `sourceFileName` (string, ≤ 300 chars).
   - If `priorEpisodeId` is provided, verify ownership (`episodes.analyzed_by = authenticatedUserId` and `source_type = 'document'`); else 403/400. This preserves the existing auth guarantee without doing a transcript lookup.
   - Set `isUpload = true`, `groundingText = reanalyzeText.slice(0, MAX_GROUNDING_CHARS)`, `videoContext = displayFileName`, `sourceUrl = document://<encoded name>`, `transcript.source = 'document-upload'`.
   - Skip the storage download and the post-run `storage.remove` (there is no file this run).
3. Keep the URL branch and the fresh-upload (`sourceFilePath`) branch exactly as they are.
4. Remove the `reanalyzeEpisodeId` parameter and the `episode_transcripts` re-read from this function — that responsibility now lives on the client, which already has RLS-scoped access to its own transcripts.

## Rate limit / quota
No change. `check_and_increment_rate_limit` and `increment_analysis_count` still fire once per invocation, same as today.

## Files touched
- `src/components/EpisodeDetail.tsx` — rewrite the document branch of `handleReanalyze` (~20 lines).
- `supabase/functions/analyze-episode/index.ts` — swap the `reanalyzeSource` block (~40 lines net; mostly deletions), then redeploy.

## Verification
1. Re-Analyze on a URL episode → succeeds, same behavior as today.
2. Re-Analyze on a document episode with a stored transcript → succeeds, new memo replaces old, monthly usage +1.
3. Re-Analyze on a document episode whose transcript row is missing/short → client toast fires, no function call, no quota burn.
4. Attempt to spoof `priorEpisodeId` for another user's document via curl → 403.
5. `curl_edge_functions` a URL-mode call with `reanalyzeText` also set → server ignores `reanalyzeText` only when `episodeUrl` is used (document branch is entered strictly on `reanalyzeText` presence, so document overrides URL — matches the client contract).

## Rollback
Revert both files; the `reanalyzeEpisodeId` implementation is a single git revert away and the DB schema doesn't change.
