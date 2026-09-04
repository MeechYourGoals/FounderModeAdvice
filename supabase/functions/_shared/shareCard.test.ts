import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  isLinkScraper,
  escapeHtml,
  truncateForTitle,
  buildOgDescription,
  landingUrl,
  imageUrl,
  buildShareCardHtml,
  buildNotFoundHtml,
} from "./shareCard.ts";

Deno.test("isLinkScraper matches known link-preview crawlers", () => {
  assert(isLinkScraper("Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)"));
  assert(isLinkScraper("Twitterbot/1.0"));
  // iMessage's previewer identifies as a facebookexternalhit-flavored UA.
  assert(isLinkScraper("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"));
  assert(isLinkScraper("WhatsApp/2.23.20.0"));
  assert(!isLinkScraper("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"));
  assert(!isLinkScraper(null));
  assert(!isLinkScraper(undefined));
});

Deno.test("escapeHtml escapes all five special characters", () => {
  assertEquals(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

Deno.test("truncateForTitle leaves short text untouched", () => {
  assertEquals(truncateForTitle("Ship the smaller thing faster."), "Ship the smaller thing faster.");
});

Deno.test("truncateForTitle truncates long text at a word boundary with an ellipsis", () => {
  const long = "a".repeat(50) + " " + "b".repeat(300);
  const result = truncateForTitle(long, 300);
  assert(result.length <= 300);
  assert(result.endsWith("…"));
  assert(!result.includes("b".repeat(300)));
});

Deno.test("buildOgDescription combines attribution and source with the site name", () => {
  assertEquals(
    buildOgDescription({
      slug: "abc",
      quote_text: "q",
      attribution: "Sam Altman",
      source_title: "How to Be Successful",
      source_url: null,
    }),
    "— Sam Altman · How to Be Successful · Founder Mode Advice",
  );
});

Deno.test("buildOgDescription falls back to just the site name with no attribution/source", () => {
  assertEquals(
    buildOgDescription({ slug: "abc", quote_text: "q", attribution: null, source_title: null, source_url: null }),
    "Founder Mode Advice",
  );
});

Deno.test("landingUrl and imageUrl are stable, URL-encoded paths", () => {
  assertEquals(landingUrl("Ab12 cd"), "https://foundermodeadvice.com/i/Ab12%20cd");
  assertEquals(
    imageUrl("https://project.supabase.co/functions/v1/", "Ab12"),
    "https://project.supabase.co/functions/v1/share-card/Ab12/image.png",
  );
});

Deno.test("buildShareCardHtml embeds escaped og tags and a JS redirect to the landing page", () => {
  const html = buildShareCardHtml(
    {
      slug: "xyz123",
      quote_text: `Ship the "smaller" thing faster.`,
      attribution: "Sam Altman",
      source_title: "How to Be Successful",
      source_url: "https://blog.samaltman.com/how-to-be-successful",
    },
    "https://project.supabase.co/functions/v1",
  );
  assert(html.includes('<meta property="og:title" content="Ship the &quot;smaller&quot; thing faster.">'));
  assert(html.includes('<meta property="og:image" content="https://project.supabase.co/functions/v1/share-card/xyz123/image.png">'));
  assert(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert(html.includes("https://foundermodeadvice.com/i/xyz123"));
});

Deno.test("buildNotFoundHtml points back at the site root", () => {
  const html = buildNotFoundHtml();
  assert(html.includes("no longer available"));
  assert(html.includes("https://foundermodeadvice.com/"));
});
