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
  authorUrl: string | null;
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

// ---------------------------------------------------------------------------
// SSRF guard
// ---------------------------------------------------------------------------
// User-supplied URLs reach fetch() in canonicalizeVideoUrl + fetchOEmbedOrOg.
// Without a guard, a caller could point the edge runtime at internal IPs
// (169.254.169.254 metadata, 10/8, 127/8, etc.). assertPublicUrl() rejects
// non-http(s) schemes, literal-IP hostnames, and any hostname whose DNS
// resolution touches a private/reserved range. safeFetch() runs the check on
// the initial URL AND every redirect hop (we replace `redirect: "follow"`
// with a bounded manual follow).

const PRIVATE_V4_CIDRS: Array<[number, number]> = [
  // [network, prefix bits]
  [ipv4ToInt("0.0.0.0"), 8],
  [ipv4ToInt("10.0.0.0"), 8],
  [ipv4ToInt("100.64.0.0"), 10],   // CGNAT
  [ipv4ToInt("127.0.0.0"), 8],
  [ipv4ToInt("169.254.0.0"), 16],  // link-local incl. metadata
  [ipv4ToInt("172.16.0.0"), 12],
  [ipv4ToInt("192.0.0.0"), 24],
  [ipv4ToInt("192.0.2.0"), 24],
  [ipv4ToInt("192.168.0.0"), 16],
  [ipv4ToInt("198.18.0.0"), 15],
  [ipv4ToInt("198.51.100.0"), 24],
  [ipv4ToInt("203.0.113.0"), 24],
  [ipv4ToInt("224.0.0.0"), 4],     // multicast
  [ipv4ToInt("240.0.0.0"), 4],     // reserved
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

function isPrivateV4(ip: string): boolean {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
  const n = ipv4ToInt(ip);
  return PRIVATE_V4_CIDRS.some(([net, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (net & mask);
  });
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::" ) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
  if (lower.startsWith("fe8") || lower.startsWith("fe9") ||
      lower.startsWith("fea") || lower.startsWith("feb")) return true; // fe80::/10
  if (lower.startsWith("ff")) return true; // multicast
  // IPv4-mapped ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped && isPrivateV4(mapped[1])) return true;
  return false;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error(`Invalid URL: ${raw}`); }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Blocked URL scheme: ${u.protocol}`);
  }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  // Literal IP? check directly.
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    if (isPrivateV4(host)) throw new Error(`Blocked private IP: ${host}`);
    return u;
  }
  if (host.includes(":")) {
    if (isPrivateV6(host)) throw new Error(`Blocked private IPv6: ${host}`);
    return u;
  }
  // Hostname: resolve and verify every address.
  try {
    const records = await Promise.allSettled([
      Deno.resolveDns(host, "A"),
      Deno.resolveDns(host, "AAAA"),
    ]);
    const addrs: string[] = [];
    for (const r of records) if (r.status === "fulfilled") addrs.push(...r.value);
    if (addrs.length === 0) {
      // Fail closed: no resolution → refuse rather than let fetch() do it.
      throw new Error(`Could not resolve host: ${host}`);
    }
    for (const a of addrs) {
      if (isPrivateV4(a) || isPrivateV6(a)) {
        throw new Error(`Host ${host} resolves to blocked address ${a}`);
      }
    }
  } catch (e) {
    // Re-throw our own errors; wrap unexpected ones.
    if (e instanceof Error && e.message.startsWith("Blocked ")) throw e;
    if (e instanceof Error && e.message.startsWith("Could not resolve")) throw e;
    throw new Error(`DNS check failed for ${host}: ${e instanceof Error ? e.message : String(e)}`);
  }
  return u;
}

/** fetch() replacement that re-validates every redirect hop. */
async function safeFetch(input: string, init: RequestInit = {}, maxRedirects = 5): Promise<Response> {
  let current = input;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString();
      // Drain body so Deno doesn't leak the connection.
      await res.arrayBuffer().catch(() => {});
      continue;
    }
    return res;
  }
  throw new Error(`Too many redirects: ${input}`);
}

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
  const empty: VideoMetadata = { title: null, author: null, authorUrl: null, thumbnail: null, description: null };
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
          authorUrl: j.author_url || null,
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
      authorUrl: extractMeta(html, ["og:url"]),
      thumbnail: extractMeta(html, ["og:image", "twitter:image"]),
      description: extractMeta(html, ["og:description", "twitter:description", "description"]),
    };
  } catch (e) {
    console.warn("fetchOEmbedOrOg failed:", e);
    return empty;
  }
};

/**
 * Derive a stable @handle from oEmbed author_url or from the canonical URL.
 * Examples:
 *   https://www.youtube.com/@ycombinator           → @ycombinator
 *   https://www.youtube.com/user/ycombinator       → @ycombinator
 *   https://www.tiktok.com/@garyvee/video/123      → @garyvee
 *   https://twitter.com/elonmusk/status/...        → @elonmusk
 */
export const deriveChannelHandle = (
  authorUrl: string | null,
  fallbackVideoUrl: string,
): string | null => {
  const tryUrl = (raw: string | null): string | null => {
    if (!raw) return null;
    try {
      const u = new URL(raw);
      const parts = u.pathname.split("/").filter(Boolean);
      // Direct @handle anywhere in the path
      const at = parts.find((p) => p.startsWith("@"));
      if (at) return at.toLowerCase();
      // youtube /user/<name> or /c/<name>
      if (parts[0] === "user" || parts[0] === "c") return `@${parts[1]?.toLowerCase()}`;
      // twitter/x.com /<handle>/...
      if (/(?:^|\.)x\.com$/.test(u.hostname) || /(?:^|\.)twitter\.com$/.test(u.hostname)) {
        if (parts[0] && !["i", "search", "home"].includes(parts[0])) return `@${parts[0].toLowerCase()}`;
      }
      // instagram /<handle>/...
      if (u.hostname.includes("instagram.com") && parts[0] && parts[0] !== "reel" && parts[0] !== "p") {
        return `@${parts[0].toLowerCase()}`;
      }
      return null;
    } catch {
      return null;
    }
  };
  return tryUrl(authorUrl) ?? tryUrl(fallbackVideoUrl);
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
