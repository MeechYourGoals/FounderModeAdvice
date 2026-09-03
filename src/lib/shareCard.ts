// Pure, DOM-free layout helpers for the "Share an insight" card — shared by
// the client-side Canvas 2D renderer (src/lib/shareCardCanvas.ts) and unit
// tested without a browser (see shareCard.test.ts). Kept in sync in spirit
// with supabase/functions/_shared/shareCard.ts, which renders the same idea
// server-side for link unfurls.

export type ShareCardVariant = "story" | "link";

export interface ShareCardFormat {
  width: number;
  height: number;
  padding: number;
  /** Max pixel width the quote text may occupy before wrapping. */
  quoteMaxWidth: number;
}

/** story = Instagram/iMessage portrait share; link = 1200x630 link-card ratio. */
export const SHARE_CARD_FORMATS: Record<ShareCardVariant, ShareCardFormat> = {
  story: { width: 1080, height: 1350, padding: 96, quoteMaxWidth: 888 },
  link: { width: 1200, height: 630, padding: 72, quoteMaxWidth: 1000 },
};

/**
 * Greedy word-wrap against a caller-supplied text measurer, so this has no
 * Canvas/DOM dependency and is testable with a synthetic measure function.
 */
export function wrapLines(text: string, maxWidth: number, measure: (line: string) => number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current === "" || measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Step the quote font size down as the text gets longer, so it always fits. */
export function fontSizeForQuote(text: string, variant: ShareCardVariant = "link"): number {
  const len = text.trim().length;
  const scale = variant === "story" ? 1.1 : 1;
  if (len <= 90) return Math.round(64 * scale);
  if (len <= 160) return Math.round(52 * scale);
  if (len <= 240) return Math.round(42 * scale);
  return Math.round(34 * scale);
}

/** Keep the rendered quote to a sane length regardless of the source lesson's. */
export function clampQuoteText(text: string, maxLength = 320): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : cut.length)}…`;
}

export function formatByline(attribution?: string | null, sourceTitle?: string | null): string {
  return [attribution?.trim(), sourceTitle?.trim()].filter(Boolean).join(" · ");
}
