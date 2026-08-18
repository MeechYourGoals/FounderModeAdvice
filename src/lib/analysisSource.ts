// Infer a display source kind from an episode URL.
//
// Analyses only persist a coarse source_type (`url` | `document`). Uploads use
// a synthetic `document://filename` URL; public links keep the original http(s)
// URL. This helper is side-effect free so it can be unit-tested without a DOM.

export type AnalysisSourceKind =
  | "video"
  | "article"
  | "podcast"
  | "pdf"
  | "screenshot"
  | "document";

const DOCUMENT_PREFIX = "document://";

const SOURCE_LABELS: Record<AnalysisSourceKind, string> = {
  video: "Video",
  article: "Article",
  podcast: "Podcast",
  pdf: "PDF",
  screenshot: "Screenshot",
  document: "Document",
};

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp"]);

const VIDEO_HOSTS = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "instagram.com",
  "instagr.am",
  "vimeo.com",
  "twitch.tv",
];

const PODCAST_HOSTS = [
  "podcasts.apple.com",
  "open.spotify.com",
  "spotify.com",
  "overcast.fm",
  "pocketcasts.com",
  "pca.st",
  "anchor.fm",
  "podcasts.google.com",
  "castbox.fm",
];

function hostMatches(hostname: string, hosts: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return hosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

function documentFilename(url: string): string {
  const raw = url.slice(DOCUMENT_PREFIX.length);
  try {
    return decodeURIComponent(raw).split(/[/?#]/)[0] ?? "";
  } catch {
    return raw.split(/[/?#]/)[0] ?? "";
  }
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : "";
}

export function isUploadedDocumentUrl(url: string): boolean {
  return url.startsWith(DOCUMENT_PREFIX);
}

export function getAnalysisSourceKind(url: string): AnalysisSourceKind {
  if (!url) return "article";

  if (isUploadedDocumentUrl(url)) {
    const ext = extensionOf(documentFilename(url));
    if (ext === "pdf") return "pdf";
    if (IMAGE_EXTS.has(ext)) return "screenshot";
    return "document";
  }

  try {
    const parsed = new URL(url);
    if (hostMatches(parsed.hostname, VIDEO_HOSTS)) return "video";
    if (hostMatches(parsed.hostname, PODCAST_HOSTS)) return "podcast";
    if (/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(parsed.pathname)) return "podcast";
  } catch {
    // Fall through to the article default for unparseable public links.
  }

  return "article";
}

export function getAnalysisSourceLabel(kind: AnalysisSourceKind): string {
  return SOURCE_LABELS[kind];
}

export function getAnalysisSourceActionLabel(kind: AnalysisSourceKind): string {
  switch (kind) {
    case "video":
      return "Watch Now";
    case "podcast":
      return "Listen Now";
    case "article":
      return "Read Now";
    default:
      return "View Details";
  }
}
