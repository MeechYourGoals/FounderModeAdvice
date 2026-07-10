import { useCallback, useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FolderOpen, Users, Lightbulb } from "lucide-react";
import { SecondaryPageHeader } from "@/components/SecondaryPageHeader";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { listSharedFolders, type SharedFolderSummary } from "@/services/folderSharing";
import { listSharedAnalyses, type SharedAnalysisSummary } from "@/services/analysisSharing";
import { getAnalysisProfileLabel } from "@/lib/analysisProfile";

/** Skeleton mirror of the shared-content cards, shown while lists load. */
const SharedSkeleton = () => (
  <div className="space-y-8" role="status" aria-live="polite" aria-label="Loading shared content">
    {[0, 1].map((section) => (
      <div key={section}>
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((card) => (
            <div key={card} className="rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const SharedWithMe = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [folders, setFolders] = useState<SharedFolderSummary[]>([]);
  const [analyses, setAnalyses] = useState<SharedAnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sharedFolders, sharedAnalyses] = await Promise.all([
        listSharedFolders(),
        listSharedAnalyses(),
      ]);
      setFolders(sharedFolders);
      setAnalyses(sharedAnalyses);
    } catch (err) {
      console.error("Failed to load shared content", err);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user, authLoading, load]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div
      className="app-ambient flex h-screen flex-col bg-background"
      style={{ paddingTop: isMobile ? undefined : "calc(1.5rem + var(--safe-area-top))" }}
    >
      <SecondaryPageHeader title="Shared" onBack={() => navigate("/")} />

      <PullToRefresh onRefresh={load}>
        <div className="max-w-3xl mx-auto w-full p-6 md:p-12 pb-nav">
          {!isMobile && (
            <Button variant="ghost" onClick={() => navigate("/")} className="mb-8 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Collaboration</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Shared{" "}
            <span className="font-display font-medium italic text-gradient">with you</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Insight folders other founders have invited you to. You have read-only access to each.
          </p>

          {loading || authLoading ? (
            <SharedSkeleton />
          ) : folders.length === 0 && analyses.length === 0 ? (
            <div className="animate-scale-in rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <Users className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
              <p className="font-medium">Nothing shared with you yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When a teammate or advisor invites you to a folder, it will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {analyses.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                    Invited analysis
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {analyses.map((analysis, i) => (
                      <Card
                        key={analysis.id}
                        role="button"
                        tabIndex={0}
                        style={{ "--stagger-i": i } as React.CSSProperties}
                        onClick={() => navigate(`/shared-analysis/${analysis.id}`)}
                        onKeyDown={(e) => e.key === "Enter" && navigate(`/shared-analysis/${analysis.id}`)}
                        className="stagger-item cursor-pointer p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99] touch-manipulation"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Lightbulb className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{analysis.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {getAnalysisProfileLabel(analysis)}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate">{analysis.founder_names || "Invited insight"}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {folders.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                    Shared folders
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {folders.map((folder, i) => (
                      <Card
                        key={folder.id}
                        role="button"
                        tabIndex={0}
                        style={{ "--stagger-i": analyses.length + i } as React.CSSProperties}
                        onClick={() => navigate(`/shared/${folder.id}`)}
                        onKeyDown={(e) => e.key === "Enter" && navigate(`/shared/${folder.id}`)}
                        className="stagger-item cursor-pointer p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99] touch-manipulation"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${folder.color ?? "#3b82f6"}20`, color: folder.color ?? "#3b82f6" }}
                          >
                            <FolderOpen className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{folder.name}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {folder.episodeCount} {folder.episodeCount === 1 ? "analysis" : "analyses"}
                              </span>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {folder.role}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
};

export default SharedWithMe;
