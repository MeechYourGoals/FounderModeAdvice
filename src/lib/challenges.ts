// Curated pick-list for the onboarding question "What are you wrestling with
// right now?" Selections are stored as stable ids (see useChallenges) so
// labels can be reworded without invalidating saved answers. The picks
// personalize the home desk ("Your focus") and finish-step copy.

import {
  Banknote,
  Crosshair,
  Flame,
  Handshake,
  Megaphone,
  Repeat,
  Target,
  TrendingUp,
  Users,
  Compass,
  type LucideIcon,
} from "lucide-react";

export interface ChallengeOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CHALLENGE_OPTIONS: ChallengeOption[] = [
  { id: "fundraising", label: "Fundraising", icon: Banknote },
  { id: "hiring", label: "Hiring & team", icon: Users },
  { id: "pmf", label: "Product-market fit", icon: Target },
  { id: "growth", label: "Growth & marketing", icon: TrendingUp },
  { id: "sales", label: "Sales & GTM", icon: Handshake },
  { id: "pricing", label: "Pricing & revenue", icon: Megaphone },
  { id: "burn", label: "Burn & runway", icon: Flame },
  { id: "retention", label: "Retention & churn", icon: Repeat },
  { id: "leadership", label: "Leadership", icon: Compass },
  { id: "focus", label: "Focus & prioritization", icon: Crosshair },
];

const optionIndex = new Map(CHALLENGE_OPTIONS.map((option) => [option.id, option]));

export function findChallengeOption(id: string): ChallengeOption | undefined {
  return optionIndex.get(id);
}

/** Human labels for a list of stored challenge ids (unknown ids dropped). */
export function challengeLabels(ids: string[]): string[] {
  return ids
    .map((id) => optionIndex.get(id)?.label)
    .filter((label): label is string => Boolean(label));
}
