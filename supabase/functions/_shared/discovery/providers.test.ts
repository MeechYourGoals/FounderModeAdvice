import assert from "node:assert/strict";
import {
  createEvergreenFill,
  exaSearchBody,
  inferContentType,
  parseIsoDuration,
  resolveProviders,
  toResult,
  youTubeQueryParams,
  type DiscoveryResult,
} from "./providers.ts";
import { isBriefingEligible, publishedAfterIso } from "./recency.ts";

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

Deno.test("resolveProviders — only configured vendors are used, and none is a valid deployment", () => {
  // No keys means no live search. That is a supported configuration: the
  // evergreen fill in generate-recommendations is what keeps the edition
  // non-empty, so this must be an empty list rather than a stand-in provider.
  assert.deepEqual(resolveProviders({}).map((p) => p.id), []);

  const all = resolveProviders({ youTubeApiKey: "y", exaApiKey: "e" });
  assert.deepEqual(all.map((p) => p.id), ["exa", "youtube"]);

  // Exa alone is a complete deployment — it covers both intents.
  assert.deepEqual(resolveProviders({ exaApiKey: "e" }).map((p) => p.id), ["exa"]);

  const youTubeOnly = resolveProviders({ youTubeApiKey: "y" });
  assert.ok(!youTubeOnly.some((p) => p.id === "exa"));
  assert.deepEqual(youTubeOnly.map((p) => p.id), ["youtube"]);
});

Deno.test("evergreen fill — a throwing loader yields no candidates, not a crash", async () => {
  const fill = createEvergreenFill(() => {
    throw new Error("database unavailable");
  });
  assert.deepEqual(await fill(5), []);
});

Deno.test("YouTube always sets publishedAfter to the recency window", () => {
  const now = Date.parse("2026-08-21T12:00:00Z");
  const timely = youTubeQueryParams("launch industry developments", 8, "key", now);
  const evergreen = youTubeQueryParams("founder interview lessons", 8, "key", now);
  assert.equal(timely.get("publishedAfter"), publishedAfterIso(now));
  assert.equal(evergreen.get("publishedAfter"), publishedAfterIso(now));
});

Deno.test("toResult — a curated essay stays evergreen despite carrying a real date", () => {
  // Curated rows have genuine, often very old, publication dates. Letting the
  // date override the editorial classification would file every library item as
  // a stale discovered result and wreck the freshness metrics.
  const essay = toResult({
    ...base,
    url: "https://paulgraham.com/ds.html",
    title: "Do Things that Don't Scale",
    publishedAt: "2013-07-01",
    providerId: "curated",
    recencyBasis: "evergreen",
  })!;
  assert.equal(essay.recencyBasis, "evergreen");
  assert.equal(essay.publishedAt, new Date("2013-07-01").toISOString());
});

Deno.test("Exa — the request carries our own admission window, not a vendor bucket", () => {
  const now = Date.parse("2026-08-21T12:00:00Z");
  const body = exaSearchBody({ query: "sports industry developments", intent: "timely" }, 10, now);
  assert.equal(body.startPublishedDate, publishedAfterIso(now));
  assert.equal(body.query, "sports industry developments");
  assert.equal(body.numResults, 10);
  assert.equal(body.type, "auto");
});

Deno.test("Exa — numResults is clamped, and category is only set where it is unambiguous", () => {
  const now = Date.parse("2026-08-21T12:00:00Z");
  assert.equal(exaSearchBody({ query: "q for testing", intent: "timely" }, 500, now).numResults, 25);
  assert.equal(exaSearchBody({ query: "q for testing", intent: "timely" }, 0, now).numResults, 1);

  assert.equal(
    exaSearchBody({ query: "ai research overview", intent: "evergreen", prefer: "research" }, 10, now).category,
    "research paper",
  );
  assert.equal(exaSearchBody({ query: "sports industry news", intent: "timely" }, 10, now).category, undefined);
  assert.equal(
    exaSearchBody({ query: "founder interview lessons", intent: "evergreen" }, 10, now).category,
    undefined,
  );
});

Deno.test("Exa — dated hits are admitted, undated ones are not", async () => {
  const originalFetch = globalThis.fetch;
  let sentBody: Record<string, unknown> = {};
  let sentAuth: string | null = null;
  globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) => {
    sentBody = JSON.parse(String(init?.body ?? "{}"));
    sentAuth = new Headers(init?.headers).get("x-api-key");
    return Promise.resolve(
      new Response(
        JSON.stringify({
          requestId: "r1",
          results: [
            {
              url: "https://example.com/dated-piece",
              title: "A piece that reports its publication date",
              publishedDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
              author: "A Writer",
              image: "https://example.com/cover.png",
            },
            {
              url: "https://example.com/undated-piece",
              title: "A piece with no publication date at all",
              publishedDate: null,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }) as typeof fetch;

  try {
    const exa = resolveProviders({ exaApiKey: "secret-key" }).find((p) => p.id === "exa")!;
    const results = await exa.search({ query: "sports industry developments", intent: "timely" }, { limit: 10 });

    assert.equal(sentAuth, "secret-key", "authenticates with x-api-key");
    assert.ok(typeof sentBody.startPublishedDate === "string", "sends the date window");

    assert.equal(results.length, 2, "both hits map cleanly");
    const [dated, undated] = results;
    assert.equal(dated.author, "A Writer");
    assert.equal(dated.publisher, "example.com");
    assert.equal(isBriefingEligible(dated), true);
    assert.equal(undated.publishedAt, null);
    assert.equal(isBriefingEligible(undated), false, "an undated Exa hit is refused like any other");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
