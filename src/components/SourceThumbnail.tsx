import { useState } from "react";
import { File, FileText, Headphones, Image, Newspaper, Play, Video, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAnalysisSourceKind, type AnalysisSourceKind } from "@/lib/analysisSource";
import { getSourceThumbnailUrl, type YouTubeThumbnailQuality } from "@/lib/thumbnails";

const KIND_ICONS: Record<AnalysisSourceKind, LucideIcon> = {
  video: Video,
  article: Newspaper,
  podcast: Headphones,
  pdf: FileText,
  screenshot: Image,
  document: File,
};

/* Per-kind tinted tiles so even artwork-less sources get a visual anchor.
   Alpha-tinted gradients keep both themes happy without extra tokens. */
const KIND_TILES: Record<AnalysisSourceKind, string> = {
  video: "bg-gradient-to-br from-sky-500/25 via-blue-500/15 to-blue-600/10 text-sky-600 dark:text-sky-400",
  podcast: "bg-gradient-to-br from-violet-500/25 via-purple-500/15 to-fuchsia-500/10 text-violet-600 dark:text-violet-400",
  article: "bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-yellow-500/10 text-amber-600 dark:text-amber-400",
  pdf: "bg-gradient-to-br from-rose-500/25 via-red-500/15 to-pink-500/10 text-rose-600 dark:text-rose-400",
  screenshot: "bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-green-500/10 text-emerald-600 dark:text-emerald-400",
  document: "bg-gradient-to-br from-slate-500/25 via-slate-400/15 to-slate-500/10 text-slate-600 dark:text-slate-400",
};

interface SourceThumbnailProps {
  /** The episode/source URL — YouTube links resolve to real video artwork. */
  url: string;
  /** Size + radius come from the caller, e.g. "h-12 w-20 rounded-lg". */
  className?: string;
  iconClassName?: string;
  /** Thumbnail resolution — "mq" for card thumbs, "hq" for banners. */
  quality?: YouTubeThumbnailQuality;
  /** Show a small play glyph over video artwork. */
  showPlayBadge?: boolean;
}

/**
 * Visual anchor for any analyzed source: real YouTube artwork when the URL is
 * a YouTube video, otherwise a per-kind tinted tile with the source icon.
 * Never renders a broken image — a failed load falls back to the tile.
 */
export const SourceThumbnail = ({
  url,
  className,
  iconClassName,
  quality = "mq",
  showPlayBadge = false,
}: SourceThumbnailProps) => {
  const [failed, setFailed] = useState(false);
  const kind = getAnalysisSourceKind(url);
  const thumbnailUrl = getSourceThumbnailUrl(url, quality);
  const Icon = KIND_ICONS[kind];

  if (thumbnailUrl && !failed) {
    return (
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden border border-border/60 bg-muted",
          className,
        )}
        aria-hidden
      >
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
        {showPlayBadge && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm">
              <Play className="ml-px h-3 w-3" />
            </span>
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border border-border/60",
        KIND_TILES[kind],
        className,
      )}
      aria-hidden
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
    </span>
  );
};
