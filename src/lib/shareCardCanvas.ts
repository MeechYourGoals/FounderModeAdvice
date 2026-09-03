// Browser-only Canvas 2D renderer for the "Share an insight" card. No new
// dependency: everything here is the standard Canvas API. Layout math is
// shared with the server-side og:image renderer via src/lib/shareCard.ts.
import {
  SHARE_CARD_FORMATS,
  wrapLines,
  fontSizeForQuote,
  clampQuoteText,
  formatByline,
  type ShareCardVariant,
} from "@/lib/shareCard";

export type ShareCardTheme = "dark" | "light";

export interface ShareCardData {
  quoteText: string;
  attribution?: string | null;
  sourceTitle?: string | null;
}

// Hardcoded from the brand tokens in src/index.css. The sheet's theme toggle
// is independent of the app's current theme, so these are fixed palettes
// rather than read from computed CSS custom properties.
const PALETTES: Record<ShareCardTheme, {
  background: string;
  foreground: string;
  foregroundTertiary: string;
  primary: string;
}> = {
  dark: {
    background: "hsl(224, 28%, 6.5%)",
    foreground: "hsl(213, 30%, 97%)",
    foregroundTertiary: "hsl(219, 13%, 56%)",
    primary: "hsl(211, 100%, 60%)",
  },
  light: {
    background: "hsl(210, 30%, 99%)",
    foreground: "hsl(224, 44%, 9%)",
    foregroundTertiary: "hsl(220, 9%, 45%)",
    primary: "hsl(211, 100%, 50%)",
  },
};

const QUOTE_FONT = (px: number) => `italic 600 ${px}px Fraunces, Georgia, serif`;
const BYLINE_FONT = "400 26px Inter, -apple-system, sans-serif";
const WORDMARK_FONT = "600 24px Inter, -apple-system, sans-serif";

/** Best-effort: wait for the brand fonts so the first paint doesn't fall back to a system serif/sans. Never throws. */
async function ensureFontsLoaded(quotePx: number): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(QUOTE_FONT(quotePx)),
      document.fonts.load(BYLINE_FONT),
      document.fonts.load(WORDMARK_FONT),
    ]);
  } catch {
    // Fall back to default font metrics — still legible.
  }
}

/**
 * Draw the card onto `canvas` at device-pixel resolution for the given
 * variant/theme. Resolves once the canvas is ready to read back (toBlob/
 * toDataURL) or hand off to a live <canvas> preview.
 */
export async function renderShareCardCanvas(
  canvas: HTMLCanvasElement,
  variant: ShareCardVariant,
  theme: ShareCardTheme,
  data: ShareCardData,
): Promise<void> {
  const format = SHARE_CARD_FORMATS[variant];
  const palette = PALETTES[theme];
  canvas.width = format.width;
  canvas.height = format.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const quote = clampQuoteText(data.quoteText);
  const quotePx = fontSizeForQuote(quote, variant);
  await ensureFontsLoaded(quotePx);

  // Background + brand accent bar.
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, format.width, format.height);
  ctx.fillStyle = palette.primary;
  ctx.fillRect(format.padding, format.padding, 64, 6);

  // Quote (word-wrapped against real measured widths).
  ctx.fillStyle = palette.foreground;
  ctx.textBaseline = "alphabetic";
  ctx.font = QUOTE_FONT(quotePx);
  const lineHeight = Math.round(quotePx * 1.32);
  const lines = wrapLines(`“${quote}”`, format.quoteMaxWidth, (s) => ctx.measureText(s).width);

  const byline = formatByline(data.attribution, data.sourceTitle);
  const wordmarkY = format.height - format.padding;
  const bylineY = byline ? wordmarkY - 56 : wordmarkY;
  const quoteBlockHeight = lines.length * lineHeight;
  const quoteTop = Math.max(
    format.padding + 96,
    Math.min(format.padding + 220, bylineY - 40 - quoteBlockHeight),
  );

  lines.forEach((line, i) => {
    ctx.fillText(line, format.padding, quoteTop + i * lineHeight + quotePx);
  });

  if (byline) {
    ctx.fillStyle = palette.foregroundTertiary;
    ctx.font = BYLINE_FONT;
    ctx.fillText(`— ${byline}`, format.padding, bylineY);
  }

  ctx.fillStyle = palette.foreground;
  ctx.font = WORDMARK_FONT;
  ctx.fillText("Founder Mode Advice", format.padding, wordmarkY);
}

/** Rasterize the current canvas contents to a PNG Blob (null if unsupported). */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}
