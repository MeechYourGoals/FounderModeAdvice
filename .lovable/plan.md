## Problem

Clicking **Add** in Manage Folders does nothing because the `episode_folders` and `episode_folder_assignments` tables are missing GRANTs to `authenticated` / `service_role`. Supabase's Data API silently rejects the insert (permission denied), the toast never fires, and the list stays empty. Same issue affects assigning episodes to folders.

## Fix

### 1. Database migration — add missing GRANTs
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episode_folders TO authenticated;
GRANT ALL ON public.episode_folders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episode_folder_assignments TO authenticated;
GRANT ALL ON public.episode_folder_assignments TO service_role;
```

### 2. Surface insert errors
In `handleCreateFolder` (EpisodesTable.tsx), show an error toast when `error` is present instead of silently failing — so future permission issues are visible.

### 3. Bulk-add UI in the Manage Folders modal
Replace the single input + Add row with a dynamic list of inputs:

- Start with one input row.
- A **＋** button next to each row appends another empty input below.
- A small **✕** button on extra rows removes that row.
- A single **Create folders** button at the bottom inserts all non-empty, trimmed, de-duplicated names in one batched `insert([...])` call.
- Enter in any field also appends a new row (so users can rapid-fire add).
- After success: clear rows back to one, refetch folders, toast `Created N folder(s)`.

Existing folder list below stays the same (color dot + name + delete).

No other files change. The "Add" pattern in `ProfileSettings.tsx` is unrelated (different tables) and is left alone.

## Files touched
- New migration (GRANTs only — no schema change)
- `src/components/EpisodesTable.tsx` — `handleCreateFolder` → `handleCreateFolders` (bulk), modal JSX rewritten for the multi-input UI
