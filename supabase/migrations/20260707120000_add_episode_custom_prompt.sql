-- Persist the optional per-analysis custom instructions so users can see the exact
-- prompt they used on any saved analysis (rendered on the analysis detail view).
-- Additive and backward-compatible: existing rows stay NULL (no prompt shown).
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS custom_prompt text;
