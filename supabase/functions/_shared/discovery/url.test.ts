// Run with: deno test (see the root deno.json "test" task).
// Assertions come from node:assert so these run with no network access.
import assert from "node:assert/strict";
import { canonicalizeUrl, contentKey, hostOf, titleSimilarity, youTubeVideoId } from "./url.ts";

Deno.test("youTubeVideoId — every URL shape resolves to the same id", () => {
  const id = "UF8uR6Z6KLc";
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=30s`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
  ]) {
    assert.equal(youTubeVideoId(url), id, url);
  }
});

Deno.test("youTubeVideoId — rejects non-YouTube and malformed ids", () => {
  assert.equal(youTubeVideoId("https://vimeo.com/12345"), null);
  assert.equal(youTubeVideoId("https://youtube.com/watch?v=tooshort"), null);
  assert.equal(youTubeVideoId("not a url"), null);
});

Deno.test("canonicalizeUrl — strips tracking, www, scheme, and trailing slash", () => {
  assert.equal(
    canonicalizeUrl("http://www.Example.com/post/?utm_source=twitter&utm_campaign=x&id=7#section"),
    "https://example.com/post?id=7",
  );
});

Deno.test("canonicalizeUrl — param order does not change the result", () => {
  assert.equal(
    canonicalizeUrl("https://example.com/a?b=2&a=1"),
    canonicalizeUrl("https://example.com/a?a=1&b=2"),
  );
});

Deno.test("canonicalizeUrl — rejects non-http schemes", () => {
  assert.equal(canonicalizeUrl("javascript:alert(1)"), null);
  assert.equal(canonicalizeUrl("data:text/html,hi"), null);
  assert.equal(canonicalizeUrl("file:///etc/passwd"), null);
});

Deno.test("contentKey — http/https/www/AMP/tracking variants collapse to one key", () => {
  const expected = "example.com/2026/08/story";
  for (const url of [
    "http://example.com/2026/08/story",
    "https://www.example.com/2026/08/story/",
    "https://example.com/2026/08/story?utm_source=newsletter",
    "https://example.com/2026/08/story/amp/",
  ]) {
    assert.equal(contentKey(url), expected, url);
  }
});

Deno.test("contentKey — distinct pages keep distinct keys", () => {
  assert.notEqual(contentKey("https://example.com/a"), contentKey("https://example.com/b"));
  assert.notEqual(
    contentKey("https://example.com/a?id=1"),
    contentKey("https://example.com/a?id=2"),
  );
});

/**
 * The seed migration hard-codes content_key strings. If this normalizer ever
 * drifts from them, rediscovering a curated item would insert a duplicate row
 * instead of matching — so the exact values are pinned here.
 */
Deno.test("contentKey — matches the values seeded in the inspiration library migration", () => {
  const seeded: Array<[string, string]> = [
    ["https://paulgraham.com/ds.html", "paulgraham.com/ds.html"],
    ["https://blog.samaltman.com/how-to-be-successful", "blog.samaltman.com/how-to-be-successful"],
    [
      "https://steveblank.com/2010/01/25/whats-a-startup-first-principles/",
      "steveblank.com/2010/01/25/whats-a-startup-first-principles",
    ],
    ["https://www.ycombinator.com/library", "ycombinator.com/library"],
    ["https://kk.org/thetechnium/1000-true-fans/", "kk.org/thetechnium/1000-true-fans"],
    [
      "https://cdixon.org/2009/11/15/the-next-big-thing-will-start-out-looking-like-a-toy",
      "cdixon.org/2009/11/15/the-next-big-thing-will-start-out-looking-like-a-toy",
    ],
    ["https://www.svpg.com/good-product-team-bad-product-team/", "svpg.com/good-product-team-bad-product-team"],
    ["https://www.svpg.com/product-fail/", "svpg.com/product-fail"],
    ["https://stratechery.com/2015/aggregation-theory/", "stratechery.com/2015/aggregation-theory"],
    [
      "https://www.joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code/",
      "joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code",
    ],
    [
      "https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/",
      "joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i",
    ],
    ["https://arxiv.org/abs/1706.03762", "arxiv.org/abs/1706.03762"],
    ["https://arxiv.org/abs/2005.14165", "arxiv.org/abs/2005.14165"],
    [
      "https://karpathy.medium.com/software-2-0-a64152b37c35",
      "karpathy.medium.com/software-2-0-a64152b37c35",
    ],
    ["https://www.youtube.com/watch?v=UF8uR6Z6KLc", "youtube:UF8uR6Z6KLc"],
    ["https://www.youtube.com/watch?v=qp0HIF3SfI4", "youtube:qp0HIF3SfI4"],
    ["https://www.youtube.com/watch?v=Ks-_Mh1QhMc", "youtube:Ks-_Mh1QhMc"],
    ["https://www.youtube.com/watch?v=kCc8FmEb1nY", "youtube:kCc8FmEb1nY"],
    ["https://www.youtube.com/watch?v=CBYhVcO4WgI", "youtube:CBYhVcO4WgI"],
    ["https://paulgraham.com/startupideas.html", "paulgraham.com/startupideas.html"],
    ["https://paulgraham.com/growth.html", "paulgraham.com/growth.html"],
    ["https://paulgraham.com/startupmistakes.html", "paulgraham.com/startupmistakes.html"],
    ["https://paulgraham.com/13sentences.html", "paulgraham.com/13sentences.html"],
    ["https://paulgraham.com/wealth.html", "paulgraham.com/wealth.html"],
    ["https://paulgraham.com/makersschedule.html", "paulgraham.com/makersschedule.html"],
    // Second seed (20260902120000_seed_inspiration_library_v2.sql).
    ["https://paulgraham.com/before.html", "paulgraham.com/before.html"],
    ["https://paulgraham.com/really.html", "paulgraham.com/really.html"],
    ["https://paulgraham.com/founders.html", "paulgraham.com/founders.html"],
    ["https://paulgraham.com/die.html", "paulgraham.com/die.html"],
    ["https://paulgraham.com/determination.html", "paulgraham.com/determination.html"],
    ["https://paulgraham.com/schlep.html", "paulgraham.com/schlep.html"],
    ["https://paulgraham.com/relres.html", "paulgraham.com/relres.html"],
    ["https://paulgraham.com/superlinear.html", "paulgraham.com/superlinear.html"],
    ["https://paulgraham.com/fr.html", "paulgraham.com/fr.html"],
    ["https://paulgraham.com/convince.html", "paulgraham.com/convince.html"],
    ["https://paulgraham.com/swan.html", "paulgraham.com/swan.html"],
    ["https://blog.samaltman.com/idea-generation", "blog.samaltman.com/idea-generation"],
    ["https://blog.samaltman.com/productivity", "blog.samaltman.com/productivity"],
    [
      "https://blog.samaltman.com/the-strength-of-being-misunderstood",
      "blog.samaltman.com/the-strength-of-being-misunderstood",
    ],
    [
      "https://www.joelonsoftware.com/2002/01/06/fire-and-motion/",
      "joelonsoftware.com/2002/01/06/fire-and-motion",
    ],
    ["https://arxiv.org/abs/1512.03385", "arxiv.org/abs/1512.03385"],
    ["https://arxiv.org/abs/1810.04805", "arxiv.org/abs/1810.04805"],
    ["https://arxiv.org/abs/2203.02155", "arxiv.org/abs/2203.02155"],
    ["https://arxiv.org/abs/1406.2661", "arxiv.org/abs/1406.2661"],
    ["https://arxiv.org/abs/2302.13971", "arxiv.org/abs/2302.13971"],
  ];
  for (const [url, key] of seeded) {
    assert.equal(contentKey(url), key, url);
  }
});

Deno.test("hostOf — drops www and lowercases", () => {
  assert.equal(hostOf("https://WWW.Example.com/x"), "example.com");
  assert.equal(hostOf("nope"), null);
});

Deno.test("titleSimilarity — catches the same story across publishers", () => {
  const a = "SpaceX lands Starship booster on the launch tower";
  const b = "SpaceX Lands Its Starship Booster On The Launch Tower Again";
  assert.ok(titleSimilarity(a, b) >= 0.6, `expected high similarity, got ${titleSimilarity(a, b)}`);
});

Deno.test("titleSimilarity — unrelated titles score low", () => {
  const score = titleSimilarity(
    "How Ramp built its early enterprise sales motion",
    "Attention Is All You Need",
  );
  assert.ok(score < 0.2, `expected low similarity, got ${score}`);
});
