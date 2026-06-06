// Fictional, illustrative content for the marketing "See it in action" demo.
// Deliberately a non-tech, bootstrapped local business to showcase that the
// product adapts beyond venture-backed startups. No real video or person.

export interface SampleInsight {
  text: string;
  impact: number;
  actionability: number;
  tags: string[];
}

export const SAMPLE_PROFILE = {
  company_name: "Maple & Oak Coffee Roasters",
  industry: "Food / Beverage / Hospitality",
  stage: "Bootstrapped",
  description:
    "A neighborhood coffee roaster with one cafe and a small wholesale route, looking to grow without raising money.",
};

export const SAMPLE_VIDEO = {
  title: "Scaling a Neighborhood Business: An Operator's Playbook",
  source: "Sample analysis · illustrative only",
};

export const SAMPLE_FOLDERS: { name: string; color: string }[] = [
  { name: "Growth ideas", color: "#16a34a" },
  { name: "Hiring", color: "#a855f7" },
  { name: "Margins", color: "#f59e0b" },
];

export const SAMPLE_INSIGHTS: SampleInsight[] = [
  {
    text: "Treat your busiest two hours as a separate business. Staff, prep, and price around peak demand instead of averaging across the whole day.",
    impact: 9,
    actionability: 8,
    tags: ["operations", "pricing"],
  },
  {
    text: "Wholesale accounts smooth out cash flow but carry thin margins — only take them on if they cover fixed costs, not as your growth engine.",
    impact: 8,
    actionability: 7,
    tags: ["margins", "growth"],
  },
  {
    text: "Your regulars are the moat. A simple loyalty punch card beats most paid ads for a local shop because retention compounds weekly.",
    impact: 8,
    actionability: 9,
    tags: ["retention", "marketing"],
  },
  {
    text: "Hire for attitude on the bar, train for craft. A warm regular-facing barista drives more repeat visits than a perfect pour.",
    impact: 7,
    actionability: 8,
    tags: ["hiring", "culture"],
  },
  {
    text: "Track waste daily, not monthly. A 3% reduction in spoilage often beats a 3% price increase and won't cost you a single customer.",
    impact: 8,
    actionability: 9,
    tags: ["margins", "operations"],
  },
  {
    text: "Launch one new seasonal drink per quarter, not per week. Scarcity and ritual drive footfall; constant change confuses your regulars.",
    impact: 6,
    actionability: 8,
    tags: ["product", "marketing"],
  },
  {
    text: "Negotiate green-bean pricing on volume commitments, not spot buys. Lock a quarter ahead to protect your margin from price swings.",
    impact: 7,
    actionability: 6,
    tags: ["margins", "supply"],
  },
  {
    text: "Your second location should be cash-flowed by the first. Prove the model is repeatable before signing a second lease.",
    impact: 9,
    actionability: 6,
    tags: ["growth", "finance"],
  },
  {
    text: "Make the morning rush self-serve where you can — pre-orders and a pickup shelf reclaim labor for the relationships that matter.",
    impact: 7,
    actionability: 7,
    tags: ["operations", "tech"],
  },
  {
    text: "Put your numbers on the wall for the team. When staff see covers, waste, and tips, they make better calls without you in the room.",
    impact: 7,
    actionability: 8,
    tags: ["culture", "operations"],
  },
];

export const SAMPLE_CHAT: { role: "user" | "assistant"; content: string }[] = [
  {
    role: "user",
    content: "We're at capacity during morning rush. Should I open a second location?",
  },
  {
    role: "assistant",
    content:
      "Based on the video, not yet — it argues your second location should be cash-flowed by the first, and that you should fix peak-hour throughput before adding rent. For Maple & Oak specifically: try pre-orders + a pickup shelf to reclaim labor during the rush, measure whether peak revenue grows, and only then test a second lease.",
  },
  {
    role: "user",
    content: "What would move margins fastest without raising prices?",
  },
  {
    role: "assistant",
    content:
      "The speaker would point at daily waste tracking — a 3% spoilage cut often beats a 3% price increase and keeps every customer. Pair that with locking green-bean pricing a quarter ahead so swings don't eat your margin.",
  },
];
