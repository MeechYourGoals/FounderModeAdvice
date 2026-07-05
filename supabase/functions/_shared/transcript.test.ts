import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectPlatform } from "./transcript.ts";

Deno.test("detectPlatform — YouTube variants", () => {
  assertEquals(detectPlatform("https://www.youtube.com/watch?v=abc"), "youtube");
  assertEquals(detectPlatform("https://youtu.be/abc"), "youtube");
  assertEquals(detectPlatform("https://m.youtube.com/shorts/xyz"), "youtube");
});

Deno.test("detectPlatform — TikTok", () => {
  assertEquals(detectPlatform("https://www.tiktok.com/@user/video/123"), "tiktok");
  assertEquals(detectPlatform("https://vm.tiktok.com/abc"), "tiktok");
});

Deno.test("detectPlatform — Instagram", () => {
  assertEquals(detectPlatform("https://www.instagram.com/reel/abc/"), "instagram");
  assertEquals(detectPlatform("https://instagr.am/p/abc"), "instagram");
});

Deno.test("detectPlatform — X / Twitter", () => {
  assertEquals(detectPlatform("https://x.com/user/status/123"), "x");
  assertEquals(detectPlatform("https://twitter.com/user/status/123"), "x");
  assertEquals(detectPlatform("https://t.co/abc"), "x");
});

Deno.test("detectPlatform — Vimeo + generic", () => {
  assertEquals(detectPlatform("https://vimeo.com/12345"), "vimeo");
  assertEquals(detectPlatform("https://example.com/video.mp4"), "generic");
  assertEquals(detectPlatform("not a url"), "generic");
});

Deno.test("detectPlatform — Substack and Medium", () => {
  assertEquals(detectPlatform("https://founder.substack.com/p/hello"), "substack");
  assertEquals(detectPlatform("https://medium.com/@user/post-slug"), "medium");
});

Deno.test("detectPlatform — article paths", () => {
  assertEquals(detectPlatform("https://example.com/blog/my-post"), "article");
});
