import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, ExternalLink, Lightbulb, Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ExportModal } from "@/components/ExportModal";
import {
  getSharedFolder,
  type SharedEpisode,
  type SharedFolderDetail,
  type SharedLesson,
} from "@/services/folderSharing";

const SharedFolder = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [detail, setDetail] = useState<SharedFolderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !folderId) return;
    setLoading(true);
    getSharedFolder(folderId)
      .then((d) => {
        if (!d) setNotFound(true);
        else setDetail(d);
      })
      .catch((err) => {
        console.error("Failed to load shared folder", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, folderId]);

  const episodeIds = useMemo(() => (detail?.episodes ?? []).map((e) => e.id), [detail]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div
      className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav"
      style={{ paddingTop: "calc(1.5rem + var(--safe-area-top))" }}
    >
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/shared")} className="mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Shared with you
        </Button>

        {loading || authLoading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading folder…
          </div>
        ) : notFound || !detail ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <LockKeyhole className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
            <p className="font-medium">You don't have access to this folder</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The invitation may have been revoked or expired. Ask the owner to re-share it.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/shared")}>
              Back to shared folders
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
                  Shared insight folder · read-only
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: detail.folder.color ?? "#3b82f6" }}
                  />
                  {detail.folder.name}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {detail.episodes.length} {detail.episodes.length === 1 ? "analysis" : "analyses"} in this folder
                </p>
              </div>
              {detail.episodes.length > 0 && (
                <Button variant="outline" onClick={() => setExportOpen(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>

            {detail.episodes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
                This folder doesn't have any analyses yet.
              </div>
            ) : (
              <div className="space-y-4">
                {detail.episodes.map((ep: SharedEpisode) => (
                  <Card key={ep.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-lg leading-snug">{ep.title}</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {[ep.platform, ep.companies?.name, ep.founder_names]
                            .filter(Boolean)
                            .join(" · ") || "Analyzed video"}
                        </p>
                      </div>
                      {ep.url && (
                        <a
                          href={ep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          aria-label="Open original video"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    {Array.isArray(ep.lessons) && ep.lessons.length > 0 ? (
                      <ul className="mt-4 space-y-3">
                        {ep.lessons.map((lesson: SharedLesson) => {
                          const insight = lesson.personalized_insights?.[0];
                          return (
                            <li
                              key={lesson.id}
                              className="rounded-xl border border-border/60 bg-muted/20 p-3"
                            >
                              <div className="flex items-start gap-2">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <div className="min-w-0">
                                  <p className="text-sm leading-relaxed">{lesson.lesson_text}</p>
                                  {lesson.category && (
                                    <Badge variant="outline" className="mt-2 text-[10px]">
                                      {lesson.category}
                                    </Badge>
                                  )}
                                  {insight?.personalized_text && (
                                    <p className="mt-2 rounded-lg bg-primary/5 p-2 text-xs text-foreground/80">
                                      <span className="font-medium text-primary">For your business: </span>
                                      {insight.personalized_text}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">No insights captured for this analysis.</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ExportModal
        episodeIds={episodeIds}
        scopeLabel={detail?.folder.name}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </div>
  );
};

export default SharedFolder;
