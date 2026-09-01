import assert from "node:assert/strict";
import {
  braveWebQueryParams,
  createEvergreenFill,
  exaSearchBody,
  inferContentType,
  parseBraveAge,
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

  const all = resolveProviders({ braveApiKey: "k", youTubeApiKey: "y", exaApiKey: "e" });
  assert.deepEqual(all.map((p) => p.id), ["brave_web", "brave_news", "exa", "youtube"]);

  const braveOnly = resolveProviders({ braveApiKey: "k" });
  assert.ok(!braveOnly.some((p) => p.id === "youtube"));
  assert.ok(!braveOnly.some((p) => p.id === "exa"));

  // Exa alone is a complete deployment — it covers both intents.
  assert.deepEqual(resolveProviders({ exaApiKey: "e" }).map((p) => p.id), ["exa"]);
});

Deno.test("news providers decline evergreen intents", () => {
  const providers = resolveProviders({ braveApiKey: "k" });
  const news = providers.find((p) => p.id === "brave_news")!;
  assert.equal(news.supports("timely"), true);
  assert.equal(news.supports("evergreen"), false);
});

Deno.test("evergreen fill — a throwing loader yields no candidates, not a crash", async () => {
  const fill = createEvergreenFill(() => {
    throw new Error("database unavailable");
  });
  assert.deepEqual(await fill(5), []);
});

Deno.test("Brave Web constrains the timely half only", () => {
  // An evergreen angle ("founder interview lessons") restricted to the past
  // month returns almost nothing, which is the opposite of that intent's point.
  assert.equal(braveWebQueryParams("rocket startup news", 10, "timely").get("freshness"), "pm");
  assert.equal(braveWebQueryParams("founder interview lessons", 10, "evergreen").get("freshness"), null);
  // Defaults to the safer, narrower window.
  assert.equal(braveWebQueryParams("rocket startup news", 10).get("freshness"), "pm");
});

Deno.test("YouTube always sets publishedAfter to the recency window", () => {
  const now = Date.parse("2026-08-21T12:00:00Z");
  const timely = youTubeQueryParams("launch industry developments", 8, "key", now);
  const evergreen = youTubeQueryParams("founder interview lessons", 8, "key", now);
  assert.equal(timely.get("publishedAfter"), publishedAfterIso(now));
  assert.equal(evergreen.get("publishedAfter"), publishedAfterIso(now));
});

Deno.test("parseBraveAge — Brave's second date field is worth reading", () => {
  const now = Date.parse("2026-08-21T12:00:00Z");
  assert.equal(parseBraveAge("3 days ago", now), new Date(now - 3 * 86_400_000).toISOString());
  assert.equal(parseBraveAge("1 hour ago", now), new Date(now - 3_600_000).toISOString());
  assert.equal(parseBraveAge("2 weeks ago", now), new Date(now - 2 * 604_800_000).toISOString());
  assert.equal(parseBraveAge("November 12, 2025", now), new Date("November 12, 2025").toISOString());
  // Anything we cannot pin to a real past instant stays undated.
  assert.equal(parseBraveAge("recently", now), null);
  assert.equal(parseBraveAge("", now), null);
  assert.equal(parseBraveAge(undefined, now), null);
  assert.equal(parseBraveAge("January 1, 2099", now), null);
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

Deno.test("Brave Web — an undated hit is never vouched for, on either intent", async () => {
  // Regression: braveResults used to stamp every hit "provider_window" on the
  // claim that both Brave endpoints constrain by date. That stopped being true
  // once evergreen web searches dropped freshness=pm, so undated (often
  // years-old) pages were admitted, then persisted with published_at = null —
  // counted in item_count but hidden by the servability rule.
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    requested.push(String(input));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          web: {
            results: [{
              url: "https://example.com/undated-essay",
              title: "An essay carrying no publication date at all",
              description: "Nothing here says when it was written.",
            }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }) as typeof fetch;

  try {
    const web = resolveProviders({ braveApiKey: "k" }).find((p) => p.id === "brave_web")!;

    for (const intent of ["evergreen", "timely"] as const) {
      const [result] = await web.search({ query: `founder ${intent} lessons`, intent }, { limit: 5 });
      assert.equal(result.publishedAt, null, `${intent}: stays undated`);
      assert.equal(result.recencyBasis, "published_at", `${intent}: no vendor-window claim`);
      assert.equal(isBriefingEligible(result), false, `${intent}: not admitted to an edition`);
    }

    // The evergreen request really is unconstrained — that is what made the old
    // blanket claim false.
    assert.ok(!requested[0].includes("freshness"), "evergreen web search sends no freshness window");
    assert.ok(requested[1].includes("freshness=pm"), "timely web search still asks for the past month");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Brave Web — a hit that carries a real date is still admitted", () => {
  // parseBraveAge is what preserves the yield: Brave fills `age` far more often
  // than `page_age`, and those hits pass on their own merit, not on a claim.
  const dated = toResult({
    ...base,
    url: "https://example.com/dated",
    title: "A story that does say when it was published",
    publishedAt: parseBraveAge("3 days ago"),
  })!;
  assert.equal(dated.recencyBasis, "published_at");
  assert.equal(isBriefingEligible(dated), true);
});

Deno.test("Exa — the request carries our own admission window, not a vendor bucket", () => {
  const now = Date.parse("2026-08-21T12:00:00Z");
  const body = exaSearchBody({ query: "sports industry developments", intent: "timely" }, 10, now);
  // Exa filters on the real publication date, so the vendor filter and
  // isRecentEnough cannot drift apart the way Brave's coarse buckets did.
  assert.equal(body.startPublishedDate, publishedAfterIso(now));
  assert.equal(body.query, "sports industry developments");
  assert.equal(body.numResults, 10);
  assert.equal(body.type, "auto");
});

Deno.test("Exa — numResults is clamped, and category is only set where it is unambiguous", () => {
  const now = Date.parse("2026-08-21T12:00:00Z");
  assert.equal(exaSearchBody({ query: "q for testing", intent: "timely" }, 500, now).numResults, 25);
  assert.equal(exaSearchBody({ query: "q for testing", intent: "timely" }, 0, now).numResults, 1);

  // Research is the one intent where a category narrows without losing good
  // material; forcing "news" on every timely query would drop operator blogs.
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
