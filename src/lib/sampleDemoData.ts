// Fictional, illustrative content for the marketing "See it in action" demo.
// Deliberately a non-tech, bootstrapped local business to showcase that the
// product adapts beyond venture-backed startups. No real video or person.

export interface SampleInsightGroup {
  title: string;
  general: string;
  tailored: string;
}

export const SAMPLE_PROFILE = {
  company_name: "Maple & Oak Coffee Roasters",
  industry: "Food / Beverage / Hospitality",
  stage: "Bootstrapped",
  description:
    "A neighborhood coffee roaster with one cafe and a small wholesale route, looking to grow without raising money. We're a husband-and-wife team who poured our savings into this place because we believe a great cup of coffee can anchor a whole neighborhood — and we want to build something our kids can be proud of.",
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

export const SAMPLE_INSIGHT_GROUPS: SampleInsightGroup[] = [
  {
    title: "Expansion timing",
    general:
      "Before opening a second location, the speaker emphasizes proving that the first location can generate repeatable cash flow without founder heroics. Expansion should come after the operating system is stable: demand is predictable, peak-hour throughput is measured, management can run without constant intervention, and the next lease does not depend on optimistic revenue assumptions.",
    tailored:
      "For Maple & Oak, the better next move is not a second café yet. The morning rush constraint suggests demand exists, but the bottleneck is throughput, not location count. Test mobile pre-orders, a dedicated pickup shelf, and tighter barista station sequencing for 30 days. If peak-hour revenue rises without labor growing at the same rate, the business gets a cleaner expansion signal and a stronger cash-flow base.",
  },
  {
    title: "Margin leverage",
    general:
      "The speaker frames margin improvement as a sequence of operational fixes before pricing moves. Small waste reductions, tighter purchasing, and better labor allocation can improve profit without risking customer churn. Price increases should come after the business has removed avoidable leakage from the model.",
    tailored:
      "For Maple & Oak, daily waste tracking and green-bean purchasing discipline are the highest-leverage first moves. A 3% spoilage reduction can outperform a 3% menu price increase because it protects customer trust while improving gross margin. Pair this with weekly batch-size reviews and quarterly supplier pricing locks before testing selective price changes.",
  },
  {
    title: "Hiring",
    general:
      "The speaker argues that the first non-founder hire should remove the founder from the most repeatable, highest-frequency work — not the most complex work. Hiring too early for strategy creates overhead; hiring too late for operations burns the founders out and caps the business at their personal throughput. Write the role around the tasks that happen every single day.",
    tailored:
      "For Maple & Oak, the first real hire is a lead barista or shift lead who can open, close, and run the bar during morning rush without either of you behind the counter. That frees one founder for wholesale accounts and one for sourcing and books. Document the open/close checklist and drink specs first so the role is teachable in two weeks, not dependent on tribal knowledge.",
  },
  {
    title: "Influencer marketing",
    general:
      "The speaker is skeptical of paid reach for local businesses and favors small, credible voices with real audience trust. A handful of micro-creators who actually live in the neighborhood will outperform a larger paid campaign because the recommendation reads as a friend's tip, not an ad. The goal is repeat foot traffic, not impressions.",
    tailored:
      "For Maple & Oak, partner with five to ten local food, parenting, and neighborhood creators for in-store visits, a named drink, or a small-batch single-origin drop. Skip paid social entirely for the first 90 days. Track redemptions with a simple code at the register so you can see which creators actually drive return visits, then double down on the two or three that do.",
  },
  {
    title: "Competitor analysis",
    general:
      "The speaker frames competitor analysis as a search for unowned positions, not a checklist to copy. Studying competitors should reveal what they are structurally unwilling or unable to do — speed, seating, hours, sourcing, service model — and your strategy lives in those gaps. Copying their menu just turns you into a slower version of them.",
    tailored:
      "For Maple & Oak, map every café within a 15-minute walk on four axes: speed at peak, seating and laptop policy, wholesale presence, and bean transparency. You'll likely find no one owns 'fastest morning cup with single-origin transparency.' That becomes your wedge — and it tells you which of pre-orders, seating changes, or origin storytelling to invest in first.",
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
      "Based on the video, not yet. The speaker argues that a second location should be cash-flowed by a stable first location, not used to solve an operations bottleneck. For Maple & Oak, the constraint looks like peak-hour throughput. Test pre-orders, a pickup shelf, and station sequencing first, then use the results to decide whether another lease is justified.",
  },
  {
    role: "user",
    content: "What would improve margins fastest without raising prices?",
  },
  {
    role: "assistant",
    content:
      "The video points to waste tracking and purchasing discipline before pricing. For Maple & Oak, a 3% spoilage reduction may beat a 3% price increase because it protects customer trust while improving gross margin. Pair daily waste logs with weekly batch-size reviews and quarterly supplier pricing locks.",
  },
];
