import { useEffect, useRef, useState } from "react";
import { Share2, Loader2, Copy, Check, Download } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { saveOrShareBlob } from "@/lib/downloadFile";
import { isDespia } from "@/services/despiaService";
import { shareNative } from "@/services/nativeShare";
import { captureEvent } from "@/services/analytics";
import { createSharedInsight, buildShareLink, type CreateSharedInsightInput } from "@/services/sharedInsights";
import { renderShareCardCanvas, canvasToBlob, type ShareCardTheme } from "@/lib/shareCardCanvas";
import type { ShareCardVariant } from "@/lib/shareCard";
import { cn } from "@/lib/utils";

interface ShareInsightSheetProps extends CreateSharedInsightInput {
  /** Custom trigger; defaults to a small icon button. */
  trigger?: React.ReactNode;
}

const VARIANTS: { value: ShareCardVariant; label: string }[] = [
  { value: "link", label: "Card" },
  { value: "story", label: "Story" },
];
const THEMES: { value: ShareCardTheme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/**
 * "Share an insight" — creates a public share link for a lesson (never a
 * personalized/tailored insight, and never from an uploaded document — the
 * server RLS enforces both), renders a branded quote card client-side, and
 * hands it to the platform share sheet. The link itself unfurls as a rich
 * card in Slack/iMessage/WhatsApp/X via the share-card edge function.
 */
export const ShareInsightSheet = (props: ShareInsightSheetProps) => {
  const { trigger, ...input } = props;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [variant, setVariant] = useState<ShareCardVariant>("link");
  const [theme, setTheme] = useState<ShareCardTheme>("dark");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || slug) return;
    let cancelled = false;
    setCreating(true);
    createSharedInsight(input)
      .then((insight) => {
        if (!cancelled) setSlug(insight.slug);
      })
      .catch((err) => {
        console.error("Failed to create share link", err);
        if (!cancelled) {
          toast({ title: "Couldn't prepare the share link", description: "Please try again.", variant: "destructive" });
        }
      })
      .finally(() => {
        if (!cancelled) setCreating(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    void renderShareCardCanvas(canvasRef.current, variant, theme, {
      quoteText: input.quoteText,
      attribution: input.attribution,
      sourceTitle: input.sourceTitle,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant, theme]);

  const shareLink = slug ? buildShareLink(slug) : null;

  const handleShare = async () => {
    if (!canvasRef.current || !shareLink) return;
    triggerHapticFeedback("medium");
    setSharing(true);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const file = blob ? new File([blob], "founder-mode-insight.png", { type: "image/png" }) : undefined;
      const result = await shareNative({
        title: "Founder Mode Advice",
        text: input.attribution ? `"${clip(input.quoteText)}" — ${input.attribution}` : clip(input.quoteText),
        url: shareLink,
        file,
      });
      if (result.ok === true) {
        captureEvent("insight_share_completed", { transport: result.transport, format: variant, theme });
      } else if (result.ok === false && result.reason !== "cancelled") {
        toast({ title: "Couldn't share", description: "Try copying the link instead.", variant: "destructive" });
      }
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    triggerHapticFeedback("light");
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      captureEvent("insight_share_link_copied", { format: variant });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  const handleSaveImage = async () => {
    if (!canvasRef.current) return;
    triggerHapticFeedback("light");
    try {
      const blob = await canvasToBlob(canvasRef.current);
      if (!blob) throw new Error("No image data");
      await saveOrShareBlob(blob, "founder-mode-insight.png", "image/png", isDespia());
    } catch {
      toast({ title: "Couldn't save the image", variant: "destructive" });
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) captureEvent("insight_share_opened", { source: input.lessonId ? "lesson" : "community" });
      }}
    >
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 gap-1.5 rounded-full text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
            aria-label="Share this insight"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl p-0">
        <SheetHeader className="px-5 pb-2 pt-5 text-left">
          <SheetTitle>Share this insight</SheetTitle>
          <SheetDescription>A branded quote card, ready for Slack, iMessage, or your feed.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-5 pb-6">
          <div className="flex items-center justify-center gap-2">
            <Segmented options={VARIANTS} value={variant} onChange={(v) => setVariant(v)} />
            <Segmented options={THEMES} value={theme} onChange={(v) => setTheme(v)} />
          </div>

          <div className="flex justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
            <canvas
              ref={canvasRef}
              className={cn("h-auto w-full", variant === "story" ? "max-h-[46vh]" : "max-h-[34vh]")}
              style={{ aspectRatio: variant === "story" ? "1080 / 1350" : "1200 / 630" }}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              className="min-h-[44px] rounded-full sm:col-span-1"
              onClick={handleShare}
              disabled={creating || sharing || !shareLink}
            >
              {sharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Share
            </Button>
            <Button
              variant="secondary"
              className="min-h-[44px] rounded-full"
              onClick={handleCopyLink}
              disabled={creating || !shareLink}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="outline" className="min-h-[44px] rounded-full" onClick={handleSaveImage} disabled={creating}>
              <Download className="mr-2 h-4 w-4" />
              Save image
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            triggerHapticFeedback("light");
            onChange(opt.value);
          }}
          className={cn(
            "rounded-full px-3 py-1.5 text-caption-1 font-medium transition-colors min-h-[36px]",
            value === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function clip(text: string, max = 220): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
