// Discover data access.
//
// Every read here is protected by RLS (owner-scoped for recommendations,
// active-only for the shared library), so these queries never filter by user
// id themselves — the database does.
//
// The discovery tables post-date the last generated-types refresh, so the
// client is accessed through a narrow hand-written `Query` interface (same
// spirit as the casts in useInspirations/useFavorites, minus the `any`).
// Regenerating src/integrations/supabase/types.ts lets this shim go away.

import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/services/analytics";
import type { DiscoveryContentType, RecommendationState } from "@/lib/discovery";

export interface DiscoveryContent {
  id: string;
  url: string;
  canonical_url: string;
  title: string;
  description: string | null;
  image_url: string | null;
  publisher: string | null;
  author: string | null;
  published_at: string | null;
  content_type: DiscoveryContentType;
  duration_seconds: number | null;
  categories: string[];
  topics: string[];
  is_curated: boolean;
  featured: boolean;
}

export interface RecommendationBatch {
  id: string;
  profile_id: string;
  week_key: string;
  status: "pending" | "ready" | "failed" | "empty";
  item_count: number;
  generated_at: string;
}

export interface ProfileRecommendation {
  id: string;
  batch_id: string;
  profile_id: string;
  position: number;
  reason: string | null;
  state: RecommendationState;
  analyzed_episode_id: string | null;
  content: DiscoveryContent;
}

const CONTENT_COLUMNS =
  "id, url, canonical_url, title, description, image_url, publisher, author, published_at, content_type, duration_seconds, categories, topics, is_curated, featured";

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };

/**
 * The slice of the PostgREST builder these queries use. Declared explicitly
 * (rather than `any`) so a typo in a chained call is still a compile error,
 * while keeping the tables added after the last generated-types refresh usable.
 */
interface Query extends PromiseLike<Result> {
  select(columns: string): Query;
  insert(rows: Row): PromiseLike<Result>;
  delete(): Query;
  eq(column: string, value: unknown): Query;
  neq(column: string, value: unknown): Query;
  in(column: string, values: readonly unknown[]): Query;
  overlaps(column: string, values: readonly unknown[]): Query;
  order(column: string, options?: { ascending?: boolean }): Query;
  limit(count: number): Query;
  range(from: number, to: number): Query;
}

const db = supabase as unknown as {
  from: (table: string) => Query;
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
};

const mapRecommendation = (row: Row): ProfileRecommendation => ({
  id: String(row.id),
  batch_id: String(row.batch_id),
  profile_id: String(row.profile_id),
  position: typeof row.position === "number" ? row.position : 0,
  reason: (row.reason as string | null) ?? null,
  state: ((row.state as string) ?? "unseen") as RecommendationState,
  analyzed_episode_id: (row.analyzed_episode_id as string | null) ?? null,
  content: row.discovery_content as DiscoveryContent,
});

/** Weekly editions for a profile, newest first. Powers the archive selector. */
export async function fetchBatches(profileId: string, limit = 8): Promise<RecommendationBatch[]> {
  const { data, error } = await db
    .from("recommendation_batches")
    .select("id, profile_id, week_key, status, item_count, generated_at")
    .eq("profile_id", profileId)
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as RecommendationBatch[];
}

/** The items in one edition, in ranked order. Dismissed items stay hidden. */
export async function fetchRecommendations(batchId: string): Promise<ProfileRecommendation[]> {
  const { data, error } = await db
    .from("profile_recommendations")
    .select(
      `id, batch_id, profile_id, position, reason, state, analyzed_episode_id, discovery_content!inner(${CONTENT_COLUMNS})`,
    )
    .eq("batch_id", batchId)
    .neq("state", "dismissed")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRecommendation);
}

/** Everything the user saved, across profiles and editions. */
export async function fetchSavedRecommendations(limit = 50): Promise<ProfileRecommendation[]> {
  const { data, error } = await db
    .from("profile_recommendations")
    .select(
      `id, batch_id, profile_id, position, reason, state, analyzed_episode_id, discovery_content!inner(${CONTENT_COLUMNS})`,
    )
    .eq("state", "saved")
    .order("saved_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapRecommendation);
}

export interface LibraryQuery {
  categories?: string[];
  contentTypes?: string[];
  limit?: number;
  offset?: number;
}

/**
 * The Inspiration Library. Paginated on purpose — Discover must never load the
 * whole catalog to render its first screen.
 */
export async function fetchInspirationLibrary(query: LibraryQuery = {}): Promise<DiscoveryContent[]> {
  const limit = query.limit ?? 24;
  const offset = query.offset ?? 0;
  let request = db
    .from("discovery_content")
    .select(CONTENT_COLUMNS)
    .eq("active", true)
    .eq("is_curated", true);

  if (query.categories?.length) request = request.overlaps("categories", query.categories);
  if (query.contentTypes?.length) request = request.in("content_type", query.contentTypes);

  const { data, error } = await request
    .order("featured", { ascending: false })
    .order("priority", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as unknown as DiscoveryContent[];
}

/**
 * State changes go through an RPC, not a table UPDATE: there is deliberately no
 * client UPDATE policy, so score, reason, and position stay server-owned.
 */
export async function setRecommendationState(
  recommendationId: string,
  state: RecommendationState,
  episodeId?: string | null,
): Promise<void> {
  const { error } = await db.rpc("set_recommendation_state", {
    p_recommendation_id: recommendationId,
    p_state: state,
    p_episode_id: episodeId ?? null,
  });
  if (error) throw error;
}

/**
 * Close the Discover → Analyze loop. Called after the existing analysis
 * pipeline succeeds (or finds the memo already exists), so a card can show
 * "Analyzed" and the funnel metric has both ends. Never throws: the analysis
 * has already happened and must not be reported as failed over a bookkeeping
 * write.
 */
export async function markRecommendationAnalyzed(
  recommendationId: string,
  episodeId: string,
): Promise<void> {
  try {
    await setRecommendationState(recommendationId, "analyzed", episodeId);
    captureEvent("recommendation_analysis_completed", { episode_linked: true });
    await db.from("recommendation_events").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      recommendation_id: recommendationId,
      event_type: "analysis_completed",
      surface: "for_you",
    });
  } catch (error) {
    console.warn("Could not link analysis to recommendation", error);
  }
}

export type RecommendationEventType =
  | "impression" | "opened" | "source_opened" | "saved" | "unsaved"
  | "dismissed" | "analyze_clicked" | "analysis_completed" | "more_like_this";

export interface EventContext {
  userId: string;
  profileId?: string | null;
  recommendationId?: string | null;
  contentId?: string | null;
  surface?: "for_you" | "inspiration" | "saved";
  position?: number | null;
  /** Safe, low-cardinality properties for product analytics. */
  analytics?: Record<string, unknown>;
}

const ANALYTICS_EVENT: Partial<Record<RecommendationEventType, string>> = {
  impression: "recommendation_impression",
  opened: "recommendation_opened",
  source_opened: "recommendation_source_opened",
  saved: "recommendation_saved",
  dismissed: "recommendation_dismissed",
  analyze_clicked: "recommendation_analyze_clicked",
  analysis_completed: "recommendation_analysis_completed",
  more_like_this: "recommendation_more_like_this",
};

/**
 * Record a behavioral signal in two places: `recommendation_events` (owned
 * data that future ranking can learn from) and PostHog (product funnel).
 * Never throws — a dropped signal must not break the feed.
 */
export async function logRecommendationEvent(
  eventType: RecommendationEventType,
  context: EventContext,
): Promise<void> {
  const analyticsName = ANALYTICS_EVENT[eventType];
  if (analyticsName) captureEvent(analyticsName, context.analytics ?? {});

  try {
    await db.from("recommendation_events").insert({
      user_id: context.userId,
      profile_id: context.profileId ?? null,
      recommendation_id: context.recommendationId ?? null,
      content_id: context.contentId ?? null,
      event_type: eventType,
      surface: context.surface ?? "for_you",
      position: context.position ?? null,
    });
  } catch (error) {
    console.warn("Could not record discovery event", error);
  }
}

export interface RefreshResult {
  status: "ok" | "rate_limited" | "upgrade_required" | "error";
  itemCount?: number;
  message?: string;
}

/**
 * Manual regeneration for one profile. The edge function re-checks ownership,
 * tier, and a per-profile daily rate limit — this is a request, not a command.
 */
export async function requestRecommendationRefresh(profileId: string): Promise<RefreshResult> {
  const { data, error } = await supabase.functions.invoke("generate-recommendations", {
    body: { profileId },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 429) {
      return { status: "rate_limited", message: "You've already refreshed this profile today." };
    }
    if (status === 403) {
      return { status: "upgrade_required", message: "Personalized discovery is part of The Boardroom plan." };
    }
    return { status: "error", message: error.message || "Could not refresh recommendations." };
  }

  return { status: "ok", itemCount: (data as { itemCount?: number })?.itemCount ?? 0 };
}
