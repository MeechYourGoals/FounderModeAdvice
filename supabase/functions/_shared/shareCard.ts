// Pure helpers for the share-card edge function: bot detection, HTML
// escaping, and the Open Graph document builder. Kept dependency-free and
// side-effect-free so they're unit-testable without a Deno.serve request.

export interface SharedInsightRow {
  slug: string;
  quote_text: string;
  attribution: string | null;
  source_title: string | null;
  source_url: string | null;
}

const SITE_URL = "https://foundermodeadvice.com";
const SITE_NAME = "Founder Mode Advice";

/**
 * Link-preview scrapers identify themselves in the User-Agent. iMessage's
 * previewer presents as a WebKit fetch carrying "facebookexternalhit" (Apple
 * reuses Meta's crawler signature for LinkPresentation), so it's covered by
 * the same allowlist entry as Slack/Facebook.
 */
const BOT_UA_PATTERN =
  /Slackbot|Twitterbot|facebookexternalhit|Facebot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Applebot|Iframely|Embedly|redditbot|Pinterest|Googlebot|bingbot|Skype|SkypeUriPreview/i;

export function isLinkScraper(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERN.test(userAgent);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Trim a quote for og:title while keeping it a clean sentence boundary where possible. */
export function truncateForTitle(text: string, maxLength = 300): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : cut.length)}…`;
}

export function buildOgDescription(row: SharedInsightRow): string {
  const parts = [
    row.attribution?.trim() ? `— ${row.attribution.trim()}` : null,
    row.source_title?.trim() || null,
  ].filter(Boolean);
  const suffix = parts.length > 0 ? `${parts.join(" · ")} · ` : "";
  return `${suffix}${SITE_NAME}`;
}

export function landingUrl(slug: string): string {
  return `${SITE_URL}/i/${encodeURIComponent(slug)}`;
}

export function imageUrl(functionsBaseUrl: string, slug: string): string {
  return `${functionsBaseUrl.replace(/\/$/, "")}/share-card/${encodeURIComponent(slug)}/image.png`;
}

export function buildShareCardHtml(row: SharedInsightRow, functionsBaseUrl: string): string {
  const title = escapeHtml(truncateForTitle(row.quote_text));
  const description = escapeHtml(buildOgDescription(row));
  const url = landingUrl(row.slug);
  const image = imageUrl(functionsBaseUrl, row.slug);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@foundermodeadvice">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<script>window.location.replace(${JSON.stringify(url)});</script>
</head>
<body>
<p>${title}</p>
<p><a href="${url}">Open on ${SITE_NAME}</a></p>
</body>
</html>`;
}

export function buildNotFoundHtml(): string {
  const title = escapeHtml(`${SITE_NAME} — link not found`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:url" content="${SITE_URL}/">
<script>window.location.replace(${JSON.stringify(SITE_URL + "/")});</script>
</head>
<body><p>This shared insight is no longer available.</p></body>
</html>`;
}
