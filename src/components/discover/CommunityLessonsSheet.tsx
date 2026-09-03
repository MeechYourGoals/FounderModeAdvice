import { useEffect, useState } from "react";
import { Loader2, Lightbulb } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ShareInsightSheet } from "@/components/ShareInsightSheet";
import { fetchCommunityLessons, type CommunityLesson } from "@/services/community";
import type { CommunityContent } from "@/services/community";
import { captureEvent } from "@/services/analytics";

interface CommunityLessonsSheetProps {
  content: CommunityContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The generic lessons other founders' analyses have already pulled from one
 * piece of content — the crowdsourced payoff of the Community Library. Each
 * lesson can itself be shared onward via the same Share Insight card.
 */
export const CommunityLessonsSheet = ({ content, open, onOpenChange }: CommunityLessonsSheetProps) => {
  const [lessons, setLessons] = useState<CommunityLesson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !content) return;
    let cancelled = false;
    setLoading(true);
    captureEvent("community_lessons_opened", { content_id: content.id });
    fetchCommunityLessons(content.id)
      .then((rows) => {
        if (!cancelled) setLessons(rows);
      })
      .catch((err) => console.error("Failed to load community lessons", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, content]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[80vh] max-w-2xl overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="line-clamp-2">{content?.title ?? "Lessons"}</SheetTitle>
          <SheetDescription>
            General takeaways other founders have already pulled from this source.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No lessons yet — be the first to analyze this source.
            </p>
          ) : (
            lessons.map((lesson) => (
              <div key={lesson.id} className="relative rounded-2xl border border-border/70 bg-background/40 p-4 pl-5">
                <div aria-hidden className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary/60" />
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {lesson.category && <Badge variant="outline">{lesson.category}</Badge>}
                    {lesson.times_seen > 1 && (
                      <span className="inline-flex items-center gap-1 text-caption-1 text-foreground-tertiary">
                        <Lightbulb className="h-3 w-3" />
                        Seen in {lesson.times_seen} analyses
                      </span>
                    )}
                  </div>
                  {content && (
                    <ShareInsightSheet
                      communityLessonId={lesson.id}
                      quoteText={lesson.lesson_text}
                      attribution={lesson.founder_attribution}
                      sourceTitle={content.title}
                      sourceUrl={content.canonical_url}
                    />
                  )}
                </div>
                <p className="text-body-lg leading-relaxed text-foreground">{lesson.lesson_text}</p>
                {lesson.founder_attribution && (
                  <p className="mt-1.5 font-display text-sm italic text-muted-foreground">
                    — {lesson.founder_attribution}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
