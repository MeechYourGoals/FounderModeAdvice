import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  wrapLines,
  fontSizeForQuote,
  clampQuoteText,
  formatByline,
  SHARE_CARD_FORMATS,
} from "./shareCard.ts";

// A monospace-ish synthetic measurer so wrapping is deterministic in tests.
const measure = (s: string) => s.length * 10;

Deno.test("wrapLines keeps short text on one line", () => {
  assertEquals(wrapLines("Ship the smaller thing faster.", 1000, measure), [
    "Ship the smaller thing faster.",
  ]);
});

Deno.test("wrapLines breaks at word boundaries once the max width is exceeded", () => {
  const lines = wrapLines("one two three four five six seven eight", 100, measure);
  for (const line of lines) assert(measure(line) <= 100 || !line.includes(" "));
  assertEquals(lines.join(" "), "one two three four five six seven eight");
});

Deno.test("wrapLines never drops a single very long word even past maxWidth", () => {
  const lines = wrapLines("supercalifragilisticexpialidocious", 10, measure);
  assertEquals(lines, ["supercalifragilisticexpialidocious"]);
});

Deno.test("wrapLines returns an empty array for blank input", () => {
  assertEquals(wrapLines("   ", 500, measure), []);
});

Deno.test("fontSizeForQuote steps down as the quote gets longer", () => {
  const short = fontSizeForQuote("Short quote.");
  const medium = fontSizeForQuote("a".repeat(150));
  const long = fontSizeForQuote("a".repeat(300));
  assert(short > medium);
  assert(medium > long);
});

Deno.test("fontSizeForQuote scales up slightly for the story variant", () => {
  assert(fontSizeForQuote("Short quote.", "story") > fontSizeForQuote("Short quote.", "link"));
});

Deno.test("clampQuoteText leaves short text untouched", () => {
  assertEquals(clampQuoteText("Ship the smaller thing faster."), "Ship the smaller thing faster.");
});

Deno.test("clampQuoteText truncates long text at a word boundary with an ellipsis", () => {
  const long = "word ".repeat(100);
  const result = clampQuoteText(long, 320);
  assert(result.length <= 320);
  assert(result.endsWith("…"));
});

Deno.test("formatByline joins attribution and source, skipping missing parts", () => {
  assertEquals(formatByline("Sam Altman", "How to Be Successful"), "Sam Altman · How to Be Successful");
  assertEquals(formatByline("Sam Altman", null), "Sam Altman");
  assertEquals(formatByline(null, undefined), "");
});

Deno.test("SHARE_CARD_FORMATS defines both variants with positive dimensions", () => {
  for (const format of Object.values(SHARE_CARD_FORMATS)) {
    assert(format.width > 0 && format.height > 0 && format.quoteMaxWidth <= format.width);
  }
});
