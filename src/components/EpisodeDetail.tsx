import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheLastAnalysis, getCachedAnalysis } from "@/lib/offlineCache";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, TrendingUp, Target, Lightbulb, RefreshCw, Loader2, Plus, X, Download, Share2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { VideoChatSheet } from "@/components/VideoChatSheet";
import { ExportModal } from "@/components/ExportModal";
import { AnalysisShareDialog } from "@/components/AnalysisShareDialog";
import { InsightComments } from "@/components/InsightComments";
import { useInsightComments } from "@/hooks/useInsightComments";
import { hasSharing } from "@/types/subscription";
import { getAnalysisProfileLabel, isUniversalAnalysis } from "@/lib/analysisProfile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Lesson {
  id: string;
  lesson_text: string;
  impact_score: number;
  actionability_score: number;
  category: string | null;
  founder_attribution: string | null;
  lesson_tags?: {
    tags: {
      id: string;
      name: string;
    } | null;
  }[];
}

interface Callout {
  id: string;
  callout_text: string;
  relevance_score: number;
}

interface PersonalizedInsight {
  id: string;
  lesson_id: string;
  personalized_text: string;
  relevance_score: number;
  action_items: string[];
}

interface Episode {
  id: string;
  title: string;
  release_date: string | null;
  url: string;
  founder_names: string | null;
  analyzed_by: string | null;
  analyzed_profile_id?: string | null;
  analyzed_profile_name_snapshot?: string | null;
  user_startup_profiles?: {
    company_name: string | null;
  } | null;
  companies?: {
    name: string;
    founding_year: number | null;
    current_stage: string | null;
    funding_raised: string | null;
    valuation: string | null;
    employee_count: number | null;
    industry: string | null;
    status: string | null;
  } | null;
}

interface EpisodeDetailProps {
  episodeId: string;
  onBack: () => void;
}

const LessonTags = ({ lessonId, initialTags, onUpdate }: { lessonId: string, initialTags: { id: string, name: string }[], onUpdate: () => void }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [availableTags, setAvailableTags] = useState<{ id: string, name: string }[]>([]);

  // Fetch available tags when opening popover
  useEffect(() => {
    if (open) {
      const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('id, name').order('name');
        if (data) setAvailableTags(data);
      };
      fetchTags();
    }
  }, [open]);

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim()) return;

     // Check if tag exists
     let tagId;
     const existingTag = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase().trim());
     if (existingTag) {
       tagId = existingTag.id;
     } else {
       // Create new tag
       const { data } = await supabase.from('tags').insert({ name: tagName.toLowerCase().trim() }).select().single();
       if (data) tagId = data.id;
     }

     if (tagId) {
       await supabase.from('lesson_tags').insert({ lesson_id: lessonId, tag_id: tagId });
       onUpdate();
       setOpen(false);
       setSearchValue("");
     }
  };

  const handleRemoveTag = async (tagId: string) => {
    await supabase.from('lesson_tags').delete().match({ lesson_id: lessonId, tag_id: tagId });
    onUpdate();
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3 items-center">
      {initialTags.map(tag => (
        <Badge key={tag.id} variant="outline" className="pl-2 pr-1 gap-1 text-[10px] sm:text-xs hover:bg-muted">
           #{tag.name}
           <button
             onClick={() => handleRemoveTag(tag.id)}
             className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
           >
             <X className="w-3 h-3" />
           </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/20">
            <Plus className="w-3 h-3 mr-1" /> Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-52" align="start">
          <Command>
            <CommandInput placeholder="Search or create tag..." value={searchValue} onValueChange={setSearchValue} />
            <CommandList>
              <CommandEmpty className="py-2 px-2">
                 <button
                   className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-sm flex items-center"
                   onClick={() => handleAddTag(searchValue)}
                 >
                   <Plus className="w-3 h-3 mr-2" />
                   Create "#{searchValue}"
                 </button>
              </CommandEmpty>
              <CommandGroup heading="Available Tags" className="max-h-64 overflow-auto">
                {availableTags
                  .filter(t => !initialTags.some(existing => existing.id === t.id))
                  .map((tag) => (
                  <CommandItem key={tag.id} onSelect={() => handleAddTag(tag.name)}>
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const EpisodeDetail = ({ episodeId, onBack }: EpisodeDetailProps) => {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [personalizedInsights, setPersonalizedInsights] = useState<PersonalizedInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileInsightTab, setMobileInsightTab] = useState<"lessons" | "personalized">("lessons");
  const [shareOpen, setShareOpen] = useState(false);
  const { toast } = useToast();
  const { canAnalyzeVideo, refreshSubscription, subscription } = useSubscription();
  const commentsApi = useInsightComments(episodeId);

  const fetchEpisodeDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    // Offline path — serve last cached payload if the device has no network.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = await getCachedAnalysis(episodeId);
      if (cached?.payload) {
        const p = cached.payload as {
          episode?: unknown;
          lessons?: unknown[];
          callouts?: unknown[];
          insights?: unknown[];
        };
        if (p.episode) setEpisode(p.episode as never);
        if (p.lessons) setLessons(p.lessons as never);
        if (p.callouts) setCallouts(p.callouts as never);
        if (p.insights) setPersonalizedInsights(p.insights as never);
        setLoading(false);
        return;
      }
    }

    try {
      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select(`
          id, title, release_date, url, founder_names, analyzed_by, 
          companies (name, founding_year, current_stage, funding_raised, valuation, employee_count, industry, status)
        `)
        .eq('id', episodeId)
        .single();

      if (episodeError) throw episodeError;
      setEpisode(episodeData);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          lesson_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq('episode_id', episodeId)
        .order('impact_score', { ascending: false });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      const { data: calloutsData, error: calloutsError } = await supabase
        .from('chavel_callouts')
        .select('*')
        .eq('episode_id', episodeId)
        .order('relevance_score', { ascending: false });

      if (calloutsError) throw calloutsError;
      setCallouts(calloutsData || []);

      const { data: insightsData, error: insightsError } = await supabase
        .from('personalized_insights')
        .select('*')
        .in('lesson_id', (lessonsData || []).map(l => l.id));

      const insights = !insightsError && insightsData
        ? insightsData.map(insight => ({
            id: insight.id,
            lesson_id: insight.lesson_id,
            personalized_text: insight.personalized_text,
            relevance_score: insight.relevance_score,
            action_items: Array.isArray(insight.action_items)
              ? (insight.action_items as string[])
              : [],
          }))
        : [];
      setPersonalizedInsights(insights);

      // Write-through to offline cache so this analysis stays viewable offline.
      if (user) {
        await cacheLastAnalysis(user.id, episodeId, {
          episode: episodeData,
          lessons: lessonsData || [],
          callouts: calloutsData || [],
          insights,
        });
      }
    } catch (error) {
      console.error('Error fetching episode details, trying cache:', error);
      const cached = await getCachedAnalysis(episodeId);
      if (cached?.payload) {
        const p = cached.payload as {
          episode?: unknown;
          lessons?: unknown[];
          callouts?: unknown[];
          insights?: unknown[];
        };
        if (p.episode) setEpisode(p.episode as never);
        if (p.lessons) setLessons(p.lessons as never);
        if (p.callouts) setCallouts(p.callouts as never);
        if (p.insights) setPersonalizedInsights(p.insights as never);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodeDetails();
  }, [episodeId]);

  useEffect(() => {
    if (personalizedInsights.length === 0 && mobileInsightTab === "personalized") {
      setMobileInsightTab("lessons");
    }
  }, [mobileInsightTab, personalizedInsights.length]);

  const handleReanalyze = async () => {
    if (!episode) return;

    const analysisCheck = canAnalyzeVideo();
    if (!analysisCheck.allowed) {
      toast({
        title: "Analysis Limit Reached",
        description: analysisCheck.message || "Upgrade to analyze more videos.",
        variant: "destructive",
      });
      return;
    }

    setReanalyzing(true);

    try {
      // Get current user and their startup profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profiles } = await supabase
        .from('user_startup_profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      const profile = profiles?.[0];

      // Run the new analysis FIRST. The old memo is only deleted after the
      // replacement exists, so a failed/timed-out analysis can't destroy the
      // user's existing analysis (episodes.url has no unique constraint, so
      // both rows can briefly coexist).
      const startupProfile = profile ? {
        company_name: profile.company_name,
        company_website: profile.company_website,
        stage: profile.stage,
        funding_raised: profile.funding_raised,
        employee_count: profile.employee_count,
        industry: profile.industry,
        description: profile.description,
        deck_summary: (profile as any).deck_summary || null,
      } : undefined;

      const { data, error } = await supabase.functions.invoke('analyze-episode', {
        body: {
          episodeUrl: episode.url,
          startupProfile,
          userId: user.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // New analysis exists — retire the old one. Lessons, callouts, and
      // (via lessons) personalized_insights all cascade on episode delete,
      // so one verified delete covers everything.
      const { error: deleteError } = await supabase
        .from('episodes')
        .delete()
        .eq('id', episodeId);

      await refreshSubscription();

      if (deleteError) {
        console.error('Failed to remove previous analysis after re-analyze:', deleteError);
        toast({
          title: "Re-analysis complete",
          description: "The new analysis is saved, but the previous copy couldn't be removed. You can delete it from your library.",
        });
      } else {
        toast({
          title: "Re-analysis complete",
          description: "The episode has been re-analyzed with your current profile.",
        });
      }

      // The replacement analysis exists — leave this screen either way.
      onBack();
    } catch (error: any) {
      console.error('Re-analysis error:', error);
      toast({
        title: "Re-analysis failed",
        description: error.message || "Could not re-analyze. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-live="polite" aria-label="Loading episode details">
        <Card className="p-4 sm:p-8 space-y-4">
          <Skeleton className="h-7 w-4/5" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-2/5" />
        </Card>
        <Card className="p-4 sm:p-8 space-y-5">
          <Skeleton className="h-6 w-48" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (!episode) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="text-center text-muted-foreground py-10">Episode not found</div>
      </Card>
    );
  }

  // Insight collaboration: owners need the Boardroom plan to start a thread;
  // collaborators viewing shared content may always participate. RLS enforces
  // the same rules server-side.
  const isEpisodeOwner = episode.analyzed_by === currentUserId;
  // `subscription` is null while SubscriptionProvider is still resolving —
  // treat that as "needs upgrade" (comment box hidden) rather than crashing;
  // it flips to the real value as soon as the tier loads.
  const ownerNeedsUpgrade = isEpisodeOwner && !(subscription && hasSharing(subscription.tier));
  const canComment = !ownerNeedsUpgrade;

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <Button variant="ghost" onClick={onBack} className="mb-2 sm:mb-4 min-h-[44px] sm:min-h-0 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to All Episodes
      </Button>

      <Card className="relative overflow-hidden p-4 sm:p-8">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'var(--gradient-primary)' }} />
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-title-2 sm:text-title-1 mb-2 sm:mb-3">{episode.title}</h1>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={isUniversalAnalysis(episode) ? "outline" : "secondary"} className="text-[11px]">
                  Analyzed for {getAnalysisProfileLabel(episode)}
                </Badge>
              </div>
              {episode.founder_names && (
                <p className="text-base sm:text-lg text-muted-foreground mb-1 sm:mb-2">
                  with <span className="font-display font-medium italic text-foreground/90">{episode.founder_names}</span>
                </p>
              )}
              {episode.release_date && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Released: {new Date(episode.release_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex gap-2 w-full sm:w-auto">
                {episode.analyzed_by === currentUserId && (
                  <VideoChatSheet videoId={episode.id} videoTitle={episode.title} />
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="sm:size-default flex-1 sm:flex-initial"
                  onClick={() => setExportOpen(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button asChild size="sm" className="sm:size-default flex-1 sm:flex-initial">
                <a href={episode.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {episode.url.includes('youtube.com') || episode.url.includes('youtu.be') 
                    ? 'Watch Episode' 
                    : 'Listen Now'}
                </a>
                </Button>
                {episode.analyzed_by === currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:size-default flex-1 sm:flex-initial"
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="sm:size-default" disabled={reanalyzing}>
                    {reanalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Re-Analyze
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Re-analyze this episode?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace the existing analysis with a fresh one based on your current startup profile. This counts as a new analysis toward your monthly limit.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReanalyze}>
                      Re-Analyze
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {episode.companies && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-3 sm:mb-4">Company Snapshot</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Company" value={episode.companies.name} />
                    <InfoRow label="Founded" value={episode.companies.founding_year?.toString()} />
                    <InfoRow label="Stage" value={episode.companies.current_stage} />
                    <InfoRow label="Industry" value={episode.companies.industry} />
                    <InfoRow label="Status" value={episode.companies.status} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-3 sm:mb-4">Metrics</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Funding Raised" value={episode.companies.funding_raised} />
                    <InfoRow label="Valuation" value={episode.companies.valuation} />
                    <InfoRow label="Employees" value={episode.companies.employee_count?.toString()} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {reanalyzing && (
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Re-analyzing episode with your current profile...</span>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2 xl:items-start">
        {lessons.length > 0 && (
          <Card className="min-w-0 p-4 sm:p-8">
            <h2 className="text-title-3 sm:text-title-2 mb-4 sm:mb-6 flex items-center gap-2.5">
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              Top Lessons <span className="text-muted-foreground font-normal">({lessons.length})</span>
            </h2>
            <div className="space-y-4 sm:space-y-5">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="group relative rounded-2xl border border-border/70 bg-background/40 p-4 sm:p-5 pl-5 sm:pl-6 transition-colors hover:border-primary/30"
                >
                  <div aria-hidden className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary/60 transition-colors group-hover:bg-primary" />
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2.5 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden className="font-display text-2xl sm:text-3xl font-medium italic leading-none text-primary/30">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {lesson.category && <Badge variant="outline">{lesson.category}</Badge>}
                    </div>
                    <div className="flex gap-2 text-xs sm:text-sm">
                      <ScorePill label="Impact" score={lesson.impact_score} />
                      <ScorePill label="Action" score={lesson.actionability_score} />
                    </div>
                  </div>
                  <p className="text-body-lg text-foreground leading-relaxed max-w-[65ch] mb-2">{lesson.lesson_text}</p>
                  {lesson.founder_attribution && (
                    <p className="font-display text-sm sm:text-base text-muted-foreground italic">
                      — {lesson.founder_attribution}
                    </p>
                  )}
                  <LessonTags
                     lessonId={lesson.id}
                     initialTags={lesson.lesson_tags?.map(lt => lt.tags).filter(Boolean) as {id: string, name: string}[] || []}
                     onUpdate={fetchEpisodeDetails}
                  />
                  <InsightComments
                    api={commentsApi}
                    insightType="lesson"
                    insightId={lesson.id}
                    canComment={canComment}
                    ownerNeedsUpgrade={ownerNeedsUpgrade}
                    isOwner={isEpisodeOwner}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {personalizedInsights.length > 0 && (
          <Card className="glass relative min-w-0 overflow-hidden p-4 sm:p-8 border-primary/15">
            <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'var(--gradient-primary)' }} />
            <h2 className="text-title-3 sm:text-title-2 mb-4 sm:mb-6 flex items-center gap-2.5">
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              {isUniversalAnalysis(episode)
                ? "Universal insights"
                : `Personalized for ${getAnalysisProfileLabel(episode)}`} <span className="text-muted-foreground font-normal">({personalizedInsights.length})</span>
            </h2>
            <div className="space-y-4 sm:space-y-6">
              {lessons.map((lesson) => {
                const insight = personalizedInsights.find(i => i.lesson_id === lesson.id);
                if (!insight) return null;

                return (
                  <div key={lesson.id} className="space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-5 bg-card rounded-2xl border border-primary/15 shadow-sm">
                      <div className="flex-1 mb-3">
                        <h3 className="text-headline sm:text-title-3 mb-2 leading-snug max-w-[65ch]">{lesson.lesson_text}</h3>
                        <div className="flex gap-2 mb-3 flex-wrap">
                          <ScorePill label="Impact" score={lesson.impact_score} />
                          <ScorePill label="Action" score={lesson.actionability_score} />
                        </div>
                      </div>

                      <div className="bg-primary/8 border border-primary/15 p-3 sm:p-4 rounded-xl">
                        <div className="flex items-start gap-2.5 mb-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
                              {isUniversalAnalysis(episode)
                                ? "Universal analysis"
                                : `For ${getAnalysisProfileLabel(episode)}`}
                            </p>
                            <p className="text-body-lg text-foreground leading-relaxed max-w-[65ch]">{insight.personalized_text}</p>
                          </div>
                        </div>

                        {insight.action_items && insight.action_items.length > 0 && (
                          <div className="mt-3 sm:mt-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80 mb-2">Action Items</p>
                            <ol className="space-y-1.5 text-xs sm:text-sm">
                              {insight.action_items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                                  <span className="mt-px flex h-[1.125rem] w-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                    {idx + 1}
                                  </span>
                                  <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        <div className="mt-3">
                          <ScorePill label="Relevance" score={insight.relevance_score} />
                        </div>
                        <InsightComments
                          api={commentsApi}
                          insightType="personalized_insight"
                          insightId={insight.id}
                          canComment={canComment}
                          ownerNeedsUpgrade={ownerNeedsUpgrade}
                          isOwner={isEpisodeOwner}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {callouts.length > 0 && (
        <Card className="p-4 sm:p-8 bg-accent/5">
          <h2 className="text-title-3 sm:text-title-2 mb-4 sm:mb-6 flex items-center gap-2.5">
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Target className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            Relevant for You <span className="text-muted-foreground font-normal">({callouts.length})</span>
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {callouts.map((callout) => (
              <div key={callout.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-2xl border border-border/70 transition-colors hover:border-accent/30">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-lg text-foreground leading-relaxed max-w-[65ch]">{callout.callout_text}</p>
                  <div className="mt-2">
                    <ScorePill label="Relevance" score={callout.relevance_score} />
                  </div>
                  <InsightComments
                    api={commentsApi}
                    insightType="callout"
                    insightId={callout.id}
                    canComment={canComment}
                    ownerNeedsUpgrade={ownerNeedsUpgrade}
                    isOwner={isEpisodeOwner}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ExportModal episodeId={episode.id} open={exportOpen} onOpenChange={setExportOpen} />
      <AnalysisShareDialog
        episodeId={episode.analyzed_by === currentUserId ? episode.id : null}
        episodeTitle={episode.title}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
};

/* Soft metric chip — replaces solid badges so scores read as data, not buttons */
const ScorePill = ({ label, score }: { label: string; score: number }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
    {label}
    <span className="font-semibold">{score}/10</span>
  </span>
);

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
};
