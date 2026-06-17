import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderOpen, Loader2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listSharedFolders, type SharedFolderSummary } from "@/services/folderSharing";

const SharedWithMe = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [folders, setFolders] = useState<SharedFolderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    listSharedFolders()
      .then(setFolders)
      .catch((err) => console.error("Failed to load shared folders", err))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div
      className="h-screen overflow-y-auto bg-background p-6 md:p-12 pb-nav"
      style={{ paddingTop: "calc(1.5rem + var(--safe-area-top))" }}
    >
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-8 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Collaboration</p>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Shared{" "}
          <span className="font-display font-medium italic text-gradient">with you</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Insight folders other founders have invited you to. You have read-only access to each.
        </p>

        {loading || authLoading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading shared folders…
          </div>
        ) : folders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <Users className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
            <p className="font-medium">Nothing shared with you yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When a teammate or advisor invites you to a folder, it will show up here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/shared/${folder.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/shared/${folder.id}`)}
                className="cursor-pointer p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
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
        )}
      </div>
    </div>
  );
};

export default SharedWithMe;
