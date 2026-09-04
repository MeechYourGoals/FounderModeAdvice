// Client access to the public "Share an insight" surface: create a share
// link for a lesson the user owns (or a community lesson), read one back for
// the public /i/:slug landing page, and record a view.
//
// The table post-dates the last generated-types refresh, so it's accessed
// through a narrow hand-written shape (same pattern as src/services/discovery.ts).

import { supabase } from "@/integrations/supabase/client";

export interface SharedInsight {
  slug: string;
  quoteText: string;
  attribution: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface CreateSharedInsightInput {
  /** Omitted for a community-lesson share — there's no owned episode row. */
  episodeId?: string;
  quoteText: string;
  attribution?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  lessonId?: string;
  communityLessonId?: string;
}

type Row = Record<string, unknown>;

const db = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, value: unknown) => {
        is: (col: string, value: unknown) => {
          maybeSingle: () => PromiseLike<{ data: Row | null; error: { message: string } | null }>;
        };
        order: (col: string, opts?: { ascending?: boolean }) => {
          limit: (n: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;
        };
      };
    };
    insert: (row: Row) => {
      select: (columns: string) => {
        single: () => PromiseLike<{ data: Row | null; error: { message: string } | null }>;
      };
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`;

/** The rich-unfurl link to hand to navigator.share / clipboard / Slack. */
export function buildShareLink(slug: string): string {
  return `${SUPABASE_FUNCTIONS_URL}/share-card/${encodeURIComponent(slug)}`;
}

/** The in-app pretty landing path (what humans land on after the redirect). */
export function buildLandingPath(slug: string): string {
  return `/i/${encodeURIComponent(slug)}`;
}

/**
 * Get-or-create a share link for a lesson. Idempotent per (owner, lesson):
 * re-opening the share sheet on the same lesson returns the existing slug
 * instead of minting a new one every time.
 */
export async function createSharedInsight(input: CreateSharedInsightInput): Promise<SharedInsight> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You must be signed in to share an insight.");

  const idColumn = input.lessonId ? "lesson_id" : "community_lesson_id";
  const idValue = input.lessonId ?? input.communityLessonId;
  if (!idValue) throw new Error("A lesson or community lesson id is required.");

  const existing = await db
    .from("shared_insights")
    .select("slug, quote_text, attribution, source_title, source_url, created_at")
    .eq(idColumn, idValue)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return mapRow(existing.data);

  const insertRow: Row = {
    created_by: userId,
    episode_id: input.episodeId ?? null,
    quote_text: input.quoteText.slice(0, 600),
    attribution: input.attribution ?? null,
    source_title: input.sourceTitle ?? null,
    source_url: input.sourceUrl ?? null,
    lesson_id: input.lessonId ?? null,
    community_lesson_id: input.communityLessonId ?? null,
  };

  const { data, error } = await db
    .from("shared_insights")
    .insert(insertRow)
    .select("slug, quote_text, attribution, source_title, source_url, created_at")
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Could not create the share link.");
  return mapRow(data);
}

/** Public read for the /i/:slug landing page — works logged out. */
export async function fetchSharedInsight(slug: string): Promise<SharedInsight | null> {
  const { data, error } = await db.rpc("get_shared_insight", { _slug: slug });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? (data[0] as Row | undefined) : undefined;
  return row ? mapRow(row) : null;
}

export async function recordSharedInsightView(slug: string): Promise<void> {
  try {
    await db.rpc("record_shared_insight_view", { _slug: slug });
  } catch (err) {
    console.warn("Could not record shared insight view", err);
  }
}

function mapRow(row: Row): SharedInsight {
  return {
    slug: String(row.slug),
    quoteText: String(row.quote_text ?? ""),
    attribution: (row.attribution as string | null) ?? null,
    sourceTitle: (row.source_title as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
  };
}
