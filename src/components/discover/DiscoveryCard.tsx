import { useEffect, useRef } from "react";
import { Bookmark, BookmarkCheck, Check, ExternalLink, Play, Sparkles, X } from "lucide-react";
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

export type DiscoveryCardVariant = "library" | "featured" | "compact";

interface DiscoveryCardProps {
  content: DiscoveryContent;
  /** Personalized "why this matters to you" — omitted for library items. */
  reason?: string | null;
  state?: RecommendationState;
  /** library = thumbnail grid; featured/compact = briefing letter. */
  variant?: DiscoveryCardVariant;
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
 * One editorial card, shared by the For You feed, the Inspiration Library,
 * Saved, and the Home desk. Personalization (reason, save/dismiss) and
 * layout (library vs briefing) vary; the analyze pipeline does not.
 */
export const DiscoveryCard = ({
  content,
  reason,
  state = "unseen",
  variant = "library",
  onImpression,
  onAnalyze,
  onOpenSource,
  onToggleSave,
  onDismiss,
  analyzeDisabled = false,
  analyzeLabel = "Prepare memo",
}: DiscoveryCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionSent = useRef(false);

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
  const compact = variant === "compact";
  const featured = variant === "featured";
  const showThumbnail = Boolean(content.image_url) && variant !== "compact";

  const withHaptics = (handler?: () => void) => () => {
    if (!handler) return;
    triggerHapticFeedback("light");
    handler();
  };

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption-1 text-foreground-tertiary">
      <Badge variant="secondary" className="rounded-full px-2 py-0 text-caption-2 font-medium">
        {contentTypeLabel(content.content_type)}
      </Badge>
      {content.publisher && <span className="truncate max-w-[45%]">{content.publisher}</span>}
      {duration && <span aria-label={`Duration ${duration}`}>· {duration}</span>}
      {published && <span>· {published}</span>}
    </div>
  );

  const reasonBlock = reason ? (
    <div className={cn("rounded-xl border border-primary/20 bg-primary/5", featured ? "p-4" : "p-3")}>
      <p className="mb-1 flex items-center gap-1.5 text-caption-2 font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="h-3 w-3" />
        Why this matters to you
      </p>
      <p
        className={cn(
          "leading-relaxed text-foreground/90",
          featured ? "text-subhead" : "text-footnote",
          compact && "line-clamp-3",
        )}
      >
        {reason}
      </p>
    </div>
  ) : null;

  const actions = (
    <div className={cn("flex items-center gap-2", !compact && "mt-auto pt-1")}>
      <Button
        size="sm"
        variant={analyzed ? "outline" : "default"}
        className={cn("min-h-[40px] rounded-full", compact ? "shrink-0" : "flex-1")}
        onClick={withHaptics(onAnalyze)}
        disabled={analyzeDisabled}
      >
        {analyzed ? <Check className="mr-1.5 h-4 w-4" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
        {analyzed ? "Open memo" : analyzeLabel}
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
  );

  if (compact) {
    return (
      <Card ref={cardRef} className="overflow-hidden p-4 transition-shadow duration-300 hover:shadow-elegant">
        <div className="flex flex-col gap-3">
          {meta}
          <button type="button" onClick={withHaptics(onOpenSource)} className="text-left">
            <h3 className="text-headline line-clamp-2 transition-colors hover:text-primary">{content.title}</h3>
          </button>
          {reasonBlock}
          {actions}
        </div>
      </Card>
    );
  }

  return (
    <Card
      ref={cardRef}
      className={cn(
        "group flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-elegant",
        featured && "sm:flex-row",
      )}
    >
      {showThumbnail && (
        <button
          type="button"
          onClick={withHaptics(onOpenSource)}
          className={cn(
            "relative block overflow-hidden bg-muted",
            featured ? "aspect-[16/9] w-full sm:aspect-auto sm:w-[42%] sm:min-h-[220px]" : "aspect-[16/9] w-full",
          )}
          aria-label={`Open ${content.title}`}
        >
          <img
            src={content.image_url ?? undefined}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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

      <div className={cn("flex flex-1 flex-col gap-3 p-4", featured && "sm:p-6")}>
        {meta}

        <button type="button" onClick={withHaptics(onOpenSource)} className="text-left">
          <h3
            className={cn(
              "transition-colors group-hover:text-primary",
              featured ? "text-title-3 line-clamp-3" : "text-headline line-clamp-3",
            )}
          >
            {content.title}
          </h3>
        </button>

        {content.description && variant === "library" && (
          <p className="text-footnote text-muted-foreground line-clamp-2">{content.description}</p>
        )}

        {reasonBlock}

        {content.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {content.topics.slice(0, 3).map((topic) => (
              <Badge key={topic} variant="outline" className="rounded-full text-caption-2 font-normal">
                {topic}
              </Badge>
            ))}
          </div>
        )}

        {actions}
      </div>
    </Card>
  );
};
