import type { BlogSection } from "./blog";

const wordsIn = (s: BlogSection): number => {
  switch (s.kind) {
    case "p":
    case "h2":
      return s.text.trim().split(/\s+/).length;
    case "ul":
      return s.items.reduce((n, it) => n + it.trim().split(/\s+/).length, 0);
    case "quote":
      return s.text.trim().split(/\s+/).length;
    case "callout":
      return s.title.trim().split(/\s+/).length + s.body.trim().split(/\s+/).length;
  }
};

export const estimateReadingMinutes = (sections: BlogSection[]): number => {
  const total = sections.reduce((n, s) => n + wordsIn(s), 0);
  return Math.max(1, Math.round(total / 220));
};
