/** Shared helpers to keep Intriguing Insights generic (not profile-specific). */

export function companyNameVariants(companyName: string): string[] {
  const trimmed = companyName.trim();
  if (trimmed.length < 3) return [];

  const variants = new Set<string>();
  const add = (value: string) => {
    const next = value.trim();
    if (next.length >= 3) variants.add(next);
  };

  add(trimmed);
  add(trimmed.replace(/\s+/g, ""));
  add(trimmed.replace(/([a-z])([A-Z])/g, "$1 $2"));
  add(trimmed.replace(/\s+(inc|llc|ltd|co\.?|corp\.?|corporation|company)\.?$/i, ""));
  return Array.from(variants);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mentionsViewerCompany(text: string, companyName: string | null | undefined): boolean {
  if (!text || !companyName?.trim()) return false;
  const variants = companyNameVariants(companyName);
  if (variants.length === 0) return false;
  const pattern = new RegExp(
    `(?:^|[^A-Za-z0-9])(?:${variants.map(escapeRegExp).join("|")})(?:[^A-Za-z0-9]|$)`,
    "i",
  );
  return pattern.test(text);
}

export function stripViewerCompanyMentions(text: string, companyName: string): string {
  let result = text;
  const variants = companyNameVariants(companyName).sort((a, b) => b.length - a.length);

  for (const variant of variants) {
    const escaped = escapeRegExp(variant);
    result = result.replace(new RegExp(`^For\\s+${escaped}\\s*[,:—-]\\s*`, "i"), "");
    result = result.replace(new RegExp(`\\b${escaped}'s\\b`, "gi"), "a company's");
    result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "a company");
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

/** Display-time guard so already-saved lessons do not address the viewer's company. */
export function toGenericInsightText(text: string, viewerCompanyName?: string | null): string {
  if (!viewerCompanyName?.trim() || !mentionsViewerCompany(text, viewerCompanyName)) {
    return text;
  }
  return stripViewerCompanyMentions(text, viewerCompanyName);
}
