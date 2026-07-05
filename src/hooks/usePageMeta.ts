import { useEffect } from "react";

const SITE_NAME = "Founder Mode Advice";
const SITE_URL = "https://foundermodeadvice.com";
const DEFAULT_TITLE = "Founder Mode Advice — turn any link or document into founder advice";
const DEFAULT_DESCRIPTION =
  "Paste almost any public URL — articles, posts, newsletters, videos, podcasts — or upload private docs, and get operating memos, risks, action items, and follow-up Q&A tailored to your company, stage, and next decision.";

interface PageMeta {
  /** Page-specific title; rendered as "<title> — Founder Mode Advice". */
  title?: string;
  description?: string;
  /** Route path for the canonical URL, e.g. "/faq". Defaults to the site root. */
  path?: string;
  /** Set on thin/private/error pages so soft-404s and app screens stay out of the index. */
  noindex?: boolean;
}

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Per-route document metadata for this SPA: title, description, canonical,
 * og/twitter overrides, and optional robots noindex. Restores the site-wide
 * defaults on unmount so navigating back to "/" never keeps a stale title.
 */
export function usePageMeta({ title, description, path, noindex }: PageMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const canonicalUrl = `${SITE_URL}${path ?? "/"}`;

    document.title = fullTitle;
    setMetaTag("name", "description", desc);
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("property", "og:description", desc);
    setMetaTag("name", "twitter:description", desc);
    setMetaTag("property", "og:url", canonicalUrl);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl;

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex";
    } else if (robots) {
      robots.remove();
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag("name", "description", DEFAULT_DESCRIPTION);
      setMetaTag("property", "og:title", DEFAULT_TITLE);
      setMetaTag("name", "twitter:title", DEFAULT_TITLE);
      setMetaTag("property", "og:description", DEFAULT_DESCRIPTION);
      setMetaTag("name", "twitter:description", DEFAULT_DESCRIPTION);
      setMetaTag("property", "og:url", `${SITE_URL}/`);
      if (canonical) canonical.href = `${SITE_URL}/`;
      document.head.querySelector('meta[name="robots"]')?.remove();
    };
  }, [title, description, path, noindex]);
}
