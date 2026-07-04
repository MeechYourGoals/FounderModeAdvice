/**
 * Scenario registry — "who Founder Mode Advice is for."
 * Hand-authored personas, not AI-generated content.
 */

export type Scenario = {
  slug: string;
  persona: string;
  cardTitle: string;
  cardTagline: string;
  cardCtaLabel: string;
  stakes: string;
  decisionsFaced: string[];
  sampleAnalysisPrompt: string;
  sampleMemoBullets: string[];
  recommendedOperators: string[];
  faq: { q: string; a: string }[];
  datePublished: string;
  updatedAt?: string;
};

export const SCENARIOS: Scenario[] = [
  {
    slug: "yc-founder-batch-prep",
    persona: "YC founder, current batch",
    cardTitle: "From batch to demo day",
    cardTagline: "Turn every office hour and dinner talk into a decision, not a highlight reel.",
    cardCtaLabel: "See the YC workflow",
    stakes:
      "Twelve weeks, one shot at demo day, and a feed of 40+ talks from partners and alumni. Watching them isn't the problem — extracting the two decisions that change your next standup is.",
    decisionsFaced: [
      "Which growth channel to concentrate on before demo day",
      "How much to raise and at what valuation given current traction",
      "Which co-founder disagreement to resolve now vs. later",
      "What to cut from the pitch so the wedge is unmistakable",
      "Whether to hire a first non-founder engineer this batch",
    ],
    sampleAnalysisPrompt:
      "We're a Y Combinator W26 batch company (dev tools, $12k MRR, growing 22% w/w for 5 weeks). We're four weeks from demo day. Given this talk, what would you actually change about our launch strategy and pitch?",
    sampleMemoBullets: [
      "Concentrate: kill the second channel and put both founders on outbound to design-partner ICPs for 3 weeks.",
      "Raise on traction, not story: target $2.5M on $18M post, price the round yourself before demo day intros.",
      "Cut the platform slide. Lead with the wedge (schema drift alerts) and one metric (time-to-fix, minutes).",
      "Delay the first engineer hire by 6 weeks — hiring now trades 40% of a founder's demo-day cycles.",
    ],
    recommendedOperators: ["Paul Graham", "Michael Seibel", "Dalton Caldwell", "Garry Tan"],
    faq: [
      {
        q: "Do I need a paid plan during the batch?",
        a: "No. The free tier covers most solo founders through demo day. Boardroom unlocks folders and teammate comments when you start collaborating with your co-founder or a partner on the same memos.",
      },
      {
        q: "Can I share a memo with my YC partner?",
        a: "Yes — every analysis has a shareable link. Recipients can read without an account; adding a comment requires signing in.",
      },
    ],
    datePublished: "2026-01-15",
  },
  {
    slug: "series-b-fundraise",
    persona: "Series B CEO, mid-raise",
    cardTitle: "Defending the narrative at Series B",
    cardTagline: "Pressure-test your story against the operators who've raised the round you're raising.",
    cardCtaLabel: "See the Series B workflow",
    stakes:
      "You're in front of ten funds in six weeks. Every partner meeting compresses eighteen months of decisions into forty minutes. The talks that matter are the ones from operators who've defended these exact metrics — not the ones with the most views.",
    decisionsFaced: [
      "How to frame a decelerating growth curve without losing the round",
      "Which two metrics to lead the deck with (and which to bury)",
      "How to answer the 'why now' question given a shifting competitive set",
      "Whether to run a pre-emptive or a fully banked process",
      "How to price a secondary component without spooking the lead",
    ],
    sampleAnalysisPrompt:
      "We're a vertical SaaS, $14M ARR, growing 78% YoY (down from 140% last year), NRR 118%, 14 months of runway. Given this talk, how would you frame the deceleration narrative to a Tier 1 lead?",
    sampleMemoBullets: [
      "Reframe deceleration as cohort maturation: show 2023 cohort NRR of 141% vs. 2021 cohort 118% — the mix, not the motion, moved.",
      "Lead with net new logos + gross margin, not ARR growth. Bury sales cycle length in the appendix.",
      "'Why now' = new compliance regime hits Q3, and only 2 vendors have the audit trail. You're one of them.",
      "Run a tight pre-emptive with 3 funds you've built relationships with. Full process only if the pre-empt breaks 25x.",
    ],
    recommendedOperators: ["Aileen Lee", "Bill Gurley", "Mamoon Hamid", "Sarah Guo"],
    faq: [
      {
        q: "Can the analysis reference confidential metrics safely?",
        a: "Yes. Your profile context is stored in your workspace and only ever passed to the analysis engine — never surfaced in shared links.",
      },
    ],
    datePublished: "2026-01-15",
  },
  {
    slug: "mom-and-pop-car-wash",
    persona: "Local operator scaling to multi-site",
    cardTitle: "Running a car wash like a PE roll-up",
    cardTagline: "Apply the operating discipline of a private-equity playbook to a business you already own.",
    cardCtaLabel: "See the multi-site workflow",
    stakes:
      "You own two locations, you're eyeing a third, and every acquisition podcast is aimed at people with a $50M SBA fund — not you. The right talk from a multi-unit operator, filtered through your P&L, is the difference between a smart acquisition and a personal-guarantee mistake.",
    decisionsFaced: [
      "Whether to buy the third location cash or with SBA 7(a) leverage",
      "How to standardize labor and chemical costs across sites",
      "Which KPIs to review weekly vs. monthly as an owner-operator",
      "When to hire a general manager instead of running two sites yourself",
      "How to price a membership program without eroding retail volume",
    ],
    sampleAnalysisPrompt:
      "I own two express car washes in the Midwest doing $1.4M and $1.1M in revenue, 32% EBITDA margins. I'm looking at a third site for $2.1M. Given this operator talk, how would you evaluate the deal and structure my next 90 days?",
    sampleMemoBullets: [
      "Do the deal, but cap leverage at 65% LTV — a third site with a 90% SBA note eats every dollar of your current cash flow if utilization dips.",
      "Standardize chemical cost per car ($0.42 target) and labor hours per 100 cars (2.8) across all three sites in month one.",
      "Hire the GM before the third site closes, not after. First 60 days is the only time you get to set the culture.",
      "Membership pricing: $24.99 unlimited, and let retail single-wash creep to $18. Membership economics carry the roll-up thesis.",
    ],
    recommendedOperators: ["Codie Sanchez", "Walker Deibel", "Sieva Kozinsky", "Nick Huber"],
    faq: [
      {
        q: "Does this work for other main-street businesses?",
        a: "Yes. The workflow is agnostic — HVAC, laundromats, home services, self-storage. Set your profile to your actual business and the memos become site-specific.",
      },
    ],
    datePublished: "2026-01-15",
  },
  {
    slug: "fortune-500-downsizing",
    persona: "Fortune 500 CEO leading a workforce reduction",
    cardTitle: "Downsizing with dignity",
    cardTagline: "Turn founder-mode candor into a defensible plan for a public-company reduction in force.",
    cardCtaLabel: "See the RIF workflow",
    stakes:
      "You're the CEO of a public company preparing an 8–12% reduction. The board wants a plan by next Thursday. The best guidance isn't in a McKinsey deck — it's in the founder talks from operators who cut 30% and grew earnings the year after. But you need the specifics translated to a 40,000-person org.",
    decisionsFaced: [
      "How to sequence cuts by function vs. by level",
      "What severance and outplacement structure protects brand equity",
      "How to communicate internally on day one vs. week two vs. quarter close",
      "Which programs to sunset entirely instead of shrinking uniformly",
      "How to defend the plan to activist investors on the next call",
    ],
    sampleAnalysisPrompt:
      "I'm CEO of a $28B revenue industrial company. Board approved an 11% headcount reduction, roughly 4,400 roles. Given this founder-mode talk on org design, how would you sequence and communicate the plan across a 90-day window?",
    sampleMemoBullets: [
      "Sequence: sunset 3 initiatives fully in week one (–1,900). Uniform 6% cut across remaining functions in week four. Zero-based rebuild of two functions in week ten.",
      "Severance floor of 16 weeks + 6 months outplacement — cheaper than the reputational drag of a lean package at this scale.",
      "Day-one comms: CEO video, then manager 1:1s within four hours. No cascading emails.",
      "Investor call: lead with earnings quality, not cost savings. Frame the reduction as focus, and name the two functions you're rebuilding.",
    ],
    recommendedOperators: ["Ben Horowitz", "Frank Slootman", "Andy Grove", "Jack Welch"],
    faq: [
      {
        q: "Is this actually appropriate advice for a public-company CEO?",
        a: "The memos are decision inputs, not decisions. Every plan still routes through your general counsel, CHRO, and board — the analysis just compresses the founder-mode reference material into something you can react to in an afternoon.",
      },
    ],
    datePublished: "2026-01-15",
  },
  {
    slug: "bootstrapped-solo-founder",
    persona: "Bootstrapped solo founder, profitable",
    cardTitle: "Growing a profitable one-person company",
    cardTagline: "Filter VC-shaped advice into what actually applies when your only investor is you.",
    cardCtaLabel: "See the bootstrapper workflow",
    stakes:
      "You're doing $600k ARR by yourself, profitable, and every second podcast is about how to spend other people's money. The two founders whose actual advice matters to you post four times a year. Analysis, not aggregation, is how you use their time well.",
    decisionsFaced: [
      "When to hire the first full-time employee vs. contractors",
      "Whether to raise a small angel round or stay 100% owner",
      "How to price a 2x annual plan without losing monthly subscribers",
      "Which platform risk (Stripe, iOS, LLM provider) to actively mitigate this year",
      "How much of the profit to pay yourself vs. reinvest",
    ],
    sampleAnalysisPrompt:
      "I run a $600k ARR SaaS solo, 82% gross margin, 100% owner. Given this bootstrapper talk, how would you structure my next 12 months around hiring and pricing?",
    sampleMemoBullets: [
      "Do NOT hire a full-time engineer yet — trade contractors for a fractional CTO 8 hrs/week for the codebase decisions only you can't outsource.",
      "Raise nothing. A $200k SAFE at your stage buys 6 months of runway you don't need and costs you 8% you'll want back at $2M ARR.",
      "Annual plan: 2 months free (17% discount), not 20% off. Frame the delta as 'two months on us' at renewal, not on the pricing page.",
      "Pay yourself 60% of trailing-6-month profit. Keep the rest as a war chest for the LLM-provider migration you'll do in Q3.",
    ],
    recommendedOperators: ["Jason Fried", "David Heinemeier Hansson", "Pieter Levels", "Rob Walling"],
    faq: [
      {
        q: "Is the free tier enough for a solo founder?",
        a: "Usually yes. Bootstrapped founders tend to hit the free-tier limit only in weeks they're actively making a decision — the paid tier is the right upgrade in those weeks, not by default.",
      },
    ],
    datePublished: "2026-01-15",
  },
  {
    slug: "first-vp-sales-hire",
    persona: "Founder making the first VP Sales hire",
    cardTitle: "Your first VP Sales, without regret",
    cardTagline: "Compress ten hiring-podcast episodes into one memo about the two candidates actually on your desk.",
    cardCtaLabel: "See the sales-hire workflow",
    stakes:
      "It's the single most consequential hire you'll make between $1M and $10M ARR, and 60% of first VP Sales hires miss. The right founder talk, filtered through your funnel data, tells you what to actually screen for — and what to ignore in the resume.",
    decisionsFaced: [
      "Player-coach or manager-of-managers profile",
      "Whether to hire from an up-market or same-stage company",
      "How to design the on-target earnings package without breaking the cap table",
      "What 90/180/365-day scorecard to write before the offer",
      "Which reference call actually tells you the truth",
    ],
    sampleAnalysisPrompt:
      "We're $2.4M ARR, 4-person AE team, average ACV $28k. I have two VP Sales finalists: one former Series C director from a $100M ARR company, one current head-of-sales at a $6M ARR peer. Given this talk on the first sales leader hire, how would you decide?",
    sampleMemoBullets: [
      "Hire the peer-stage head-of-sales. The Series C director's superpower is scaling a working motion — you don't have one yet.",
      "Player-coach for the first 6 months: 40% carrying quota, 60% coaching. Written into the offer, not implied.",
      "OTE $260k (55/45 split), 0.75% equity, four-year vest with one-year cliff. Anything richer signals desperation.",
      "Reference call script: ask the two peers who reported to them, not the two managers who managed them.",
    ],
    recommendedOperators: ["Jason Lemkin", "Mark Roberge", "Kristina Shen", "Pete Kazanjy"],
    faq: [],
    datePublished: "2026-01-15",
  },
  {
    slug: "pricing-repricing",
    persona: "SaaS founder repricing an existing product",
    cardTitle: "Repricing without a revolt",
    cardTagline: "Turn every pricing episode into a phased plan grandfathered customers won't tweet about.",
    cardCtaLabel: "See the repricing workflow",
    stakes:
      "You're leaving 40% of the revenue on the table, and you know it. But the founders you trust have all shipped one pricing change that cost them a viral thread and two months of momentum. Analysis, not intuition, is what gets the phasing right.",
    decisionsFaced: [
      "Whether to reprice by tier, by usage, or by seat",
      "How long to grandfather existing customers",
      "Which two features move from Starter to Pro to justify the delta",
      "How to communicate the change without triggering a Product Hunt backlash",
      "What to do about the 5% of customers who'll churn regardless",
    ],
    sampleAnalysisPrompt:
      "We're a $4M ARR PLG SaaS. Current pricing: $29/$79/$199 per seat. Repricing to $39/$99/$249. Given this pricing talk, how would you phase the change and communicate it?",
    sampleMemoBullets: [
      "Grandfather existing customers for 12 months at current pricing — the CAC to replace them exceeds the ARR delta.",
      "Move SSO and audit logs from Pro to a new Business tier at $349. Justifies the Pro bump because Pro didn't lose anything.",
      "Announce two weeks before, not day-of. Founder-written email, no blog post, no tweet thread.",
      "The 5% who'll churn: offer them a 6-month annual lock at the old rate. Half will take it.",
    ],
    recommendedOperators: ["Patrick Campbell", "Kyle Poyar", "Madhavan Ramanujam", "Elena Verna"],
    faq: [],
    datePublished: "2026-01-15",
  },
  {
    slug: "board-meeting-prep",
    persona: "Founder-CEO preparing a quarterly board meeting",
    cardTitle: "The board deck, one memo at a time",
    cardTagline: "Walk in with the three asks that move the company, not eighty slides that move the meeting.",
    cardCtaLabel: "See the board-prep workflow",
    stakes:
      "The board doesn't need another dashboard. They need to know the two decisions you want them to help with and the one risk you're not sure how to price. Founder-mode board advice, filtered through your metrics, is how you cut 80 slides to 12.",
    decisionsFaced: [
      "Which two asks to lead with vs. save for the closed session",
      "How to present a metric miss without triggering a rescue reflex",
      "When to bring the head of product into the room",
      "Whether to preview the deck 1:1 with each director",
      "How to run the closed session so it's actually useful",
    ],
    sampleAnalysisPrompt:
      "Series A SaaS, $8M ARR, we missed Q4 net-new ARR by 18% but expanded NRR to 128%. Board meeting in 10 days. Given this founder-CEO talk on board management, how should I structure the deck and the asks?",
    sampleMemoBullets: [
      "Lead with the two asks: (1) intro to two enterprise design partners, (2) permission to defer the Series B by 6 months and extend runway to 24. Everything else is context.",
      "Present the miss on slide two, not slide twelve. Explain it in one sentence and move on — burying it invites forensics.",
      "Preview the deck 1:1 with each director 48 hours before. The meeting is for decisions, not surprises.",
      "Closed session agenda: CEO risks, then compensation, then next-CEO succession as a standing item. Ten minutes each, hard stop.",
    ],
    recommendedOperators: ["Reid Hoffman", "Fred Wilson", "Marc Andreessen", "Vinod Khosla"],
    faq: [],
    datePublished: "2026-01-15",
  },
];

export const getScenarioBySlug = (slug: string) =>
  SCENARIOS.find((s) => s.slug === slug);

export const FEATURED_SCENARIO_SLUGS = [
  "yc-founder-batch-prep",
  "series-b-fundraise",
  "mom-and-pop-car-wash",
];
