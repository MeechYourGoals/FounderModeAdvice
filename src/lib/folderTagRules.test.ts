import assert from "node:assert/strict";
import {
  folderColorFromTag,
  folderNameFromTag,
  normalizeTagName,
  tagHue,
} from "@/lib/folderTagRules.ts";

Deno.test("normalizeTagName — strips hash, trims, and lowercases", () => {
  assert.equal(normalizeTagName("#Marketing"), "marketing");
  assert.equal(normalizeTagName("  Operations  "), "operations");
  assert.equal(normalizeTagName("GO-TO-MARKET"), "go-to-market");
});

Deno.test("folderNameFromTag — title-cases words and hyphenated tags", () => {
  assert.equal(folderNameFromTag("marketing"), "Marketing");
  assert.equal(folderNameFromTag("go-to-market"), "Go-to-market");
  assert.equal(folderNameFromTag("#engineering"), "Engineering");
});

Deno.test("tagHue — stable for the same tag, different across tags", () => {
  assert.equal(tagHue("marketing"), tagHue("#Marketing"));
  assert.notEqual(tagHue("marketing"), tagHue("engineering"));
});

Deno.test("folderColorFromTag — returns an hsl color", () => {
  assert.match(folderColorFromTag("operations"), /^hsl\(\d+ 52% 46%\)$/);
});
