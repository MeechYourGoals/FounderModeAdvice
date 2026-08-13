import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Lightbulb, Loader2 } from "lucide-react";
import { SecondaryPageHeader } from "@/components/SecondaryPageHeader";
import { getAnalysisProfileLabel, getBoardMeetingMemoTitle, getViewerCompanyName } from "@/lib/analysisProfile";
import { toGenericInsightText } from "@/lib/genericLessons";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { InsightComments } from "@/components/InsightComments";
import { useInsightComments } from "@/hooks/useInsightComments";
import { AnalysisDiscussionSheet } from "@/components/AnalysisDiscussionSheet";

const SharedAnalysis = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [loading, setLoading] = useState(true);
  const [episode, setEpisode] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Invited collaborators may read and join insight threads; RLS scopes
  // everything to episodes actually shared with them.
  const commentsApi = useInsightComments(episodeId ?? null);

  useEffect(() => {
    if (!episodeId || authLoading || !user) return;
    setLoading(true);
    setError(null);

    Promise.all([
      supabase
        .from("episodes")
        .select("id, title, url, founder_names, analyzed_profile_id, analyzed_profile_name_snapshot, user_startup_profiles!episodes_analyzed_profile_id_fkey(company_name)")
        .eq("id", episodeId)
        .single(),
      supabase
        .from("lessons")
        .select("id, lesson_text, category, personalized_insights(id, personalized_text)")
        .eq("episode_id", episodeId)
        .order("impact_score", { ascending: false }),
    ])
      .then(([episodeResult, lessonsResult]) => {
        if (episodeResult.error) throw episodeResult.error;
        if (lessonsResult.error) throw lessonsResult.error;
        setEpisode(episodeResult.data);
        setLessons(lessonsResult.data || []);
      })
      .catch((err) => {
        setError(err?.message || "You do not have access to this analysis.");
      })
      .finally(() => setLoading(false));
  }, [episodeId, authLoading, user]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div
      className="app-ambient h-screen overflow-y-auto bg-background pb-nav"
      style={{ paddingTop: isMobile ? undefined : "calc(1.5rem + var(--safe-area-top))" }}
    >
      <SecondaryPageHeader title="Shared analysis" onBack={() => navigate("/shared")} backLabel="Shared" />

      <div className="max-w-4xl mx-auto p-6 md:p-12">
        {!isMobile && (
          <Button variant="ghost" onClick={() => navigate("/shared")} className="mb-6 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Shared with me
          </Button>
        )}

        {loading || authLoading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading invited analysis…
          </div>
        ) : error || !episode ? (
          <Card className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
            {error || "Analysis not found"}
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-6">
              <h1 className="text-2xl font-bold tracking-tight">{episode.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  Analyzed for {getAnalysisProfileLabel(episode)}
                </Badge>
              </div>
              {episode.founder_names && (
                <p className="mt-2 text-muted-foreground">with {episode.founder_names}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild size="sm">
                  <a href={episode.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open source video
                  </a>
                </Button>
                <AnalysisDiscussionSheet
                  episodeId={episode.id}
                  episodeTitle={episode.title}
                  isOwner={false}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Intriguing Insights</h2>
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <div key={lesson.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed">
                          {toGenericInsightText(lesson.lesson_text, getViewerCompanyName(episode))}
                        </p>
                        {lesson.personalized_insights?.[0]?.personalized_text && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium text-primary">
                              {getBoardMeetingMemoTitle(episode)}:{" "}
                            </span>
                            {lesson.personalized_insights[0].personalized_text}
                          </p>
                        )}
                        <InsightComments
                          api={commentsApi}
                          insightType="lesson"
                          insightId={lesson.id}
                          canComment
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedAnalysis;
