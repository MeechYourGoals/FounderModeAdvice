import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export interface SpeakerStats {
  name: string;
  episodeCount: number;
  companyName: string;
  industry: string | null;
}

/**
 * Directory of speakers (founders, operators, investors, creators — anyone who
 * appears in an analyzed video). Aggregates episode counts from the `episodes`
 * table. Rendered as a full grid on the standalone page and as a compact list
 * inside the Bookmarks panel.
 */
export const SpeakerDirectory = ({
  variant = "grid",
  onNavigate,
}: {
  variant?: "grid" | "list";
  /** Called after a speaker is selected (e.g. to close the surrounding panel). */
  onNavigate?: () => void;
}) => {
  const [speakers, setSpeakers] = useState<SpeakerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        const { data: episodes, error } = await supabase
          .from("episodes")
          .select("founder_names, companies(name, industry)");

        if (error) throw error;

        const statsMap = new Map<string, SpeakerStats>();

        type EpisodeRow = {
          founder_names: string | null;
          companies: { name: string | null; industry: string | null } | null;
        };

        (episodes as EpisodeRow[] | null)?.forEach((ep) => {
          if (!ep.founder_names) return;

          const names = ep.founder_names
            .split(",")
            .map((n: string) => n.trim())
            .filter(Boolean);

          names.forEach((name: string) => {
            if (!statsMap.has(name)) {
              statsMap.set(name, {
                name,
                episodeCount: 0,
                companyName: ep.companies?.name || "Unknown",
                industry: ep.companies?.industry || null,
              });
            }
            const stats = statsMap.get(name)!;
            stats.episodeCount++;
            if (stats.companyName === "Unknown" && ep.companies?.name) {
              stats.companyName = ep.companies.name;
              stats.industry = ep.companies.industry;
            }
          });
        });

        setSpeakers(
          Array.from(statsMap.values())
            .filter((speaker) => !(speaker.companyName === "Unknown" && !speaker.industry))
            .sort((a, b) => b.episodeCount - a.episodeCount)
        );
      } catch (error) {
        console.error("Error fetching speakers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpeakers();
  }, []);

  const selectSpeaker = (name: string) => {
    navigate(`/?founder=${encodeURIComponent(name)}`);
    onNavigate?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (speakers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No speakers yet. Analyze a source to start building your directory.
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-2">
        {speakers.map((speaker) => (
          <button
            key={speaker.name}
            onClick={() => selectSpeaker(speaker.name)}
            className="w-full flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-muted/50"
          >
            <div className="min-w-0">
              <div className="font-medium truncate" title={speaker.name}>
                {speaker.name}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={speaker.companyName}>
                {speaker.companyName}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {speaker.episodeCount} ep{speaker.episodeCount !== 1 ? "s" : ""}
            </Badge>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {speakers.map((speaker) => (
        <Card
          key={speaker.name}
          className="glass elevate-hover rounded-2xl p-4 cursor-pointer border-l-4 border-l-primary"
          onClick={() => selectSpeaker(speaker.name)}
        >
          <h3 className="font-bold text-lg mb-1 truncate" title={speaker.name}>
            {speaker.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-3 truncate" title={speaker.companyName}>
            {speaker.companyName}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {speaker.episodeCount} Episode{speaker.episodeCount !== 1 ? "s" : ""}
            </Badge>
            {speaker.industry && (
              <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                {speaker.industry}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
