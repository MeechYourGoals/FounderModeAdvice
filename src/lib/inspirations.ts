// Curated pick-list for the onboarding question "Which founders, operators, and
// thought leaders inspire you?" Founder options derive from the decade-grouped
// HIGHLIGHTED_FOUNDERS list (single source of truth, deduped — e.g. Elon Musk
// appears in two decades but is one chip here); operators and thought leaders
// are curated inline. Selections are stored as plain name strings (see
// useInspirations) and drive "Picked for you" YouTube search recommendations.

import { HIGHLIGHTED_FOUNDERS } from "./highlightedFounders";

export interface InspirationOption {
  name: string;
  /** Company or body of work shown alongside the name and used to sharpen YouTube searches. */
  knownFor: string;
}

export interface InspirationGroup {
  id: "founders" | "operators" | "thought_leaders";
  label: string;
  options: InspirationOption[];
}

const founderOptions: InspirationOption[] = [];
const seenFounders = new Set<string>();
for (const decade of HIGHLIGHTED_FOUNDERS) {
  for (const founder of decade.founders) {
    const key = founder.name.toLowerCase();
    if (seenFounders.has(key)) continue;
    seenFounders.add(key);
    founderOptions.push({ name: founder.name, knownFor: founder.company });
  }
}

const OPERATOR_OPTIONS: InspirationOption[] = [
  { name: "Sheryl Sandberg", knownFor: "Meta" },
  { name: "Gwynne Shotwell", knownFor: "SpaceX" },
  { name: "Frank Slootman", knownFor: "Snowflake" },
  { name: "Claire Hughes Johnson", knownFor: "Stripe" },
  { name: "Ben Horowitz", knownFor: "a16z" },
  { name: "Andy Jassy", knownFor: "Amazon" },
];

const THOUGHT_LEADER_OPTIONS: InspirationOption[] = [
  { name: "Simon Sinek", knownFor: "Start With Why" },
  { name: "Naval Ravikant", knownFor: "AngelList" },
  { name: "Paul Graham", knownFor: "Y Combinator" },
  { name: "Adam Grant", knownFor: "Organizational psychology" },
  { name: "Brené Brown", knownFor: "Leadership research" },
  { name: "Tim Ferriss", knownFor: "The Tim Ferriss Show" },
];

export const INSPIRATION_GROUPS: InspirationGroup[] = [
  { id: "founders", label: "Founders", options: founderOptions },
  { id: "operators", label: "Operators", options: OPERATOR_OPTIONS },
  { id: "thought_leaders", label: "Thought leaders", options: THOUGHT_LEADER_OPTIONS },
];

const optionIndex = new Map<string, InspirationOption>();
for (const group of INSPIRATION_GROUPS) {
  for (const option of group.options) {
    optionIndex.set(option.name.toLowerCase(), option);
  }
}

/** Curated metadata for a stored name, if it matches a known option. */
export function findInspirationOption(name: string): InspirationOption | undefined {
  return optionIndex.get(name.trim().toLowerCase());
}

/**
 * YouTube search-results URL for a person — a search, not a specific video, so
 * links never rot and the user still chooses what to watch and paste back in.
 */
export function youtubeSearchUrl(name: string): string {
  const known = findInspirationOption(name);
  const query = known ? `${known.name} ${known.knownFor} interview` : `${name.trim()} interview`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
