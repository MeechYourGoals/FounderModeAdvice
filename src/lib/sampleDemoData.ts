// Fictional, illustrative content for the marketing "See it in action" demo.
// Anchored on a seed-stage B2B SaaS founder to match the product's positioning.
// No real video, person, or company.

export interface SampleInsightGroup {
  title: string;
  general: string;
  tailored: string;
}

export interface DemoBusinessProfile {
  id: string;
  name: string;
  stageOrType: string[];
  description: string;
  folders: {
    id: string;
    title: string;
    color: string;
  }[];
}

/** The company the primary demo analysis is tailored to. */
export const SAMPLE_PRIMARY_NAME = "Northwind";

export const SAMPLE_BUSINESS_PROFILES: DemoBusinessProfile[] = [
  {
    id: "northwind-saas",
    name: "Northwind",
    stageOrType: ["Seed", "B2B SaaS"],
    description:
      "A seed-stage B2B SaaS company building revenue-operations software for mid-market sales teams. Two technical co-founders, eight people, roughly $40k MRR and growing. Currently deciding when to hire a first salesperson, how to price, and what narrative to take into a Series A next year.",
    folders: [
      { id: "fundraising", title: "Fundraising", color: "#2563eb" },
      { id: "gtm", title: "GTM", color: "#14b8a6" },
      { id: "hiring", title: "Hiring", color: "#8b5cf6" },
    ],
  },
  {
    id: "series-b-ai",
    name: "HelixMind AI",
    stageOrType: ["Series B", "AI / Enterprise Software"],
    description:
      "A fast-growing AI infrastructure company helping enterprise teams deploy, evaluate, and govern frontier models across internal workflows. The team is scaling GTM, sharpening positioning, and deciding which model stack best supports reliability, cost, and customer trust.",
    folders: [
      { id: "positioning", title: "Positioning", color: "#2563eb" },
      { id: "competitor-analysis", title: "Competitive Strategy", color: "#14b8a6" },
      { id: "frontier-model-choice", title: "Model Stack Decision", color: "#e11d48" },
    ],
  },
  {
    id: "aegis-atomics",
    name: "Aegis Atomics",
    stageOrType: ["Seed", "Aerospace / Defense"],
    description:
      "A seed-stage company developing long-endurance unmanned systems for remote sensing, disaster response, and defense logistics. The team is balancing technical validation, regulatory strategy, capital planning, and early government partnership development.",
    folders: [
      { id: "defense-partnerships", title: "Defense Partnerships", color: "#0ea5e9" },
      { id: "regulatory-path", title: "Regulatory Path", color: "#f97316" },
      { id: "prototype-roadmap", title: "Prototype Roadmap", color: "#8b5cf6" },
    ],
  },
];

export const SAMPLE_VIDEO = {
  title: "Scaling a Seed-Stage GTM Motion: An Operator's Playbook",
  source: "Sample analysis · illustrative only",
};

export const SAMPLE_INSIGHT_GROUPS: SampleInsightGroup[] = [
  {
    title: "Founder-led sales",
    general:
      "The speaker argues that founders should not hand off sales until the motion is genuinely repeatable. Repeatable means the founder can articulate the ideal customer, the trigger that creates urgency, and the objection sequence that recurs across deals — and can close without improvising each time. Hiring a salesperson to escape selling, rather than to scale a proven motion, almost always fails.",
    tailored:
      "For Northwind, the signal to watch isn't MRR — it's whether both founders can close inbound the same way twice. Before adding a salesperson, run ten founder-led closes and write down every objection verbatim. If the same three or four objections drive most of the losses and you have a repeatable answer, the motion is ready to hand off. If every deal still feels bespoke, hiring sales now just buys an expensive search for product-market fit.",
  },
  {
    title: "First GTM hire",
    general:
      "The speaker frames the first go-to-market hire as a decision about what the founders most need to stop doing — not about adding firepower. The right first hire removes the highest-frequency, most teachable work from the founders, so they can stay on the parts of the motion that still require their judgment. Hiring for strategy too early creates overhead; hiring for execution too late caps the company at the founders' personal throughput.",
    tailored:
      "For Northwind at ~$40k MRR, the first GTM hire is more likely a strong SDR or a founder-associate who can run qualification and demos, not a VP of Sales. That keeps both technical co-founders on closing and product while removing the top-of-funnel grind. Document the qualification checklist and demo script first, so the role is teachable in two weeks instead of dependent on a co-founder shadowing every call.",
  },
  {
    title: "Pricing & packaging",
    general:
      "The speaker treats pricing as a positioning decision, not a spreadsheet exercise. Early-stage teams tend to under-price because they anchor on cost and fear losing deals, when the real risk is signaling low value and attracting price-sensitive customers who churn. The recommendation is to price against the value of the problem solved and to revisit packaging as the ideal customer sharpens.",
    tailored:
      "For Northwind, anchor pricing to the revenue leakage your software recovers for a mid-market sales team, not to your AWS bill. Test a higher entry tier with annual billing on the next ten deals; if win rates hold, you were leaving money and positioning on the table. Keep packaging simple — one core plan plus an obvious upgrade path — until the Series A motion makes a third tier worth the complexity.",
  },
  {
    title: "Fundraising narrative",
    general:
      "The speaker stresses that a fundable narrative is built from operating evidence, not ambition. Investors discount the story and re-underwrite the proof: retention, efficient growth, and a credible wedge into a large market. The strongest narratives show that the team has earned the right to the next milestone by hitting the last one with discipline.",
    tailored:
      "For Northwind's Series A next year, the narrative isn't 'RevOps is a huge market' — it's that you turned founder-led sales into a repeatable motion with strong net revenue retention and a clear wedge. Start instrumenting that proof now: cohort retention, payback period, and the specific segment where you win. The cleaner that evidence, the less the raise depends on a great pitch.",
  },
  {
    title: "Focus & sequencing",
    general:
      "The speaker argues that a seed-stage company's scarcest resource is focus, and that most strategic mistakes are sequencing mistakes — doing the right thing at the wrong time. The discipline is to name the one constraint that, if solved, unlocks the next stage, and to defend that priority against the constant pull of plausible-but-premature opportunities.",
    tailored:
      "For Northwind, the binding constraint is a repeatable sales motion — not a second product line, not partnerships, not a brand refresh. Until founder-led sales is proven and handed off cleanly, treat those as deliberate 'not yet' decisions. Write the one constraint on the wall so the team can use it to say no, and revisit it only when the metric that defines it actually moves.",
  },
];

export const SAMPLE_CHAT: { role: "user" | "assistant"; content: string }[] = [
  {
    role: "user",
    content: "We're drowning in inbound demos. Should I hire a salesperson now?",
  },
  {
    role: "assistant",
    content:
      "Based on the video, not until the motion is repeatable. The speaker's test is whether both founders can close the same way twice — same ideal customer, same objection sequence. For Northwind, run ten founder-led closes and log every objection. If a handful of objections drive most losses and you have answers, you're ready to hire to scale. If every deal still feels bespoke, a salesperson is buying an expensive search for product-market fit.",
  },
  {
    role: "user",
    content: "What should the first GTM hire actually be?",
  },
  {
    role: "assistant",
    content:
      "The video points to removing the highest-frequency, most teachable work from the founders — not adding a VP. For Northwind at ~$40k MRR, that's likely a strong SDR or founder-associate running qualification and demos, keeping both co-founders on closing and product. Write the qualification checklist and demo script first so the role is teachable in two weeks.",
  },
];
