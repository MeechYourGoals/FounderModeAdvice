import assert from "node:assert/strict";
import {
  createCuratedProvider,
  inferContentType,
  parseIsoDuration,
  resolveProviders,
  toResult,
  type DiscoveryResult,
} from "./providers.ts";

const base = {
  providerId: "test",
  rank: 0,
  intent: "evergreen" as const,
};

Deno.test("toResult — normalizes a well-formed hit", () => {
  const result = toResult({
    ...base,
    url: "https://www.example.com/story/?utm_source=x",
    title: "  A perfectly reasonable headline about launch economics  ",
    description: "<p>Some &amp; description</p>",
    publisher: "Example News",
    publishedAt: "2026-08-10T00:00:00Z",
    imageUrl: "https://example.com/img.png",
  });
  assert.ok(result);
  assert.equal(result!.canonicalUrl, "https://example.com/story");
  assert.equal(result!.contentKey, "example.com/story");
  assert.equal(result!.title, "A perfectly reasonable headline about launch economics");
  assert.equal(result!.description, "Some & description");
  assert.equal(result!.publisher, "Example News");
});

Deno.test("toResult — rejects unusable candidates", () => {
  assert.equal(toResult({ ...base, url: 123, title: "A perfectly fine title here" }), null);
  assert.equal(toResult({ ...base, url: "javascript:alert(1)", title: "A perfectly fine title" }), null);
  assert.equal(toResult({ ...base, url: "https://example.com/a", title: "short" }), null);
  assert.equal(
    toResult({ ...base, url: "https://example.com/a", title: "CLICK HERE FOR FREE DOWNLOAD NOW" }),
    null,
  );
});

Deno.test("toResult — falls back to the host when no publisher is given", () => {
  const result = toResult({
    ...base,
    url: "https://blog.example.com/post",
    title: "An adequately descriptive headline",
  });
  assert.equal(result!.publisher, "blog.example.com");
});

Deno.test("toResult — drops nonsense publication dates", () => {
  const future = new Date(Date.now() + 90 * 86_400_000).toISOString();
  const result = toResult({
    ...base,
    url: "https://example.com/a",
    title: "An adequately descriptive headline",
    publishedAt: future,
  });
  assert.equal(result!.publishedAt, null);
  const bad = toResult({
    ...base,
    url: "https://example.com/b",
    title: "An adequately descriptive headline",
    publishedAt: "not a date",
  });
  assert.equal(bad!.publishedAt, null);
});

Deno.test("inferContentType — derives type from the host when unhinted", () => {
  assert.equal(inferContentType("https://youtube.com/watch?v=abc"), "video");
  assert.equal(inferContentType("https://arxiv.org/abs/1706.03762"), "research");
  assert.equal(inferContentType("https://podcasts.apple.com/show/x"), "podcast");
  assert.equal(inferContentType("https://paulgraham.com/ds.html"), "essay");
  assert.equal(inferContentType("https://someone.substack.com/p/x"), "essay");
  assert.equal(inferContentType("https://news.example.com/story"), "article");
});

Deno.test("parseIsoDuration — handles YouTube's duration shapes", () => {
  assert.equal(parseIsoDuration("PT28M"), 1680);
  assert.equal(parseIsoDuration("PT1H2M3S"), 3723);
  assert.equal(parseIsoDuration("P1DT2H"), 93600);
  assert.equal(parseIsoDuration("PT0S"), null);
  assert.equal(parseIsoDuration("nonsense"), null);
  assert.equal(parseIsoDuration(undefined), null);
});

Deno.test("resolveProviders — only configured vendors are used, curated is always last", () => {
  const noop = async (): Promise<DiscoveryResult[]> => [];

  const none = resolveProviders({}, noop);
  assert.deepEqual(none.map((p) => p.id), ["curated"]);

  const all = resolveProviders({ braveApiKey: "k", youTubeApiKey: "y" }, noop);
  assert.deepEqual(all.map((p) => p.id), ["brave_web", "brave_news", "youtube", "curated"]);

  const braveOnly = resolveProviders({ braveApiKey: "k" }, noop);
  assert.ok(!braveOnly.some((p) => p.id === "youtube"));
});

Deno.test("news providers decline evergreen intents", () => {
  const providers = resolveProviders({ braveApiKey: "k" }, async () => []);
  const news = providers.find((p) => p.id === "brave_news")!;
  assert.equal(news.supports("timely"), true);
  assert.equal(news.supports("evergreen"), false);
});

Deno.test("curated provider — a throwing loader yields no candidates, not a crash", async () => {
  const provider = createCuratedProvider(() => {
    throw new Error("database unavailable");
  });
  const results = await provider.search(
    { query: "anything", intent: "evergreen" },
    { limit: 5 },
  );
  assert.deepEqual(results, []);
});
