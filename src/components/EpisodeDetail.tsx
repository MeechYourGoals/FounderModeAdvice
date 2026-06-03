import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, TrendingUp, Target, Lightbulb, RefreshCw, Loader2, Plus, X, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
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
  const { toast } = useToast();
  const { canAnalyzeVideo, refreshSubscription } = useSubscription();

  const fetchEpisodeDetails = async () => {
    try {
      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select(`
          id, title, release_date, url, founder_names,
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

      if (!insightsError && insightsData) {
        setPersonalizedInsights(insightsData.map(insight => ({
          id: insight.id,
          lesson_id: insight.lesson_id,
          personalized_text: insight.personalized_text,
          relevance_score: insight.relevance_score,
          action_items: Array.isArray(insight.action_items) 
            ? (insight.action_items as string[])
            : []
        })));
      }
    } catch (error) {
      console.error('Error fetching episode details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodeDetails();
  }, [episodeId]);

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

      // Delete old personalized insights (linked to old lessons)
      const lessonIds = lessons.map(l => l.id);
      if (lessonIds.length > 0) {
        await supabase.from('personalized_insights').delete().in('lesson_id', lessonIds);
      }

      // Delete old lessons and callouts (tags will cascade delete due to schema setup if properly configured, but safe to leave tags alone as they are M:N)
      // Actually lesson_tags cascades on lesson delete.
      await supabase.from('lessons').delete().eq('episode_id', episodeId);
      await supabase.from('chavel_callouts').delete().eq('episode_id', episodeId);

      // Delete the episode itself so analyze-episode can recreate it
      await supabase.from('episodes').delete().eq('id', episodeId);

      // Re-run analysis
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

      await refreshSubscription();

      toast({
        title: "Re-analysis complete",
        description: "The episode has been re-analyzed with your current profile.",
      });

      if (data?.episodeId) {
        onBack();
      }
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
      <Card className="p-6 sm:p-8">
        <div className="text-center text-muted-foreground">Loading episode details...</div>
      </Card>
    );
  }

  if (!episode) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="text-center text-muted-foreground">Episode not found</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-2 sm:mb-4 min-h-[44px] sm:min-h-0 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to All Episodes
      </Button>

      <Card className="p-4 sm:p-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">{episode.title}</h1>
              {episode.founder_names && (
                <p className="text-base sm:text-lg text-muted-foreground mb-1 sm:mb-2">
                  with {episode.founder_names}
                </p>
              )}
              {episode.release_date && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Released: {new Date(episode.release_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button asChild size="sm" className="sm:size-default flex-1 sm:flex-initial">
                <a href={episode.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {episode.url.includes('youtube.com') || episode.url.includes('youtu.be') 
                    ? 'Watch Episode' 
                    : 'Listen Now'}
                </a>
              </Button>
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
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Company Snapshot</h3>
                  <div className="space-y-2">
                    <InfoRow label="Company" value={episode.companies.name} />
                    <InfoRow label="Founded" value={episode.companies.founding_year?.toString()} />
                    <InfoRow label="Stage" value={episode.companies.current_stage} />
                    <InfoRow label="Industry" value={episode.companies.industry} />
                    <InfoRow label="Status" value={episode.companies.status} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Metrics</h3>
                  <div className="space-y-2">
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

      {lessons.length > 0 && (
        <Card className="p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Top Lessons ({lessons.length})
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="border-l-4 border-primary pl-4 sm:pl-6 py-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    {lesson.category && <Badge variant="outline">{lesson.category}</Badge>}
                  </div>
                  <div className="flex gap-2 text-xs sm:text-sm">
                    <Badge>Impact: {lesson.impact_score}/10</Badge>
                    <Badge>Action: {lesson.actionability_score}/10</Badge>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-foreground leading-relaxed mb-2">{lesson.lesson_text}</p>
                {lesson.founder_attribution && (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">
                    — {lesson.founder_attribution}
                  </p>
                )}
                <LessonTags
                   lessonId={lesson.id}
                   initialTags={lesson.lesson_tags?.map(lt => lt.tags).filter(Boolean) as {id: string, name: string}[] || []}
                   onUpdate={fetchEpisodeDetails}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {personalizedInsights.length > 0 && (
        <Card className="glass p-4 sm:p-8 border-primary/15">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Personalized for Your Startup ({personalizedInsights.length})
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {lessons.map((lesson) => {
              const insight = personalizedInsights.find(i => i.lesson_id === lesson.id);
              if (!insight) return null;
              
              return (
                <div key={lesson.id} className="space-y-3 sm:space-y-4">
                  <div className="p-3 sm:p-5 bg-card rounded-xl border border-primary/15 shadow-sm">
                    <div className="flex-1 mb-3">
                      <h3 className="font-semibold text-sm sm:text-lg mb-2">{lesson.lesson_text}</h3>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        <Badge className="text-xs">Impact: {lesson.impact_score}/10</Badge>
                        <Badge className="text-xs">Action: {lesson.actionability_score}/10</Badge>
                      </div>
                    </div>
                    
                    <div className="bg-primary/8 border border-primary/15 p-3 sm:p-4 rounded-xl">
                      <div className="flex items-start gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-primary mb-1 text-sm">For Your Startup:</p>
                          <p className="text-sm sm:text-base text-foreground leading-relaxed">{insight.personalized_text}</p>
                        </div>
                      </div>
                      
                      {insight.action_items && insight.action_items.length > 0 && (
                        <div className="mt-3 sm:mt-4">
                          <p className="font-medium text-xs sm:text-sm mb-2">✅ Action Items:</p>
                          <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                            {insight.action_items.map((item, idx) => (
                              <li key={idx} className="text-muted-foreground">{item}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      
                      <div className="mt-3">
                        <Badge variant="outline" className="text-xs">Relevance: {insight.relevance_score}/10</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {callouts.length > 0 && (
        <Card className="p-4 sm:p-8 bg-accent/5">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            Relevant for You ({callouts.length})
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {callouts.map((callout) => (
              <div key={callout.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border">
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base text-foreground leading-relaxed">{callout.callout_text}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">Relevance: {callout.relevance_score}/10</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
};
