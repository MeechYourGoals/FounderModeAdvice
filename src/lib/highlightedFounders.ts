// Curated, text-only list of widely-known founders grouped by the decade they're
// most associated with. It's an inspiration aid for the empty-library state — new
// users often don't know *who* to look up on YouTube to feed into the app. We keep
// it deliberately simple (name + company + a one-line "why"), with no photos, logos,
// or links, so it reads as inspiration rather than an endorsement. Decade = the era a
// founder broke out / is most associated with, not strict incorporation date, so the
// same person can intentionally appear in more than one decade (e.g. Elon Musk).

export interface HighlightedFounder {
  name: string;
  company: string;
  /** One line on why they're worth studying. */
  note: string;
}

export interface FounderDecade {
  decade: "2000s" | "2010s" | "2020s";
  /** Short subtitle shown above each decade's list. */
  blurb: string;
  founders: HighlightedFounder[];
}

export const HIGHLIGHTED_FOUNDERS: FounderDecade[] = [
  {
    decade: "2000s",
    blurb: "Founders who defined the early internet and mobile era.",
    founders: [
      { name: "Steve Jobs", company: "Apple", note: "Master of product focus and the keynote as theater." },
      { name: "Jeff Bezos", company: "Amazon", note: "Long-term thinking and relentless customer obsession." },
      { name: "Elon Musk", company: "Tesla & SpaceX", note: "Building hard-tech companies against long odds." },
      { name: "Mark Zuckerberg", company: "Facebook", note: "Scaling a product to billions and pivoting hard." },
      { name: "Reed Hastings", company: "Netflix", note: "Betting the company on streaming; a famous culture deck." },
      { name: "Brian Chesky", company: "Airbnb", note: "Designing trust into a marketplace from nothing." },
      { name: "Travis Kalanick", company: "Uber", note: "Aggressive growth and the realities of scaling fast." },
      { name: "Jack Dorsey", company: "Twitter & Square", note: "Founder-led simplicity in product design." },
      { name: "Daniel Ek", company: "Spotify", note: "Reinventing how an entire industry gets paid." },
      { name: "Drew Houston", company: "Dropbox", note: "Turning a simple demo into a category." },
    ],
  },
  {
    decade: "2010s",
    blurb: "Founders who built the platforms of the last decade.",
    founders: [
      { name: "Patrick & John Collison", company: "Stripe", note: "Developer-first products and deliberate scaling." },
      { name: "Brian Armstrong", company: "Coinbase", note: "Building a regulated business in an unregulated space." },
      { name: "Evan Spiegel", company: "Snapchat", note: "Designing for a generation; resisting acquisition." },
      { name: "Whitney Wolfe Herd", company: "Bumble", note: "Reframing a crowded market around a new value." },
      { name: "Melanie Perkins", company: "Canva", note: "Relentless persistence and product-led growth." },
      { name: "Tony Xu", company: "DoorDash", note: "Operational intensity in brutal-margin logistics." },
      { name: "Ben Silbermann", company: "Pinterest", note: "Patience through slow early growth." },
      { name: "Apoorva Mehta", company: "Instacart", note: "Solving hard unit economics in grocery." },
      { name: "Vlad Tenev", company: "Robinhood", note: "Removing friction (and the controversy that follows)." },
      { name: "Palmer Luckey", company: "Oculus", note: "Hardware obsession, from a garage to a category." },
    ],
  },
  {
    decade: "2020s",
    blurb: "Founders shaping the AI era right now.",
    founders: [
      { name: "Sam Altman", company: "OpenAI", note: "Brought AI to the mainstream; navigating its stakes live." },
      { name: "Dario & Daniela Amodei", company: "Anthropic", note: "Building frontier AI with safety at the center." },
      { name: "Elon Musk", company: "xAI & Neuralink", note: "Founder intensity aimed at AI and brain interfaces." },
      { name: "Aravind Srinivas", company: "Perplexity", note: "Rethinking search for the AI era." },
      { name: "Mustafa Suleyman", company: "Inflection & Microsoft AI", note: "Consumer AI and the next interface." },
      { name: "Alexandr Wang", company: "Scale AI", note: "The data infrastructure behind modern AI." },
      { name: "Mira Murati", company: "Thinking Machines Lab", note: "From research leadership to founder." },
      { name: "Clément Delangue", company: "Hugging Face", note: "Turning open-source AI into a platform." },
      { name: "Henrique Dubugras & Pedro Franceschi", company: "Brex", note: "Fintech infrastructure built for startups." },
      { name: "Parker Conrad", company: "Rippling", note: "The “compound startup” thesis in action." },
    ],
  },
];
