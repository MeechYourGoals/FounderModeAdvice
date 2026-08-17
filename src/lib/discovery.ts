// Shared vocabulary and pure helpers for Discover.
//
// Everything here is side-effect free so it can be unit-tested without a DOM
// or a Supabase client (see src/lib/discovery.test.ts).

import type { SubscriptionTier } from "@/types/subscription";

/**
 * Discipline categories for the Inspiration Library. Adding one here is a
 * one-line change: the filter row, the seed data, and the recommendation
 * context all read from this list rather than hard-coding chips.
 */
export const DISCOVERY_CATEGORIES = [
  "Startups",
  "Entrepreneurship",
  "Leadership",
  "Product",
  "Engineering",
  "Artificial Intelligence",
  "Marketing",
  "Sales",
  "Finance",
  "Venture Capital",
  "Operations",
  "Consumer",
  "Enterprise",
  "Healthcare / Medicine",
  "Biotechnology",
  "Aerospace / Space",
  "Sports",
  "Entertainment",
  "Media",
  "Creator Economy",
  "E-commerce",
  "Design",
  "Behavioral Science",
  "Strategy",
] as const;

export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];

export const CONTENT_TYPES = ["article", "video", "podcast", "research", "essay", "other"] as const;
export type DiscoveryContentType = (typeof CONTENT_TYPES)[number];

export const RECOMMENDATION_STATES = [
  "unseen", "viewed", "opened", "saved", "analyzed", "dismissed",
] as const;
export type RecommendationState = (typeof RECOMMENDATION_STATES)[number];

const CONTENT_TYPE_LABELS: Record<DiscoveryContentType, string> = {
  article: "Article",
  video: "Video",
  podcast: "Podcast",
  research: "Research",
  essay: "Essay",
  other: "Resource",
};

export function contentTypeLabel(type: string | null | undefined): string {
  return CONTENT_TYPE_LABELS[(type ?? "other") as DiscoveryContentType] ?? "Resource";
}

/**
 * Personalized discovery is a Boardroom feature. This mirrors the server gate
 * (user_has_boardroom_plan / tier = 'series_z') — it is UX only; the edge
 * function and RLS enforce the real thing.
 */
export function hasDiscoveryAccess(tier: SubscriptionTier | undefined | null): boolean {
  return tier === "series_z";
}

/** "28 min" / "1h 12m" / null when the duration is unknown. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Short publication date for a card ("Aug 17, 2026"), or null if unknown. */
export function formatPublishedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Human label for a weekly edition, derived from when it was generated. */
export function editionLabel(generatedAt: string | null | undefined): string {
  if (!generatedAt) return "This week";
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return "This week";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * The exact payload the Analyze action hands to the existing analysis
 * pipeline. Kept as a function so the contract (which URL, which profile,
 * which recommendation to mark) is testable independently of the UI.
 */
export interface AnalyzeRequest {
  url: string;
  profileId: string | null;
  recommendationId?: string;
}

export function buildAnalyzeRequest(input: {
  url: string;
  profileId: string | null;
  recommendationId?: string | null;
}): AnalyzeRequest | null {
  const url = input.url?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return {
    url,
    profileId: input.profileId ?? null,
    ...(input.recommendationId ? { recommendationId: input.recommendationId } : {}),
  };
}

/**
 * Saving toggles between 'saved' and the state the card falls back to once
 * unsaved. Dismissing is one-way in V1.
 */
export function nextStateAfterSaveToggle(current: RecommendationState): RecommendationState {
  return current === "saved" ? "viewed" : "saved";
}

/**
 * Whether a profile is too thin for recommendations to feel personal. Mirrors
 * the `sparse` flag the server sets on the recommendation context, so the UI
 * can nudge without an extra round trip.
 */
export function profileNeedsMoreContext(profile: {
  description?: string | null;
  industry?: string | null;
} | null): boolean {
  if (!profile) return false;
  return (profile.description ?? "").trim().length < 40 && !profile.industry;
}
