import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useFavorites, type FavoriteKind } from "@/hooks/useFavorites";
import { useLibraryFacets, type FacetCount } from "@/hooks/useLibraryFacets";
import { FavoriteStar } from "@/components/library/FavoriteStar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { ChevronLeft, Star, Tv, User as UserIcon, Tag, Sparkles, ExternalLink } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { normalizeTopics } from "@/lib/topics";

interface EpisodeRow {
  id: string;
  title: string;
  url: string;
  founder_names: string | null;
  channel_name: string | null;
  channel_handle: string | null;
  topics: string[] | null;
  release_date: string | null;
  created_at: string | null;
}

type Selection =
  | { kind: FavoriteKind; value: string; display_name: string }
  | null;

const KIND_META: Record<FavoriteKind, { label: string; icon: typeof Tv; empty: string }> = {
  channel: { label: "Channels", icon: Tv, empty: "Analyze a video to see its channel here." },
  founder: { label: "Founders", icon: UserIcon, empty: "Founder names from your analyses appear here." },
  topic: { label: "Topics", icon: Tag, empty: "Topics get tagged automatically as you analyze." },
};

const isPaid = (tier?: string) => tier === "seed" || tier === "series_z";

const FacetRow = ({
  facet,
  kind,
  active,
  onClick,
}: {
  facet: FacetCount;
  kind: FavoriteKind;
  active: boolean;
  onClick: () => void;
}) => (
  <div
    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
    }`}
  >
    <button onClick={onClick} className="flex-1 text-left min-w-0">
      <div className="font-medium truncate">{facet.display_name}</div>
      <div className="text-xs text-muted-foreground">
        {facet.count} {facet.count === 1 ? "video" : "videos"}
      </div>
    </button>
    <FavoriteStar kind={kind} displayName={facet.display_name} />
  </div>
);

const FacetGroup = ({
  kind,
  facets,
  selection,
  onSelect,
}: {
  kind: FavoriteKind;
  facets: FacetCount[];
  selection: Selection;
  onSelect: (s: Selection) => void;
}) => {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">{meta.label}</h3>
        <Badge variant="secondary" className="ml-auto">
          {facets.length}
        </Badge>
      </div>
      {facets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{meta.empty}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {facets.slice(0, 20).map((f) => (
            <FacetRow
              key={f.value}
              facet={f}
              kind={kind}
              active={selection?.kind === kind && selection.value === f.value}
              onClick={() =>
                onSelect(
                  selection?.kind === kind && selection.value === f.value
                    ? null
                    : { kind, value: f.value, display_name: f.display_name },
                )
              }
            />
          ))}
        </div>
      )}
    </Card>
  );
};

const Favorites = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { favorites } = useFavorites();
  const facets = useLibraryFacets();

  const [episodes, setEpisodes] = useState<EpisodeRow[] | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  // Hydrate selection from URL (?kind=channel&value=ycombinator)
  const selection: Selection = useMemo(() => {
    const kind = searchParams.get("kind") as FavoriteKind | null;
    const value = searchParams.get("value");
    if (!kind || !value) return null;
    const display =
      facets[
        kind === "channel" ? "channels" : kind === "founder" ? "founders" : "topics"
      ].find((f) => f.value === value)?.display_name ?? value;
    return { kind, value, display_name: display };
  }, [searchParams, facets]);

  const setSelection = (s: Selection) => {
    if (!s) setSearchParams({}, { replace: true });
    else setSearchParams({ kind: s.kind, value: s.value }, { replace: true });
  };

  // Fetch episodes matching the current selection.
  useEffect(() => {
    if (!user || !selection) {
      setEpisodes(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setEpisodesLoading(true);
      let q = supabase
        .from("episodes")
        .select("id, title, url, founder_names, channel_name, channel_handle, topics, release_date, created_at")
        .eq("analyzed_by", user.id)
        .eq("analysis_status", "completed")
        .order("created_at", { ascending: false })
        .limit(200);

      if (selection.kind === "channel") {
        // Match either handle or name to be forgiving on older rows.
        q = q.or(
          `channel_handle.eq.${selection.value},channel_name.ilike.${selection.display_name}`,
        );
      } else if (selection.kind === "founder") {
        q = q.ilike("founder_names", `%${selection.display_name}%`);
      } else {
        q = q.contains("topics", [selection.display_name]);
      }

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.warn("Favorites episode fetch failed:", error);
        setEpisodes([]);
      } else {
        setEpisodes((data ?? []) as EpisodeRow[]);
      }
      setEpisodesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selection]);

  if (authLoading || subLoading) return <AppLoadingScreen label="Loading favorites..." />;
  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const paid = isPaid(subscription?.tier);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-40 glass-nav border-b border-border" style={{ paddingTop: "var(--safe-area-top)" }}>
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <BrandLogo className="h-7 w-auto" />
          <h1 className="text-lg font-semibold ml-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary fill-primary" /> Favorites
          </h1>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6 pb-24">
        {!paid && (
          <Card className="p-5 border-primary/40 bg-primary/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold">Pin favorites with Pro</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Free accounts can browse facets below. Upgrade to pin Y&nbsp;Combinator, Elon Musk, Marketing — or
                  any founder, channel, or topic — for one-tap filtering.
                </p>
              </div>
              <Button onClick={() => navigate("/account")}>Upgrade</Button>
            </div>
          </Card>
        )}

        {/* Pinned favorites */}
        {favorites.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary fill-primary" /> Your pins
            </h2>
            <div className="flex flex-wrap gap-2">
              {favorites.map((f) => {
                const active = selection?.kind === f.kind && selection.value === f.value;
                return (
                  <button
                    key={f.id}
                    onClick={() =>
                      setSelection(active ? null : { kind: f.kind, value: f.value, display_name: f.display_name })
                    }
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wide opacity-70">{f.kind}</span>
                    <span className="font-medium">{f.display_name}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Selected filter results */}
        {selection && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">
                {selection.display_name}
                <span className="ml-2 text-sm text-muted-foreground font-normal">
                  ({selection.kind})
                </span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelection(null)}>
                Clear
              </Button>
            </div>
            {episodesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : episodes && episodes.length > 0 ? (
              <ul className="divide-y divide-border">
                {episodes.map((ep) => (
                  <li key={ep.id} className="py-3 flex items-start gap-3">
                    <button
                      onClick={() => navigate(`/?episode=${ep.id}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-medium truncate">{ep.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                        {ep.channel_name && <span>{ep.channel_name}</span>}
                        {ep.founder_names && <span>· {ep.founder_names}</span>}
                        {ep.topics && ep.topics.length > 0 && <span>· {ep.topics.slice(0, 3).join(", ")}</span>}
                      </div>
                    </button>
                    <a
                      href={ep.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground p-1"
                      aria-label="Open original video"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No videos match this filter yet. Analyze more videos to fill it in.
              </p>
            )}
          </Card>
        )}

        {/* Facet browser */}
        <div className="grid gap-4">
          <FacetGroup kind="channel" facets={facets.channels} selection={selection} onSelect={setSelection} />
          <FacetGroup kind="founder" facets={facets.founders} selection={selection} onSelect={setSelection} />
          <FacetGroup kind="topic" facets={facets.topics} selection={selection} onSelect={setSelection} />
        </div>
      </main>
    </div>
  );
};

export default Favorites;
