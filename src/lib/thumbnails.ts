// Client-side artwork derivation for analyzed sources.
//
// Episodes only persist the source `url` — no image column — but YouTube
// thumbnails are fully derivable from the video id, which covers the most
// common source kind. Everything else falls back to a designed tile in
// <SourceThumbnail />. Side-effect free so it can be unit-tested without a DOM.

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/** Thumbnail sizes served by i.ytimg.com. `mq` (320x180) is a true 16:9 crop
 * with no letterbox bars — ideal for card thumbs; `hq` (480x360) suits large
 * banners where object-cover crops the 4:3 bars away. */
export type YouTubeThumbnailQuality = "mq" | "hq";

export function getYouTubeVideoId(url: string): string | null {
  if (!url || !url.startsWith("http")) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (!YOUTUBE_HOSTS.has(host)) return null;

  const fromQuery = parsed.searchParams.get("v");
  if (fromQuery && YOUTUBE_ID_PATTERN.test(fromQuery)) return fromQuery;

  // /shorts/{id}, /embed/{id}, /live/{id}, /v/{id}
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && ["shorts", "embed", "live", "v"].includes(segments[0])) {
    const id = segments[1];
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  return null;
}

/**
 * Derive a displayable thumbnail URL for a source, or null when the source
 * has no derivable artwork (podcasts, articles, uploads).
 */
export function getSourceThumbnailUrl(
  url: string,
  quality: YouTubeThumbnailQuality = "mq",
): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://i.ytimg.com/vi/${videoId}/${quality}default.jpg`;
}
