// Shared multi-platform transcript + metadata adapter.
// Supports YouTube, TikTok, Instagram, X/Twitter, Vimeo, LinkedIn, podcasts, and generic web video.
// Transcript provider: Supadata (https://supadata.ai) — one URL → plain-text transcript across all major platforms.

export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "x"
  | "vimeo"
  | "linkedin"
  | "podcast"
  | "generic";

export type VideoTranscript = {
  transcriptText: string;
  language: string | null;
  source: string; // e.g. "youtube_captions", "supadata_tiktok"
};

export type VideoMetadata = {
  title: string | null;
  author: string | null;
  thumbnail: string | null;
  description: string | null;
};

export type VideoContext = {
  platform: Platform;
  metadata: VideoMetadata;
  transcript: VideoTranscript | null;
};

export const detectPlatform = (urlString: string): Platform => {
  try {
    const u = new URL(urlString);
    const h = u.hostname.toLowerCase();
    if (h.includes("youtube.com") || h === "youtu.be" || h.endsWith(".youtube.com")) return "youtube";
    if (h.includes("tiktok.com")) return "tiktok";
    if (h.includes("instagram.com") || h === "instagr.am") return "instagram";
    if (h === "x.com" || h === "twitter.com" || h.endsWith(".x.com") || h.endsWith(".twitter.com") || h === "t.co") return "x";
    if (h.includes("vimeo.com")) return "vimeo";
    if (h.includes("linkedin.com") || h === "lnkd.in") return "linkedin";
    if (/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(u.pathname)) return "podcast";
    return "generic";
  } catch {
    return "generic";
  }
};

/** Short-link hosts that 30x-redirect to the canonical video URL. */
const SHORT_LINK_HOSTS = new Set([
  "vm.tiktok.com",
  "vt.tiktok.com",
  "t.co",
  "instagr.am",
  "lnkd.in",
  "youtu.be", // canonicalize to youtube.com/watch?v=
]);

/** Tracking params to strip for stable dedup + cleaner Supadata calls. */
const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "si", "feature", "igsh", "igshid", "fbclid", "gclid", "ref", "ref_src", "ref_url",
];

/** Resolve short links and strip tracking junk. Safe to call before any other step. */
export const canonicalizeVideoUrl = async (input: string): Promise<string> => {
  const trimmed = input.trim();
  let current = trimmed;
  try {
    let u = new URL(current);
    // Follow up to 3 redirects on known short-link hosts.
    for (let i = 0; i < 3; i++) {
      if (!SHORT_LINK_HOSTS.has(u.hostname.toLowerCase())) break;
      const res = await fetch(current, { method: "HEAD", redirect: "follow" });
      if (res.url && res.url !== current) {
        current = res.url;
        u = new URL(current);
      } else {
        break;
      }
    }
    // Strip tracking params.
    for (const p of TRACKING_PARAMS) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return trimmed;
  }
};

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const extractMeta = (html: string, names: string[]): string | null => {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1]);
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeHtml(m2[1]);
  }
  return null;
};

/** Fetch oEmbed (preferred) or fall back to scraping OpenGraph tags. */
export const fetchOEmbedOrOg = async (
  url: string,
  platform: Platform,
): Promise<VideoMetadata> => {
  const empty: VideoMetadata = { title: null, author: null, thumbnail: null, description: null };
  try {
    // oEmbed endpoints (no auth required, lightweight)
    const oembedUrl =
      platform === "youtube"
        ? `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        : platform === "vimeo"
        ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
        : platform === "tiktok"
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
        : null;

    if (oembedUrl) {
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const j = await res.json();
        return {
          title: j.title || null,
          author: j.author_name || null,
          thumbnail: j.thumbnail_url || null,
          description: j.description || null,
        };
      }
    }

    // OG scrape fallback for everything else (and oEmbed failures)
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return empty;
    const html = await res.text();
    return {
      title:
        extractMeta(html, ["og:title", "twitter:title"]) ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
        null,
      author: extractMeta(html, ["og:site_name", "author", "twitter:creator"]),
      thumbnail: extractMeta(html, ["og:image", "twitter:image"]),
      description: extractMeta(html, ["og:description", "twitter:description", "description"]),
    };
  } catch (e) {
    console.warn("fetchOEmbedOrOg failed:", e);
    return empty;
  }
};

/** YouTube native caption extractor (free; tried first for YouTube to save Supadata credits). */
const extractYouTubeTranscriptNative = async (videoUrl: string): Promise<VideoTranscript | null> => {
  try {
    const u = new URL(videoUrl);
    let videoId = "";
    if (u.hostname === "youtu.be") videoId = u.pathname.slice(1).split("/")[0];
    else if (u.pathname.startsWith("/shorts/")) videoId = u.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    else videoId = u.searchParams.get("v") || "";
    if (!videoId) return null;

    const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!watch.ok) return null;
    const html = await watch.text();
    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (!m?.[1]) return null;
    const player = JSON.parse(m[1]);
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    const track =
      tracks.find((t: any) => t.languageCode?.toLowerCase().startsWith("en")) || tracks[0];
    if (!track?.baseUrl) return null;
    const tr = await fetch(`${track.baseUrl}&fmt=json3`);
    if (!tr.ok) return null;
    const raw = await tr.text();
    let text = "";
    try {
      const json = JSON.parse(raw);
      text = (json.events || [])
        .flatMap((e: any) => e.segs || [])
        .map((s: any) => s.utf8 || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      text = decodeHtml(
        raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      );
    }
    if (!text || text.length < 200) return null;
    return {
      transcriptText: text,
      language: track.languageCode || null,
      source: track.kind === "asr" ? "youtube_auto_captions" : "youtube_captions",
    };
  } catch (e) {
    console.warn("extractYouTubeTranscriptNative failed:", e);
    return null;
  }
};

/** Supadata transcript fetcher — handles sync + async job responses. */
const fetchTranscriptViaSupadata = async (
  url: string,
  platform: Platform,
): Promise<VideoTranscript | null> => {
  const apiKey = Deno.env.get("SUPADATA_API_KEY");
  if (!apiKey) {
    console.warn("SUPADATA_API_KEY not configured — skipping transcript fetch for", platform);
    return null;
  }

  try {
    const endpoint = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&text=true`;
    const res = await fetch(endpoint, { headers: { "x-api-key": apiKey } });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`Supadata request failed (${res.status}): ${body.slice(0, 300)}`);
      return null;
    }

    let payload: any = await res.json();

    // Async job: poll up to ~25s
    if (payload?.jobId && !payload.content && !payload.text) {
      const jobId = payload.jobId;
      const start = Date.now();
      while (Date.now() - start < 25000) {
        await new Promise((r) => setTimeout(r, 2500));
        const jres = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, {
          headers: { "x-api-key": apiKey },
        });
        if (!jres.ok) continue;
        const jdata = await jres.json();
        if (jdata?.status === "completed" || jdata?.content || jdata?.text) {
          payload = jdata;
          break;
        }
        if (jdata?.status === "failed") {
          console.warn("Supadata job failed:", jdata?.error);
          return null;
        }
      }
    }

    const text: string =
      typeof payload?.content === "string"
        ? payload.content
        : typeof payload?.text === "string"
        ? payload.text
        : Array.isArray(payload?.content)
        ? payload.content.map((c: any) => c.text || "").join(" ")
        : "";

    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length < 100) return null;

    return {
      transcriptText: cleaned,
      language: payload?.lang || payload?.language || null,
      source: `supadata_${platform}`,
    };
  } catch (e) {
    console.warn("fetchTranscriptViaSupadata error:", e);
    return null;
  }
};

/** One call that returns everything a downstream prompt needs. */
export const getVideoContext = async (url: string): Promise<VideoContext> => {
  const canonicalUrl = await canonicalizeVideoUrl(url);
  const platform = detectPlatform(canonicalUrl);

  // Run metadata + transcript in parallel for speed.
  // For YouTube, try the free native extractor first; if it returns null, fall through to Supadata.
  const [metadata, nativeTranscript] = await Promise.all([
    fetchOEmbedOrOg(canonicalUrl, platform),
    platform === "youtube" ? extractYouTubeTranscriptNative(canonicalUrl) : Promise.resolve(null),
  ]);

  const transcript = nativeTranscript ?? (await fetchTranscriptViaSupadata(canonicalUrl, platform));

  return { platform, metadata, transcript };
};
