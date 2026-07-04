/**
 * Content + timing for the hero insight montage. Everything here is
 * illustrative sample output (same fictional GTM scenario the previous hero
 * used) — no real people, no real metrics claims.
 */

export interface MontageCard {
  /** Montage phase at which this card enters (1-based). */
  phase: number;
  category: string;
  text: string;
  tone: "default" | "risk";
  scores: { label: string; value: number }[];
}

export const MONTAGE_SOURCE = {
  title: "Scaling a Seed-Stage GTM Motion",
  duration: "42:17",
} as const;

export const MONTAGE_CARDS: MontageCard[] = [
  {
    phase: 1,
    category: "GTM",
    text: "Tighten your ICP to one painful, well-funded persona before scaling pipeline.",
    tone: "default",
    scores: [
      { label: "Impact", value: 9 },
      { label: "Action", value: 8 },
    ],
  },
  {
    phase: 2,
    category: "Pricing",
    text: "Run a two-week pricing test with your ten most-engaged accounts before the raise.",
    tone: "default",
    scores: [
      { label: "Impact", value: 8 },
      { label: "Action", value: 9 },
    ],
  },
  {
    phase: 3,
    category: "Risk",
    text: "Hiring a VP of Sales before founder-led sales is repeatable costs two quarters.",
    tone: "risk",
    scores: [{ label: "Impact", value: 9 }],
  },
];

export const MONTAGE_COMMENT = {
  author: "A",
  text: "This is exactly our Q3 pricing call — let's run the test.",
  mention: "@alex",
} as const;

export const MONTAGE_FOLDER = "Saved to Fundraising" as const;

/** Phase schedule in ms from cycle start. Phase 6 triggers the loop reset. */
export const MONTAGE_TIMELINE: { at: number; phase: number }[] = [
  { at: 800, phase: 1 },
  { at: 1700, phase: 2 },
  { at: 2600, phase: 3 },
  { at: 3600, phase: 4 },
  { at: 5000, phase: 5 },
  { at: 7600, phase: 6 },
];
