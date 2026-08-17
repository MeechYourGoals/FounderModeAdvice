import { useEffect, useRef } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Play, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/capacitor";
import {
  contentTypeLabel,
  formatDuration,
  formatPublishedAt,
  type RecommendationState,
} from "@/lib/discovery";
import type { DiscoveryContent } from "@/services/discovery";

interface DiscoveryCardProps {
  content: DiscoveryContent;
  /** Personalized "why this matters to you" — omitted for library items. */
  reason?: string | null;
  state?: RecommendationState;
  /** Fires once when the card first enters the viewport (impression signal). */
  onImpression?: () => void;
  onAnalyze: () => void;
  onOpenSource: () => void;
  onToggleSave?: () => void;
  onDismiss?: () => void;
  analyzeDisabled?: boolean;
  analyzeLabel?: string;
}

/**
 * One editorial card, shared by the For You feed, the Inspiration Library, and
 * Saved. Only the personalization (reason, save/dismiss) differs between them,
 * so the surfaces stay visually identical and there is one card to maintain.
 */
export const DiscoveryCard = ({
  content,
  reason,
  state = "unseen",
  onImpression,
  onAnalyze,
  onOpenSource,
  onToggleSave,
  onDismiss,
  analyzeDisabled = false,
  analyzeLabel = "Analyze",
}: DiscoveryCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionSent = useRef(false);

  // Impressions power the CTR metric, so they must mean "actually seen" —
  // hence IntersectionObserver rather than firing on mount.
  useEffect(() => {
    if (!onImpression || impressionSent.current) return;
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !impressionSent.current) {
            impressionSent.current = true;
            onImpression();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onImpression]);

  const duration = formatDuration(content.duration_seconds);
  const published = formatPublishedAt(content.published_at);
  const saved = state === "saved";
  const analyzed = state === "analyzed";

  const withHaptics = (handler?: () => void) => () => {
    if (!handler) return;
    triggerHapticFeedback("light");
    handler();
  };

  return (
    <Card
      ref={cardRef}
      className="group flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-elegant"
    >
      {content.image_url && (
        <button
          type="button"
          onClick={withHaptics(onOpenSource)}
          className="relative block aspect-[16/9] w-full overflow-hidden bg-muted"
          aria-label={`Open ${content.title}`}
        >
          <img
            src={content.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            // A dead thumbnail must not leave a broken-image box in the grid.
            onError={(event) => {
              event.currentTarget.parentElement?.classList.add("hidden");
            }}
          />
          {content.content_type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur">
                <Play className="ml-0.5 h-5 w-5" />
              </span>
            </span>
          )}
        </button>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption-1 text-foreground-tertiary">
          <Badge variant="secondary" className="rounded-full px-2 py-0 text-caption-2 font-medium">
            {contentTypeLabel(content.content_type)}
          </Badge>
          {content.publisher && <span className="truncate max-w-[45%]">{content.publisher}</span>}
          {duration && <span aria-label={`Duration ${duration}`}>· {duration}</span>}
          {published && <span>· {published}</span>}
        </div>

        <button
          type="button"
          onClick={withHaptics(onOpenSource)}
          className="text-left"
        >
          <h3 className="text-headline line-clamp-3 transition-colors group-hover:text-primary">
            {content.title}
          </h3>
        </button>

        {content.description && (
          <p className="text-footnote text-muted-foreground line-clamp-2">{content.description}</p>
        )}

        {reason && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-caption-2 font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3" />
              Why this matters to you
            </p>
            <p className="text-footnote leading-relaxed text-foreground/90">{reason}</p>
          </div>
        )}

        {content.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {content.topics.slice(0, 3).map((topic) => (
              <Badge key={topic} variant="outline" className="rounded-full text-caption-2 font-normal">
                {topic}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="min-h-[40px] flex-1 rounded-full"
            onClick={withHaptics(onAnalyze)}
            disabled={analyzeDisabled}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {analyzed ? "Analyzed" : analyzeLabel}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0"
            onClick={withHaptics(onOpenSource)}
            aria-label="Open source in a new tab"
            title="Open source"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>

          {onToggleSave && (
            <Button
              size="icon"
              variant="ghost"
              className={cn("h-10 w-10 shrink-0", saved && "text-primary")}
              onClick={withHaptics(onToggleSave)}
              aria-label={saved ? "Remove from saved" : "Save for later"}
              aria-pressed={saved}
              title={saved ? "Saved" : "Save"}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          )}

          {onDismiss && (
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={withHaptics(onDismiss)}
              aria-label="Not interested"
              title="Not interested"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
