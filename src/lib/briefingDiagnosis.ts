/**
 * Turning an empty briefing into a sentence the founder can act on.
 *
 * The generator records what it did in recommendation_batches.generation_stats,
 * but until now none of it reached the screen: an edition that found nothing
 * and an edition that was never generated both rendered "I'm still gathering
 * this week's set", and a refresh that returned zero items showed a success
 * toast. Both are lies, and both leave a paying user with no way to tell a
 * missing API key from a quiet week.
 *
 * Pure and dependency-free, like discoverBoot.ts and dailyBriefFreshness.ts, so
 * `deno test src/lib/` covers it.
 */

/** The subset of generation_stats the UI reasons about. All fields optional — old batches predate most of them. */
export interface BriefingStats {
  queries?: number;
  candidates?: number;
  selected?: number;
  providers?: string[];
  /** Provider ids that were configured for the run, even if they returned nothing. */
  providers_configured?: string[];
  /** How many picks came from the curated library rather than a live search. */
  evergreen_fill?: number;
  daily_brief_candidates_total?: number;
  daily_brief_candidates_eligible?: number;
  daily_brief_candidates_rejected_stale?: number;
  daily_brief_candidates_rejected_missing_date?: number;
  /** The searches this edition was actually built from. */
  query_plan?: Array<{ q: string; intent: string }>;
  /** Profile-derived terms used for relevance scoring. */
  context_terms?: string[];
}

export type BriefingGap =
  | "not-generated-yet"
  | "library-empty"
  | "no-providers"
  | "no-results"
  | "all-stale"
  | "all-seen"
  | "unknown";

/** Provider ids that reach the live web. "curated" is the local library, not a search. */
const EXTERNAL_PROVIDERS = ["exa", "youtube"];

const hasExternalProvider = (stats: BriefingStats): boolean =>
  (stats.providers_configured ?? stats.providers ?? []).some((id) => EXTERNAL_PROVIDERS.includes(id));

/**
 * Why is this edition empty? Ordered most-specific-cause first, so the answer
 * names the thing a person can actually change.
 */
export function classifyBriefingGap(stats: BriefingStats | null | undefined): BriefingGap {
  if (!stats || Object.keys(stats).length === 0) return "not-generated-yet";

  const total = stats.daily_brief_candidates_total ?? stats.candidates ?? 0;
  const eligible = stats.daily_brief_candidates_eligible ?? stats.candidates ?? 0;
  const selected = stats.selected ?? 0;
  const fill = stats.evergreen_fill ?? 0;
  const external = hasExternalProvider(stats);

  // No live search AND no library to fall back on: a setup problem, not a quiet week.
  if (!external && fill === 0 && total === 0) return "library-empty";
  if (!external) return "no-providers";
  if (total === 0) return "no-results";
  if (eligible === 0) return "all-stale";
  if (selected === 0) return "all-seen";
  return "unknown";
}

export interface BriefingGapCopy {
  title: string;
  description: string;
}

export function describeBriefingGap(
  gap: BriefingGap,
  companyName: string | null | undefined,
  stats?: BriefingStats | null,
): BriefingGapCopy {
  const company = companyName?.trim() || "your company";
  const found = stats?.daily_brief_candidates_total ?? stats?.candidates ?? 0;
  const queries = stats?.queries ?? stats?.query_plan?.length ?? 0;

  switch (gap) {
    case "not-generated-yet":
      return {
        title: `I haven't built a briefing for ${company} yet`,
        description:
          "The first edition lands on the weekly cycle. You can pull one now with Refresh, or browse the Inspiration Library in the meantime.",
      };
    case "library-empty":
      return {
        title: "Discovery isn't set up yet",
        description:
          "No web search provider is configured and the inspiration library is empty, so there was nothing to choose from. That's a setup issue on our side, not something you did.",
      };
    case "no-providers":
      return {
        title: "Web search isn't switched on yet",
        description:
          "This briefing was built from the inspiration library only. Once a search provider is configured, you'll start seeing recent articles and videos from your industry here too.",
      };
    case "no-results":
      return {
        title: "The searches came back empty",
        description: `I ran ${queries || "several"} searches across ${company}'s space and none of them returned anything. Refreshing later often helps.`,
      };
    case "all-stale":
      return {
        title: "Nothing recent enough this week",
        description: `I found ${found} results for ${company}, but every one was either undated or older than the briefing window.`,
      };
    case "all-seen":
      return {
        title: "You're already caught up",
        description: `I found recent material for ${company}, but you've been shown all of it in an earlier briefing. New items land as they're published.`,
      };
    default:
      return {
        title: `I'm still gathering this week's set for ${company}`,
        description:
          "The briefing lands on the weekly cycle. Meanwhile, the Inspiration Library is ready whenever you want a memo.",
      };
  }
}

/** True when there is something worth showing in the "how this was built" panel. */
export function hasBriefingBasis(stats: BriefingStats | null | undefined): boolean {
  if (!stats) return false;
  return (stats.query_plan?.length ?? 0) > 0 || (stats.context_terms?.length ?? 0) > 0;
}
