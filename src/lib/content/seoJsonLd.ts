/**
 * JSON-LD builders. Everything self-references its route via absolute URLs.
 */

export const SITE_ORIGIN = "https://foundermodeadvice.com";

export const abs = (path: string) =>
  `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

export const breadcrumbList = (
  crumbs: { name: string; path: string }[],
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: abs(c.path),
  })),
});

export const itemList = (
  items: { name: string; path: string; description?: string }[],
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: abs(it.path),
    name: it.name,
    ...(it.description ? { description: it.description } : {}),
  })),
});

export const articleSchema = (args: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  updatedAt?: string;
  authorName?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: args.headline,
  description: args.description,
  mainEntityOfPage: abs(args.path),
  datePublished: args.datePublished,
  dateModified: args.updatedAt ?? args.datePublished,
  author: { "@type": "Organization", name: args.authorName ?? "Founder Mode Advice" },
  publisher: {
    "@type": "Organization",
    name: "Founder Mode Advice",
    url: SITE_ORIGIN,
  },
});

export const faqSchema = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
