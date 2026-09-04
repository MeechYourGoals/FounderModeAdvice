// Pure helpers that turn one completed analysis into a Community Library
// contribution: a discovery_content row (reusing the same URL normalizer as
// the Discover catalog) and a set of scrubbed, de-identified lessons.
//
// Nothing here talks to the database — analyze-episode calls
// community_register_analysis (a SECURITY DEFINER RPC) with the objects this
// module builds. Kept side-effect-free so it's unit-testable.

import { contentKey, canonicalizeUrl, youTubeVideoId } from "./discovery/url.ts";
import { mentionsViewerCompany, sanitizeLessonText } from "./genericLessons.ts";

export interface AnalyzedLesson {
  text: string;
  category?: string | null;
  founderAttribution?: string | null;
  impactScore?: number | null;
  actionabilityScore?: number | null;
}

export interface CommunityContentInput {
  sourceUrl: string;
  title: string;
  founderNames?: string | null;
  channelName?: string | null;
  podcastName?: string | null;
  releaseDate?: string | null;
  topics?: string[];
}

export interface CommunityContentRow {
  url: string;
  canonical_url: string;
  content_key: string;
  title: string;
  description: string | null;
  image_url: string | null;
  publisher: string | null;
  author: string | null;
  published_at: string | null;
  content_type: "video" | "article";
  duration_seconds: null;
  language: string;
  categories: string[];
  topics: string[];
}

export interface CommunityLessonRow {
  lesson_text: string;
  category: string | null;
  founder_attribution: string | null;
  impact_score: number | null;
  actionability_score: number | null;
  text_hash: string;
}

// Founder Mode's per-analysis topic vocabulary (supabase/functions/analyze-episode's
// CANONICAL_TOPICS) doesn't match Discover's browsing categories
// (src/lib/discovery.ts DISCOVERY_CATEGORIES) one-to-one, so contributions
// are mapped onto the closest Discover category rather than duplicating the
// vocabulary. Falls back to "Startups" so nothing is ever uncategorized.
const TOPIC_TO_CATEGORY: Record<string, string> = {
  Marketing: "Marketing",
  Sales: "Sales",
  Fundraising: "Venture Capital",
  Hiring: "Leadership",
  Competitors: "Strategy",
  Product: "Product",
  Growth: "Startups",
  Operations: "Operations",
  Leadership: "Leadership",
  AI: "Artificial Intelligence",
  Engineering: "Engineering",
  Design: "Design",
  Pricing: "Strategy",
  Distribution: "Marketing",
  Community: "Creator Economy",
  Bootstrapping: "Entrepreneurship",
  Enterprise: "Enterprise",
  Brand: "Marketing",
  "Product-Market Fit": "Startups",
  Strategy: "Strategy",
  Culture: "Leadership",
};

export function mapTopicsToCategories(topics: string[] | undefined): string[] {
  const mapped = new Set<string>();
  for (const topic of topics ?? []) {
    const category = TOPIC_TO_CATEGORY[topic];
    if (category) mapped.add(category);
  }
  if (mapped.size === 0) mapped.add("Startups");
  return Array.from(mapped);
}

function isValidReleaseDate(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** discovery_content row for a completed analysis. Returns null for an unparseable URL. */
export function buildCommunityContent(input: CommunityContentInput): CommunityContentRow | null {
  const canonical = canonicalizeUrl(input.sourceUrl);
  const key = contentKey(input.sourceUrl);
  if (!canonical || !key) return null;

  const videoId = youTubeVideoId(input.sourceUrl);
  const publisher = input.channelName?.trim() || input.podcastName?.trim() || null;

  return {
    url: canonical,
    canonical_url: canonical,
    content_key: key,
    title: input.title.trim().slice(0, 500),
    description: null,
    image_url: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null,
    publisher,
    author: input.founderNames?.trim() || null,
    published_at: isValidReleaseDate(input.releaseDate) ? input.releaseDate : null,
    content_type: videoId ? "video" : "article",
    duration_seconds: null,
    language: "en",
    categories: mapTopicsToCategories(input.topics),
    topics: (input.topics ?? []).slice(0, 3),
  };
}

/** sha256 hex digest of the normalized lesson text — the community_lessons dedupe key. */
export async function hashLessonText(text: string): Promise<string> {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Scrub every lesson for the viewer's company, then drop any lesson that
 * still mentions it (or the company's site) after scrubbing rather than
 * publish a leaky lesson. Only generic lessons — never
 * personalized_insights — should ever be passed in here.
 */
export async function prepareCommunityLessons(
  lessons: AnalyzedLesson[],
  companyName: string | null | undefined,
  companyWebsite?: string | null,
): Promise<CommunityLessonRow[]> {
  const companyHost = companyWebsite ? hostFromUrl(companyWebsite) : null;
  const out: CommunityLessonRow[] = [];

  for (const lesson of lessons) {
    if (!lesson.text?.trim()) continue;
    const scrubbed = sanitizeLessonText(lesson.text, companyName);
    if (mentionsViewerCompany(scrubbed, companyName)) continue;
    if (companyHost && scrubbed.toLowerCase().includes(companyHost.toLowerCase())) continue;

    out.push({
      lesson_text: scrubbed,
      category: lesson.category ?? null,
      founder_attribution: lesson.founderAttribution ?? null,
      impact_score: clampScoreOrNull(lesson.impactScore),
      actionability_score: clampScoreOrNull(lesson.actionabilityScore),
      text_hash: await hashLessonText(scrubbed),
    });
  }
  return out;
}

function clampScoreOrNull(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(1, Math.min(10, Math.round(value)));
}

function hostFromUrl(raw: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
