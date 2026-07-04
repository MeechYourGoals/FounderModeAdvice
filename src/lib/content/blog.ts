/**
 * Blog registry — long-form editorial. Hand-authored TypeScript records.
 */

export type BlogSection =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "quote"; text: string; attribution?: string }
  | { kind: "callout"; title: string; body: string };

export type BlogPost = {
  slug: string;
  h1: string;
  title: string;
  description: string;
  datePublished: string;
  updatedAt?: string;
  excerpt: string;
  sections: BlogSection[];
  relatedScenarios?: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "pressure-test-series-b-narrative",
    h1: "How to pressure-test a Series B narrative in a weekend",
    title: "Pressure-test a Series B narrative in a weekend — Founder Mode Advice",
    description:
      "A 48-hour framework for turning ten operator talks into one defensible Series B story before Monday's partner meeting.",
    datePublished: "2026-01-15",
    excerpt:
      "Ten operator talks, two days, and one deck that survives a Tier 1 partner meeting. Here is the exact sequence.",
    sections: [
      { kind: "p", text: "Most Series B decks die from consensus — every partner heard a plausible story, nobody heard an inevitable one. The fix is not a better writer. It is a weekend of adversarial analysis against the operators who have defended these exact metrics before." },
      { kind: "h2", text: "Friday night: pick the ten talks that actually matter" },
      { kind: "p", text: "Ignore your saved list. Choose talks from three categories: an operator at your ARR now, an operator who defended a decelerating growth curve at your size, and a lead investor from a fund you're pitching Monday. Ten is the ceiling — more is a signal you're avoiding the work." },
      { kind: "h2", text: "Saturday: run each talk as a decision, not a summary" },
      { kind: "p", text: "For every talk, paste the video with your company profile loaded and ask a single decision-shaped question. Not 'what did they say' — 'given this, what would you change about slide seven of my deck.' The memos will contradict each other; that is the point." },
      { kind: "callout", title: "The one prompt that works", body: "\"Given this talk and my metrics (ARR, NRR, cohort mix, burn), name the two things I should cut from my Series B deck and the one number I should lead with.\"" },
      { kind: "h2", text: "Sunday morning: reconcile the contradictions" },
      { kind: "p", text: "Line the ten memos up in a folder. The consensus advice is table stakes — build the deck around the two or three specific contradictions. That is your narrative: not what everyone agrees on, but the informed bet where the smartest operators disagree and you have a defensible reason to pick a side." },
      { kind: "h2", text: "Sunday night: dry-run against the hardest partner" },
      { kind: "p", text: "Share the folder with the co-founder or advisor who plays devil's advocate best. Have them read the memos, not the deck. If they can steelman the opposite narrative from the same source material, you have a real story. If they can't, you have a rehearsal problem, not a story problem — go back to Friday." },
      { kind: "quote", text: "The point of analysis is not to feel prepared. It is to know which two questions the smartest partner in the room will ask, and to already have written the answer." },
    ],
    relatedScenarios: ["series-b-fundraise", "board-meeting-prep"],
  },
  {
    slug: "operator-library-not-podcast-feed",
    h1: "The operator library, not the podcast feed",
    title: "The operator library, not the podcast feed — Founder Mode Advice",
    description:
      "Why the founders you already follow don't help until you stop consuming them chronologically and start querying them by decision.",
    datePublished: "2026-01-15",
    excerpt:
      "The problem was never a shortage of great founder content. The problem is that you have been treating an operator library like a podcast feed.",
    sections: [
      { kind: "p", text: "You already know which fifteen founders you'd trust with your next decision. You've watched them for years. And yet, when the decision actually arrives — the hire, the raise, the reprice — you scroll their recent episodes hoping the right one is on top. It almost never is." },
      { kind: "h2", text: "Chronology is the enemy of the decision" },
      { kind: "p", text: "Podcast feeds are optimized for the platform, not for you. The episode that would change your Tuesday was uploaded in 2019 and buried under 400 hours of newer content. Search is worse — even the best transcript search returns a paragraph, not a plan." },
      { kind: "h2", text: "The library is a query surface" },
      { kind: "p", text: "The shift is small but total: stop asking 'what did this founder say recently' and start asking 'given the decision on my desk today, what would this founder tell me if they read my metrics.' The library becomes a query surface, not a feed." },
      { kind: "ul", items: [
        "One decision at a time — never a general summary",
        "Your context always loaded — stage, ARR, team size, next milestone",
        "Contradictions preserved — the two operators who disagree matter more than the eight who agree",
        "Memos, not clips — the artifact you'll actually paste into a doc",
      ] },
      { kind: "h2", text: "What changes on Monday" },
      { kind: "p", text: "You stop watching. You start asking. The same fifteen founders become fifteen advisors you can convene in twenty minutes — and the archive that felt like homework becomes the leverage it was always supposed to be." },
    ],
    relatedScenarios: ["bootstrapped-solo-founder", "first-vp-sales-hire"],
  },
  {
    slug: "yc-talk-to-one-page-memo",
    h1: "Turning a 90-minute YC talk into a 1-page decision memo",
    title: "Turning a 90-minute YC talk into a 1-page decision memo — Founder Mode Advice",
    description:
      "The four-step compression that turns an hour and a half of Paul Graham into one page you can hand your co-founder before standup.",
    datePublished: "2026-01-15",
    excerpt:
      "Ninety minutes of a great founder is worth compressing. Here is the exact four-step reduction we run on every YC talk that hits our queue.",
    sections: [
      { kind: "p", text: "There is a reason nobody rewatches YC talks. They are dense, they are long, and by minute forty you have forgotten what you came for. The talk was never the artifact — the memo is." },
      { kind: "h2", text: "Step one: state the decision before you press play" },
      { kind: "p", text: "Write the single decision you're trying to make in one sentence, before the video loads. If you can't, you're browsing, not working — close the tab and come back when you can." },
      { kind: "h2", text: "Step two: load your context, not theirs" },
      { kind: "p", text: "The talk assumes an average founder. You are not average — you have specific ARR, a specific team, a specific quarter. Load your context so the analysis reads the talk through your P&L, not the speaker's assumptions." },
      { kind: "h2", text: "Step three: ask for a memo, not a summary" },
      { kind: "p", text: "The prompt shape matters. 'Summarize this talk' returns Wikipedia. 'Given my context, what should I do differently in the next 14 days' returns the memo you needed. Adopt the second shape every time." },
      { kind: "callout", title: "The 1-page test", body: "If the memo doesn't fit on a page and doesn't name at least one thing to stop doing, it's not a memo. Rewrite the prompt." },
      { kind: "h2", text: "Step four: paste it in the doc, not the drive" },
      { kind: "p", text: "The memo dies if it lives in a folder you'll never open. Paste it into the doc where the decision is actually being made — the pitch, the plan, the offer. That is the artifact loop that changes companies." },
    ],
    relatedScenarios: ["yc-founder-batch-prep"],
  },
  {
    slug: "downsizing-with-dignity",
    h1: "Downsizing with dignity: what F500 CEOs get wrong that founders get right",
    title: "Downsizing with dignity — Founder Mode Advice",
    description:
      "The founder-mode instincts that make workforce reductions defensible — and the public-company reflexes that quietly destroy trust.",
    datePublished: "2026-01-15",
    excerpt:
      "The best RIFs in the last decade were run by founders, not consultants. Here is what the founder-mode operators do that Fortune 500 CEOs keep missing.",
    sections: [
      { kind: "p", text: "Every reduction in force is a communication event dressed as a financial one. Founders who have cut deeply and grown afterward share a small set of instincts that public-company CEOs, insulated by counsel and IR, quietly avoid. The instincts are transferable. The counsel is not the problem." },
      { kind: "h2", text: "Founders write the memo themselves" },
      { kind: "p", text: "The all-hands note goes out over the founder's name and reads like the founder's voice. When comms drafts it, employees read past the words to the process behind them — and the process behind a drafted memo is exactly what erodes trust in the moment it matters most." },
      { kind: "h2", text: "Founders name what they're keeping, not just what they're cutting" },
      { kind: "p", text: "A reduction that only inventories losses reads as retreat. A reduction that names the two bets the company is now concentrated on reads as focus. Same headcount, different company." },
      { kind: "h2", text: "Founders take the meeting the next day" },
      { kind: "p", text: "The RIF is not the artifact — the next 72 hours are. Founders who host an unscripted Q&A the morning after keep the org. Founders who go dark for a week lose the top decile within a quarter, and the reduction functionally doubles." },
      { kind: "quote", text: "The dignity of a reduction lives in what you say on Wednesday, not in the severance package you wired on Tuesday." },
      { kind: "h2", text: "What the F500 CEO can actually copy" },
      { kind: "p", text: "Not all of it. But the memo, the two bets, and the Wednesday Q&A translate cleanly to a public company — and they cost nothing. The founder-mode advice worth borrowing is not the aggression. It is the willingness to be the person in the room when the room is hardest." },
    ],
    relatedScenarios: ["fortune-500-downsizing"],
  },
];

export const getPostBySlug = (slug: string) =>
  BLOG_POSTS.find((p) => p.slug === slug);
