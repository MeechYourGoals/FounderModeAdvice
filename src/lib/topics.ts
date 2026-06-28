// Canonical topic vocabulary used by the analyzer and the Favorites/Library
// facet UI. Keeping this short and fixed prevents topic-tag explosion and
// makes "Marketing" the same bucket no matter which video produced it.

export const CANONICAL_TOPICS = [
  "Marketing",
  "Sales",
  "Fundraising",
  "Hiring",
  "Product",
  "Growth",
  "Operations",
  "Leadership",
  "AI",
  "Engineering",
  "Design",
  "Pricing",
  "Distribution",
  "Community",
  "Bootstrapping",
  "Enterprise",
  "Brand",
  "Product-Market Fit",
  "Strategy",
  "Culture",
] as const;

export type CanonicalTopic = (typeof CANONICAL_TOPICS)[number];

const LOWER_TO_DISPLAY = new Map<string, CanonicalTopic>(
  CANONICAL_TOPICS.map((t) => [t.toLowerCase(), t]),
);

// Cheap aliases so #growth-hacks or "go to market" still bucket correctly.
const ALIASES: Record<string, CanonicalTopic> = {
  gtm: "Go-To-Market" as unknown as CanonicalTopic, // not in canon — drop
  "go-to-market": "Distribution",
  "go to market": "Distribution",
  funding: "Fundraising",
  vc: "Fundraising",
  recruiting: "Hiring",
  team: "Hiring",
  ux: "Design",
  ui: "Design",
  acquisition: "Growth",
  retention: "Growth",
  ops: "Operations",
  founder: "Leadership",
  pmf: "Product-Market Fit",
  "product market fit": "Product-Market Fit",
  bootstrap: "Bootstrapping",
};

/** Map a free-form tag/topic string to a canonical topic, or null if no fit. */
export const normalizeTopic = (raw: string): CanonicalTopic | null => {
  const clean = raw.trim().replace(/^#/, "").toLowerCase();
  if (!clean) return null;
  if (LOWER_TO_DISPLAY.has(clean)) return LOWER_TO_DISPLAY.get(clean)!;
  if (ALIASES[clean] && CANONICAL_TOPICS.includes(ALIASES[clean])) return ALIASES[clean];
  return null;
};

export const normalizeTopics = (raw: string[] | null | undefined): CanonicalTopic[] => {
  if (!raw) return [];
  const out = new Set<CanonicalTopic>();
  for (const r of raw) {
    const t = normalizeTopic(r);
    if (t) out.add(t);
  }
  return Array.from(out);
};
