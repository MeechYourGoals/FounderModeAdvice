// Serves the public "Share an insight" surface:
//   GET /share-card/:slug             -> Open Graph HTML for link scrapers,
//                                         302 redirect to /i/:slug for humans
//   GET /share-card/:slug/image.png   -> branded 1200x630 PNG (og:image)
//
// No Supabase JWT: a share link is opened from Slack/iMessage/WhatsApp/X by
// people (and bots) who have never signed in, so this function is listed
// with verify_jwt = false in supabase/config.toml and does its own lookup
// via the service role client.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ImageResponse } from "npm:@vercel/og@^0.6";
import React from "npm:react@^19";
import {
  isLinkScraper,
  buildShareCardHtml,
  buildNotFoundHtml,
  type SharedInsightRow,
} from "../_shared/shareCard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_FALLBACK_IMAGE = "https://foundermodeadvice.com/og-image.png";
const SITE_URL = "https://foundermodeadvice.com";

// ---------------------------------------------------------------------------
// Fonts — fetched once per isolate and cached in module scope. Google's CSS2
// endpoint only ever serves woff2/woff (unusable by satori/@vercel/og, which
// need TTF/OTF), so the legacy `css` (v1) endpoint is queried with a UA that
// signals no woff2 support; it replies with `format('truetype')` src URLs.
// ---------------------------------------------------------------------------

type FontSpec = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700; style: "normal" | "italic" };

let fontsPromise: Promise<FontSpec[] | null> | null = null;

async function fetchTtf(family: string, weight: number, italic: boolean): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    family: `${family}:${italic ? "italic" : "normal"}`,
  });
  const cssUrl = `https://fonts.googleapis.com/css?${params.toString()}&text=${encodeURIComponent(
    "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789—–'\".,! ",
  )}`;
  const cssRes = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)" },
  });
  if (!cssRes.ok) throw new Error(`Font CSS fetch failed: ${cssRes.status}`);
  const css = await cssRes.text();
  const match = css.match(/src: url\(([^)]+)\) format\('truetype'\)/);
  if (!match) throw new Error(`No truetype src found for ${family}`);
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) throw new Error(`Font file fetch failed: ${fontRes.status}`);
  return fontRes.arrayBuffer();
}

/** Best-effort font load. Returns null (never throws) so callers can fall back cleanly. */
function loadFonts(): Promise<FontSpec[] | null> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      try {
        const [frauncesItalic, interRegular, interSemibold] = await Promise.all([
          fetchTtf("Fraunces", 600, true),
          fetchTtf("Inter", 400, false),
          fetchTtf("Inter", 600, false),
        ]);
        return [
          { name: "Fraunces", data: frauncesItalic, weight: 600, style: "italic" },
          { name: "Inter", data: interRegular, weight: 400, style: "normal" },
          { name: "Inter", data: interSemibold, weight: 600, style: "normal" },
        ];
      } catch (err) {
        console.warn("[share-card] font load failed, image generation will fall back to static:", err);
        return null;
      }
    })();
  }
  return fontsPromise;
}

// ---------------------------------------------------------------------------
// Image rendering
// ---------------------------------------------------------------------------

function clampQuote(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 280 ? `${trimmed.slice(0, 279)}…` : trimmed;
}

async function renderCardPng(row: SharedInsightRow): Promise<ArrayBuffer | null> {
  const fonts = await loadFonts();
  if (!fonts) return null;

  const quote = clampQuote(row.quote_text);
  const byline = [row.attribution, row.source_title].filter(Boolean).join(" · ");

  try {
    const image = new ImageResponse(
      React.createElement(
        "div",
        {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px",
            backgroundColor: "#0c0e15",
            backgroundImage:
              "radial-gradient(60% 50% at 18% 8%, rgba(64,150,255,0.18), transparent 70%)",
            fontFamily: "Inter",
          },
        },
        React.createElement("div", {
          style: { width: "56px", height: "5px", borderRadius: "999px", backgroundColor: "#4096ff" },
        }),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "28px",
              maxWidth: "1000px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: quote.length > 160 ? "44px" : "56px",
                lineHeight: 1.28,
                color: "#f5f7fb",
              },
            },
            `“${quote}”`,
          ),
          byline
            ? React.createElement(
                "div",
                { style: { fontSize: "26px", fontWeight: 400, color: "#9aa7bd" } },
                `— ${byline}`,
              )
            : null,
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "24px",
              fontWeight: 600,
              color: "#f5f7fb",
            },
          },
          "Founder Mode Advice",
        ),
      ),
      {
        width: 1200,
        height: 630,
        fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
      },
    );
    return await image.arrayBuffer();
  } catch (err) {
    console.warn("[share-card] image render failed, falling back to static image:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const marker = "/share-card";
  const markerIndex = url.pathname.indexOf(marker);
  const functionsBaseUrl = markerIndex >= 0 ? url.origin + url.pathname.slice(0, markerIndex) : url.origin;
  const rest = markerIndex >= 0
    ? url.pathname.slice(markerIndex + marker.length).split("/").filter(Boolean)
    : [];

  if (rest.length === 0) {
    return Response.redirect(SITE_URL, 302);
  }

  const slug = decodeURIComponent(rest[0]);
  const wantsImage = rest[1] === "image.png";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: row } = await supabase
    .from("shared_insights")
    .select("slug, quote_text, attribution, source_title, source_url")
    .eq("slug", slug)
    .is("revoked_at", null)
    .maybeSingle();

  if (wantsImage) {
    if (!row) return Response.redirect(STATIC_FALLBACK_IMAGE, 302);

    // Lazy cache in the public share-cards bucket: serve a previously
    // generated PNG directly, skipping font fetch + render entirely.
    const cachePath = `${slug}.png`;
    const { data: cached } = await supabase.storage.from("share-cards").download(cachePath);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const png = await renderCardPng(row as SharedInsightRow);
    if (!png) return Response.redirect(STATIC_FALLBACK_IMAGE, 302);

    // Best-effort write-through; never fail the response over a cache miss.
    try {
      await supabase.storage
        .from("share-cards")
        .upload(cachePath, png, { contentType: "image/png", upsert: true });
    } catch (err) {
      console.warn("[share-card] failed to cache generated image:", err);
    }

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (!row) {
    return new Response(buildNotFoundHtml(), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (isLinkScraper(req.headers.get("user-agent"))) {
    return new Response(buildShareCardHtml(row as SharedInsightRow, functionsBaseUrl), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return Response.redirect(`${SITE_URL}/i/${encodeURIComponent(slug)}`, 302);
});
