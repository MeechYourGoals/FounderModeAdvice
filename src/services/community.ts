// Community Library data access: search/browse content other founders have
// already analyzed, read the crowdsourced generic lessons for one item, and
// manage the contribution opt-out. Mirrors src/services/discovery.ts (same
// post-generated-types-refresh table access pattern).

import { supabase } from "@/integrations/supabase/client";
import type { DiscoveryContent } from "@/services/discovery";

export interface CommunityContent extends DiscoveryContent {
  community_analysis_count: number;
  last_community_analysis_at: string | null;
}

export interface CommunityLesson {
  id: string;
  content_id: string;
  lesson_text: string;
  category: string | null;
  founder_attribution: string | null;
  impact_score: number | null;
  actionability_score: number | null;
  times_seen: number;
}

type Row = Record<string, unknown>;

const db = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, value: unknown) => {
        order: (col: string, opts?: { ascending?: boolean }) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;
        maybeSingle: () => PromiseLike<{ data: Row | null; error: { message: string } | null }>;
      };
    };
    upsert: (row: Row, opts: { onConflict: string }) => PromiseLike<{ error: { message: string } | null }>;
  };
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const mapContent = (row: Row): CommunityContent => ({
  id: String(row.id),
  url: String(row.url),
  canonical_url: String(row.canonical_url),
  title: String(row.title),
  description: (row.description as string | null) ?? null,
  image_url: (row.image_url as string | null) ?? null,
  publisher: (row.publisher as string | null) ?? null,
  author: (row.author as string | null) ?? null,
  published_at: (row.published_at as string | null) ?? null,
  content_type: row.content_type as DiscoveryContent["content_type"],
  duration_seconds: (row.duration_seconds as number | null) ?? null,
  categories: (row.categories as string[]) ?? [],
  topics: (row.topics as string[]) ?? [],
  is_curated: Boolean(row.is_curated),
  featured: Boolean(row.featured),
  community_analysis_count: Number(row.community_analysis_count ?? 0),
  last_community_analysis_at: (row.last_community_analysis_at as string | null) ?? null,
});

export async function searchCommunity(query: string, limit = 24, offset = 0): Promise<CommunityContent[]> {
  const { data, error } = await db.rpc("search_community", { _query: query, _limit: limit, _offset: offset });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapContent);
}

export async function fetchCommunityLessons(contentId: string): Promise<CommunityLesson[]> {
  const { data, error } = await db
    .from("community_lessons")
    .select("id, content_id, lesson_text, category, founder_attribution, impact_score, actionability_score, times_seen")
    .eq("content_id", contentId)
    .order("times_seen", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((row) => ({
    id: String(row.id),
    content_id: String(row.content_id),
    lesson_text: String(row.lesson_text),
    category: (row.category as string | null) ?? null,
    founder_attribution: (row.founder_attribution as string | null) ?? null,
    impact_score: (row.impact_score as number | null) ?? null,
    actionability_score: (row.actionability_score as number | null) ?? null,
    times_seen: Number(row.times_seen ?? 1),
  }));
}

/** Defaults to true (contribute) when no row exists yet — matches the DB column default. */
export async function fetchContributesToCommunity(userId: string): Promise<boolean> {
  const { data, error } = await db
    .from("user_privacy_prefs")
    .select("contribute_to_community")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? Boolean(data.contribute_to_community) : true;
}

export async function setContributesToCommunity(userId: string, value: boolean): Promise<void> {
  const { error } = await db
    .from("user_privacy_prefs")
    .upsert({ user_id: userId, contribute_to_community: value }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
