// Pure helpers for Boardroom "smart tag folders".
// Side-effect free so Deno tests can cover naming and color without a DOM.

export function normalizeTagName(tag: string): string {
  return tag.replace(/^#/, "").trim().toLowerCase();
}

/** Display folder name for a tag: "go-to-market" → "Go-to-market". */
export function folderNameFromTag(tag: string): string {
  const normalized = normalizeTagName(tag);
  if (!normalized) return "Untitled";
  return normalized.replace(/(^|[\s/_])(\S)/g, (_match, sep: string, ch: string) => {
    return `${sep}${ch.toUpperCase()}`;
  });
}

/** Stable hue so the same tag always gets the same tint. */
export function tagHue(tag: string): number {
  const value = normalizeTagName(tag);
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function folderColorFromTag(tag: string): string {
  const hue = tagHue(tag);
  return `hsl(${hue} 52% 46%)`;
}

export function tagPillStyle(tag: string, selected: boolean): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  const hue = tagHue(tag);
  if (selected) {
    return {
      backgroundColor: `hsl(${hue} 48% 42%)`,
      borderColor: `hsl(${hue} 48% 38%)`,
      color: "hsl(0 0% 100%)",
    };
  }
  return {
    backgroundColor: `hsl(${hue} 36% 50% / 0.16)`,
    borderColor: `hsl(${hue} 40% 55% / 0.38)`,
    color: `hsl(${hue} 55% 78%)`,
  };
}
