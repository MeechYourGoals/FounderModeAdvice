import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { captureEvent } from "@/services/analytics";
import { fetchSharedInsight, recordSharedInsightView, type SharedInsight } from "@/services/sharedInsights";

/**
 * The public landing page a share link's rich unfurl points humans to
 * (share-card edge function 302s here). No auth gate — link scrapers never
 * reach this route (they get served the OG HTML directly by the edge
 * function), but a logged-out person clicking the link in Slack does.
 */
const ShareInsight = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [insight, setInsight] = useState<SharedInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchSharedInsight(slug);
        if (cancelled) return;
        if (!result) {
          setNotFound(true);
        } else {
          setInsight(result);
          void recordSharedInsightView(slug);
          captureEvent("share_landing_viewed", { slug });
        }
      } catch (err) {
        console.error("Failed to load shared insight", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageMeta({
    title: insight ? clip(insight.quoteText, 60) : "Shared insight",
    description: insight
      ? [insight.attribution, insight.sourceTitle].filter(Boolean).join(" · ") || undefined
      : "A founder insight shared from Founder Mode Advice.",
    path: `/i/${slug}`,
  });

  const goAnalyze = () => {
    triggerHapticFeedback("medium");
    captureEvent("share_landing_cta_clicked", { cta: "analyze" });
    if (!insight?.sourceUrl) {
      navigate(user ? "/" : "/auth");
      return;
    }
    if (user) {
      navigate("/", { state: { action: "analyzeUrl", url: insight.sourceUrl } });
    } else {
      navigate(`/auth?next=${encodeURIComponent(`/?url=${encodeURIComponent(insight.sourceUrl)}`)}`);
    }
  };

  const goHome = () => {
    triggerHapticFeedback("light");
    captureEvent("share_landing_cta_clicked", { cta: "learn_more" });
    navigate("/");
  };

  return (
    <div
      className="grain relative min-h-dvh flex flex-col items-center justify-center gap-6 p-4"
      style={{
        background: "var(--gradient-hero)",
        paddingTop: "calc(1.5rem + var(--safe-area-top))",
        paddingBottom: "calc(1.5rem + var(--safe-area-bottom))",
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
      <button type="button" onClick={goHome} className="relative">
        <BrandLogo className="h-10 w-auto" />
      </button>

      <Card className="glass-strong relative w-full max-w-lg rounded-3xl p-6 shadow-glass sm:p-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notFound || !insight ? (
          <div className="space-y-4 py-6 text-center">
            <p className="text-title-3">This link isn't available anymore.</p>
            <p className="text-sm text-muted-foreground">
              It may have been removed, or the link is incomplete.
            </p>
            <Button className="rounded-full" onClick={goHome}>
              Go to Founder Mode Advice
            </Button>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div aria-hidden className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="font-display text-2xl italic leading-snug text-foreground sm:text-3xl">
              “{insight.quoteText}”
            </p>
            {(insight.attribution || insight.sourceTitle) && (
              <p className="text-sm text-muted-foreground">
                {insight.attribution && <span className="font-medium text-foreground">— {insight.attribution}</span>}
                {insight.attribution && insight.sourceTitle && " · "}
                {insight.sourceTitle}
              </p>
            )}

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button className="min-h-[44px] w-full max-w-xs rounded-full" onClick={goAnalyze}>
                Analyze this source for your company
              </Button>
              {insight.sourceUrl && (
                <a
                  href={insight.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open the original source
                </a>
              )}
            </div>
          </div>
        )}
      </Card>

      <p className="relative text-center text-xs text-muted-foreground">
        Turn any link into an operating memo, tailored to your company.{" "}
        <button type="button" onClick={goHome} className="underline underline-offset-2 hover:text-foreground">
          See how it works
        </button>
      </p>
    </div>
  );
};

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export default ShareInsight;
