// Recommendation context: a compact semantic answer to "what would this person
// benefit from learning right now?", derived once per profile and cached in
// profile_recommendation_contexts.
//
// Everything here is derived from what the user actually wrote in their
// business profile. Nothing invents company facts: extracted terms must appear
// in the profile text, and stage-derived focus areas are generic operating
// concerns for that stage, not claims about the company.

/** The shape of a user_startup_profiles row this module reads. */
export interface StartupProfileRow {
  id: string;
  user_id?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  description?: string | null;
  industry?: string | null;
  stage?: string | null;
  role?: string | null;
  funding_raised?: string | null;
  valuation?: string | null;
  employee_count?: number | null;
  deck_summary?: string | null;
}

export interface RecommendationContext {
  profileId: string;
  companyName: string | null;
  companyDescription: string | null;
  industry: string | null;
  subindustries: string[];
  businessModel: string | null;
  stage: string | null;
  founderRole: string | null;
  teamSize: number | null;
  customers: string[];
  goals: string[];
  challenges: string[];
  technologies: string[];
  markets: string[];
  /** Canonical topic tags (src/lib/topics.ts vocabulary) this profile leans on. */
  relevantTopics: string[];
  /** Discipline categories used by the Inspiration Library. */
  categories: string[];
  /** Topics to steer away from (seeded empty; fed by dismissals over time). */
  excludedTopics: string[];
  /** True when the profile is too thin to personalize well. */
  sparse: boolean;
}

// ---------------------------------------------------------------------------
// Lexicons. Terms only match when they literally appear in the profile text.
// ---------------------------------------------------------------------------

const BUSINESS_MODELS: Array<[string, string[]]> = [
  ["subscription", ["subscription", "saas", "recurring revenue", "mrr", "arr"]],
  ["marketplace", ["marketplace", "two-sided", "two sided", "supply and demand"]],
  ["ecommerce", ["ecommerce", "e-commerce", "dtc", "direct-to-consumer", "online store"]],
  ["advertising", ["ad-supported", "advertising revenue", "ad revenue"]],
  ["services", ["agency", "consulting", "services business", "done-for-you"]],
  ["hardware", ["hardware", "manufacturing", "physical product", "factory"]],
  ["licensing", ["licensing", "white label", "white-label", "oem"]],
  ["transactional", ["take rate", "per-transaction", "commission", "usage-based", "pay per"]],
];

const CUSTOMER_TERMS: Array<[string, string[]]> = [
  ["enterprise buyers", ["enterprise", "fortune 500", "large accounts", "procurement"]],
  ["small businesses", ["smb", "small business", "local business", "main street"]],
  ["consumers", ["consumer", "b2c", "everyday people", "shoppers"]],
  ["developers", ["developer", "engineers", "api users", "devtool"]],
  ["clinicians", ["clinician", "physician", "doctor", "hospital", "patient"]],
  ["government", ["government", "public sector", "nasa", "defense", "municipal"]],
  ["creators", ["creator", "influencer", "streamer", "youtuber"]],
  ["operators", ["operator", "founder", "executive", "ceo"]],
];

const TECH_TERMS = [
  "ai", "machine learning", "llm", "computer vision", "robotics", "propulsion",
  "blockchain", "iot", "sensors", "mobile app", "ios", "android", "web app",
  "api", "data platform", "analytics", "automation", "cloud", "biotech",
  "genomics", "wearable", "ar", "vr", "3d printing", "additive manufacturing",
  "supply chain", "logistics", "payments", "fintech", "cybersecurity",
];

const MARKET_TERMS = [
  "united states", "us market", "europe", "emea", "apac", "latam", "uk",
  "canada", "india", "global", "local", "regional", "national", "b2b", "b2c",
];

/**
 * Discipline categories (Inspiration Library vocabulary) keyed by trigger words.
 * Triggers are matched as whole-word prefixes, so "manufactur" catches both
 * "manufacturing" and "manufacturer" but "ai" never fires inside "said".
 */
const CATEGORY_TERMS: Array<[string, string[]]> = [
  ["Artificial Intelligence", ["ai", "machine learning", "llm", "neural", "inference"]],
  ["Engineering", ["engineering", "engineer", "developer", "infrastructure", "hardware", "manufactur"]],
  ["Product", ["product", "roadmap", "user experience", "ux", "onboarding"]],
  ["Marketing", ["marketing", "brand", "seo", "advertis", "campaign"]],
  ["Sales", ["sales", "pipeline", "quota", "gtm", "go-to-market", "outbound"]],
  ["Finance", ["finance", "unit economics", "margin", "pricing", "cash flow"]],
  ["Venture Capital", ["venture", "vc", "seed round", "series a", "fundrais", "investor"]],
  ["Operations", ["operations", "logistics", "supply chain", "fulfillment", "procurement"]],
  ["Consumer", ["consumer", "b2c", "retail", "shopper", "subscriber"]],
  ["Enterprise", ["enterprise", "b2b", "compliance", "sso"]],
  ["Healthcare / Medicine", ["healthcare", "clinical", "clinician", "patient", "medical", "telehealth"]],
  ["Biotechnology", ["biotech", "genomic", "therapeutic", "molecular", "assay"]],
  ["Aerospace / Space", ["aerospace", "rocket", "launch", "satellite", "propulsion", "aviation", "orbital"]],
  ["Sports", ["sports", "athlete", "league", "fitness", "training", "workout"]],
  ["Entertainment", ["entertainment", "film", "music", "gaming", "studio"]],
  ["Media", ["media", "publisher", "newsletter", "podcast", "journalism"]],
  ["Creator Economy", ["creator", "influencer", "audience", "community", "subscriber"]],
  ["E-commerce", ["ecommerce", "e-commerce", "dtc", "storefront", "shopify", "merchant"]],
  ["Design", ["design", "brand identity", "typography", "interface"]],
  ["Behavioral Science", ["behavior", "habit", "psychology", "motivation", "retention"]],
  ["Leadership", ["hiring", "culture", "management", "leadership", "founder"]],
];

/** Canonical topics (src/lib/topics.ts) keyed by trigger words. */
const TOPIC_TERMS: Array<[string, string[]]> = [
  ["Marketing", ["marketing", "brand", "seo", "advertis"]],
  ["Sales", ["sales", "gtm", "go-to-market", "outbound", "pipeline"]],
  ["Fundraising", ["fundrais", "investor", "venture", "seed round", "series a"]],
  ["Hiring", ["hiring", "recruit", "talent", "headcount"]],
  ["Product", ["product", "feature", "roadmap"]],
  ["Growth", ["growth", "acquisition", "retention", "churn", "funnel"]],
  ["Operations", ["operations", "supply chain", "logistics", "fulfillment"]],
  ["Leadership", ["leadership", "management", "culture", "founder"]],
  ["AI", ["ai", "machine learning", "llm", "neural"]],
  ["Engineering", ["engineering", "engineer", "developer", "infrastructure", "hardware", "manufactur"]],
  ["Design", ["design", "ux", "ui", "interface"]],
  ["Pricing", ["pricing", "price", "margin", "monetiz"]],
  ["Distribution", ["distribution", "channel", "partnership", "marketplace"]],
  ["Community", ["community", "forum", "creator", "audience"]],
  ["Bootstrapping", ["bootstrap", "profitable", "self-funded"]],
  ["Enterprise", ["enterprise", "b2b", "procurement", "compliance"]],
  ["Competitors", ["competitor", "competition", "incumbent", "rival"]],
  ["Product-Market Fit", ["product-market fit", "product market fit", "pmf", "early users"]],
  ["Strategy", ["strategy", "positioning", "moat", "differentiat"]],
  ["Culture", ["culture", "values", "remote team"]],
];

/**
 * Generic operating concerns by stage. These are framed as focus areas for a
 * company at that stage — never asserted as facts about this company.
 *
 * Keys must match the public.startup_stage enum exactly. They previously did
 * not: `series_b_plus`, `public` and `bootstrapped` had no entry and silently
 * fell through to DEFAULT_FOCUS, while `idea`, `series_b` and `established`
 * were unreachable — three of the seven selectable stages got generic goals.
 */
const STAGE_FOCUS: Record<string, { goals: string[]; challenges: string[] }> = {
  pre_seed: {
    goals: ["find repeatable early demand", "reach a fundable milestone"],
    challenges: ["finding product-market fit", "raising a first round"],
  },
  seed: {
    goals: ["turn early traction into a repeatable channel", "make the first key hires"],
    challenges: ["scaling customer acquisition", "hiring the first team"],
  },
  series_a: {
    goals: ["build a repeatable go-to-market motion", "scale the team without losing speed"],
    challenges: ["scaling sales", "management and process as headcount grows"],
  },
  series_b_plus: {
    goals: ["expand into new segments", "improve unit economics"],
    challenges: ["organizational scaling", "competitive pressure"],
  },
  growth: {
    goals: ["expand into new segments", "improve margins at scale"],
    challenges: ["organizational scaling", "defending against competitors"],
  },
  public: {
    goals: ["defend the core business", "find the next growth line"],
    challenges: ["innovating inside an existing organization", "competitive pressure"],
  },
  bootstrapped: {
    goals: ["grow revenue without outside capital", "keep the business durably profitable"],
    challenges: ["growing with a small team", "pricing for margin rather than share"],
  },
};

const DEFAULT_FOCUS = {
  goals: ["grow revenue", "reach more of the right customers"],
  challenges: ["acquiring customers efficiently", "prioritizing where to spend time"],
};

// ---------------------------------------------------------------------------

const norm = (value: string | null | undefined): string =>
  (value ?? "").toLowerCase();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word-prefix match: the trigger must start at a word boundary, but may
 * be a stem ("manufactur" → "manufacturing"). Stops "ai" from matching "said"
 * and "care" from matching "healthcare" by accident.
 */
function mentions(haystack: string, trigger: string): boolean {
  return new RegExp(`\\b${escapeRegExp(trigger)}`).test(haystack);
}

/**
 * Labels ranked by how many distinct triggers they hit, so the most specific
 * category wins instead of whichever one happens to sit highest in the table.
 */
function matchList(haystack: string, table: Array<[string, string[]]>, limit: number): string[] {
  const scored: Array<{ label: string; hits: number; order: number }> = [];
  table.forEach(([label, triggers], order) => {
    const hits = triggers.filter((trigger) => mentions(haystack, trigger)).length;
    if (hits > 0) scored.push({ label, hits, order });
  });
  return scored
    .sort((a, b) => b.hits - a.hits || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.label);
}

function matchTerms(haystack: string, terms: string[], limit: number): string[] {
  const out: string[] = [];
  for (const term of terms) {
    if (mentions(haystack, term)) out.push(term);
    if (out.length >= limit) break;
  }
  return out;
}

/** Notable multi-word noun phrases from the description, used as search seeds. */
function extractSubindustries(description: string, industry: string | null): string[] {
  const out = new Set<string>();
  if (industry) {
    // "Software / SaaS" → ["software", "saas"]
    for (const part of industry.split(/[/,&]/)) {
      const clean = part.trim().toLowerCase();
      if (clean.length > 2) out.add(clean);
    }
  }
  // Two- and three-word sequences of meaningful words, e.g. "reusable launch vehicles".
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const stop = new Set([
    "the", "and", "for", "with", "that", "this", "our", "we", "are", "is",
    "was", "to", "of", "in", "on", "at", "by", "a", "an", "from", "as", "it",
    "their", "them", "they", "you", "your", "us", "who", "which", "into",
    "build", "building", "make", "making", "help", "helps", "helping",
  ]);
  for (let i = 0; i < words.length - 1 && out.size < 8; i += 1) {
    const pair = [words[i], words[i + 1]];
    if (pair.some((w) => stop.has(w) || w.length < 4)) continue;
    out.add(pair.join(" "));
  }
  return [...out].slice(0, 8);
}

/**
 * Stable hash of the profile fields the context derives from. A mismatch means
 * the cached context is stale and must be rebuilt. Fields are joined on NUL,
 * which cannot occur in the data, so moving text from one field to another
 * always changes the hash (a space separator would not).
 */
export function profileFingerprint(profile: StartupProfileRow): string {
  const material = [
    profile.company_name, profile.company_website, profile.description,
    profile.industry, profile.stage, profile.role, profile.funding_raised,
    profile.valuation, profile.employee_count == null ? "" : String(profile.employee_count),
    profile.deck_summary,
  ].map((v) => (v ?? "").trim()).join("\u0000");

  // FNV-1a, 32-bit, run twice with different offsets for a wider key.
  const fnv = (seed: number): string => {
    let h = seed;
    for (let i = 0; i < material.length; i += 1) {
      h ^= material.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  return `${fnv(0x811c9dc5)}${fnv(0x9dc5811c)}`;
}

export function buildRecommendationContext(profile: StartupProfileRow): RecommendationContext {
  const description = (profile.description ?? "").trim();
  const deck = (profile.deck_summary ?? "").trim();
  const haystack = norm(`${profile.company_name ?? ""} ${description} ${deck} ${profile.industry ?? ""} ${profile.role ?? ""}`);

  const stageKey = norm(profile.stage).replace(/[\s-]+/g, "_");
  const focus = STAGE_FOCUS[stageKey] ?? DEFAULT_FOCUS;

  const categories = matchList(haystack, CATEGORY_TERMS, 6);
  const relevantTopics = matchList(haystack, TOPIC_TERMS, 8);

  // Always give the ranker something to work with, even for a bare profile.
  if (categories.length === 0) categories.push("Startups", "Entrepreneurship");
  if (relevantTopics.length === 0) relevantTopics.push("Strategy", "Growth", "Leadership");

  const context: RecommendationContext = {
    profileId: profile.id,
    companyName: profile.company_name?.trim() || null,
    companyDescription: description ? description.slice(0, 1200) : null,
    industry: profile.industry?.trim() || null,
    subindustries: extractSubindustries(`${description} ${deck}`, profile.industry ?? null),
    businessModel: matchList(haystack, BUSINESS_MODELS, 1)[0] ?? null,
    stage: profile.stage?.trim() || null,
    founderRole: profile.role?.trim() || null,
    teamSize: typeof profile.employee_count === "number" ? profile.employee_count : null,
    customers: matchList(haystack, CUSTOMER_TERMS, 3),
    goals: focus.goals,
    challenges: focus.challenges,
    technologies: matchTerms(haystack, TECH_TERMS, 6),
    markets: matchTerms(haystack, MARKET_TERMS, 3),
    relevantTopics,
    categories,
    excludedTopics: [],
    sparse: description.length < 40 && !profile.industry,
  };

  return context;
}
