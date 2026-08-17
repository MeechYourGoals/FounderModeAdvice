// Defenses for untrusted external content.
//
// Titles, descriptions, and publisher names come from web pages and search
// APIs — i.e. from anyone who can publish a page. They are shown in the UI and
// summarized by an LLM when we write the "why this matters to you" reason, so
// they are treated as hostile data on both paths:
//
//   1. Storage/display: length-capped, control characters stripped, no markup.
//   2. LLM: wrapped in a delimited, explicitly-untrusted block with injection
//      phrasing neutralized, never concatenated into the instruction section.

/** Phrases whose only purpose in scraped metadata is to hijack an LLM. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+instructions?/gi,
  /disregard\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|rules?)/gi,
  /forget\s+(?:everything|all)\s+(?:you|above|previous)/gi,
  /\b(?:system|assistant|developer)\s*(?::|prompt\b|message\b)/gi,
  /<\s*\/?\s*(?:system|assistant|user|instructions?)\s*>/gi,
  /\bnew\s+instructions?\s*:/gi,
  /\byou\s+are\s+now\b/gi,
  /\bact\s+as\s+(?:a\s+)?(?:different|new)\b/gi,
  /\boverride\s+(?:your|the)\s+(?:instructions?|rules?|system)/gi,
  /```/g,
];

// C0/C1 control characters, zero-width joiners, bidi overrides, and the BOM —
// all used to smuggle text past a human reader or a naive filter. Built from
// code points so this source file stays plain ASCII.
const HIDDEN_CHAR_RANGES: Array<[number, number]> = [
  [0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x9f],
  [0x200b, 0x200f], // zero-width space .. RTL mark
  [0x202a, 0x202e], // bidi embedding/override
  [0x2060, 0x2064], // word joiner .. invisible plus
  [0xfeff, 0xfeff], // BOM / zero-width no-break space
];
const HIDDEN_CHARS = new RegExp(
  `[${HIDDEN_CHAR_RANGES.map(([lo, hi]) =>
    lo === hi
      ? `\\u${lo.toString(16).padStart(4, "0")}`
      : `\\u${lo.toString(16).padStart(4, "0")}-\\u${hi.toString(16).padStart(4, "0")}`
  ).join("")}]`,
  "g",
);

/**
 * Normalize a free-text field from an untrusted source: strip control chars and
 * markup, collapse whitespace, cap length. Returns null for empty results.
 */
export function cleanText(raw: unknown, maxLength = 500): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    // Strip tags before entity-decoding so "&lt;script&gt;" can't become markup.
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(HIDDEN_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

/** Neutralize instruction-shaped phrasing without silently dropping meaning. */
export function neutralizeInjection(text: string): string {
  let out = text;
  for (const pattern of INJECTION_PATTERNS) out = out.replace(pattern, "[redacted]");
  return out;
}

/**
 * Render candidate metadata for an LLM prompt. Everything inside is data, and
 * the block says so — the caller must state in its system prompt that content
 * between the markers is never an instruction.
 */
export function asUntrustedBlock(fields: Record<string, string | null | undefined>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const cleaned = cleanText(value, 400);
    if (cleaned) lines.push(`${key}: ${neutralizeInjection(cleaned)}`);
  }
  return lines.join("\n");
}

/**
 * Reject obvious junk before it costs a metadata fetch or a model call:
 * SEO spam patterns, clickbait shells, and results with nothing to work with.
 */
export function looksLowQuality(title: string | null, description: string | null): boolean {
  if (!title) return true;
  const t = title.trim();
  if (t.length < 12) return true;
  // ALL-CAPS shouting past a few words.
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 12 && letters === letters.toUpperCase()) return true;
  const lower = `${t} ${description ?? ""}`.toLowerCase();
  const spam = [
    "click here", "you won't believe", "you wont believe", "this one weird",
    "buy now", "limited time offer", "free download", "sign up now",
    "best deals", "coupon code", "casino", "essay writing service",
    "page not found", "404 not found", "access denied", "are you a robot",
    "just a moment...", "enable javascript", "subscribe to read",
  ];
  return spam.some((phrase) => lower.includes(phrase));
}
