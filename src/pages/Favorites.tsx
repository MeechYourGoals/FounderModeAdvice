import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useFavorites, type FavoriteKind, type FavoriteCollection } from "@/hooks/useFavorites";
import {
  useLibraryFacets,
  filterEpisodesByPins,
  rowFounders,
  type FacetCount,
  type EpisodeRow,
} from "@/hooks/useLibraryFacets";
import { FavoriteStar } from "@/components/library/FavoriteStar";
import { PinChips, type Pin } from "@/components/favorites/PinChips";
import { FavoritesDrawer } from "@/components/favorites/FavoritesDrawer";
import { CollectionsSidebar } from "@/components/favorites/CollectionsSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { Star, Tv, User as UserIcon, Tag, Sparkles, ExternalLink } from "lucide-react";
import { SecondaryPageHeader } from "@/components/SecondaryPageHeader";
import { SHORTCUT_TOPICS, normalizeTopics } from "@/lib/topics";
import { useToast } from "@/hooks/use-toast";

const KIND_META: Record<FavoriteKind, { label: string; icon: typeof Tv; empty: string }> = {
  channel: { label: "Channels", icon: Tv, empty: "Analyze a video to see its channel here." },
  founder: { label: "Founders", icon: UserIcon, empty: "Founder names from your analyses appear here." },
  topic: { label: "Topics", icon: Tag, empty: "Topics get tagged automatically as you analyze." },
};

const isPaid = (tier?: string) => tier === "seed" || tier === "series_z";

const encodePins = (pins: Pin[]) =>
  pins.map((p) => `${p.kind}:${p.value}`).join("|");

const decodePins = (raw: string | null, lookup: (kind: FavoriteKind, value: string) => string): Pin[] => {
  if (!raw) return [];
  return raw
    .split("|")
    .map((s) => s.split(":"))
    .filter((parts) => parts.length === 2)
    .map(([kind, value]) => ({
      kind: kind as FavoriteKind,
      value,
      display_name: lookup(kind as FavoriteKind, value),
    }));
};

const FacetRow = ({
  facet,
  kind,
  selected,
  onTogglePin,
}: {
  facet: FacetCount;
  kind: FavoriteKind;
  selected: boolean;
  onTogglePin: () => void;
}) => (
  <div
    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
      selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
    }`}
  >
    <button onClick={onTogglePin} className="flex-1 text-left min-w-0">
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
  selectedKey,
  onTogglePin,
}: {
  kind: FavoriteKind;
  facets: FacetCount[];
  selectedKey: Set<string>;
  onTogglePin: (kind: FavoriteKind, f: FacetCount) => void;
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
          {facets.slice(0, 30).map((f) => (
            <FacetRow
              key={f.value}
              facet={f}
              kind={kind}
              selected={selectedKey.has(`${kind}:${f.value}`)}
              onTogglePin={() => onTogglePin(kind, f)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

const Favorites = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { favorites, saveCollection } = useFavorites();
  const facets = useLibraryFacets();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  // Resolve a stored kind+value to its best display name from current facets/favorites.
  const lookupDisplay = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of facets.channels) map.set(`channel:${f.value}`, f.display_name);
    for (const f of facets.founders) map.set(`founder:${f.value}`, f.display_name);
    for (const f of facets.topics) map.set(`topic:${f.value}`, f.display_name);
    for (const f of favorites) map.set(`${f.kind}:${f.value}`, f.display_name);
    return (kind: FavoriteKind, value: string) => map.get(`${kind}:${value}`) ?? value;
  }, [facets.channels, facets.founders, facets.topics, favorites]);

  const pins: Pin[] = useMemo(
    () => decodePins(searchParams.get("pins"), lookupDisplay),
    [searchParams, lookupDisplay],
  );

  const setPins = (next: Pin[]) => {
    const params = new URLSearchParams(searchParams);
    if (next.length === 0) params.delete("pins");
    else params.set("pins", encodePins(next));
    setSearchParams(params, { replace: true });
    setActiveCollectionId(null);
  };

  const togglePin = (kind: FavoriteKind, f: { value: string; display_name: string }) => {
    const key = `${kind}:${f.value}`;
    const exists = pins.some((p) => `${p.kind}:${p.value}` === key);
    if (exists) setPins(pins.filter((p) => `${p.kind}:${p.value}` !== key));
    else setPins([...pins, { kind, value: f.value, display_name: f.display_name }]);
  };

  const selectedKey = useMemo(
    () => new Set(pins.map((p) => `${p.kind}:${p.value}`)),
    [pins],
  );

  const filteredEpisodes: EpisodeRow[] = useMemo(
    () => filterEpisodesByPins(facets.index, pins),
    [facets.index, pins],
  );

  const loadCollection = (c: FavoriteCollection) => {
    const nextPins: Pin[] = c.pins.map((p) => ({
      kind: p.kind,
      value: p.value,
      display_name: lookupDisplay(p.kind, p.value),
    }));
    const params = new URLSearchParams(searchParams);
    if (nextPins.length === 0) params.delete("pins");
    else params.set("pins", encodePins(nextPins));
    params.set("collection", c.id);
    setSearchParams(params, { replace: true });
    setActiveCollectionId(c.id);
  };

  const handleSaveCollection = async () => {
    const name = window.prompt("Name this collection", "Untitled collection");
    if (!name?.trim()) return;
    const created = await saveCollection(
      name.trim(),
      pins.map((p) => ({ kind: p.kind, value: p.value })),
    );
    if (created) {
      setActiveCollectionId(created.id);
      toast({ title: "Collection saved", description: `Loaded "${name.trim()}" from sidebar anytime.` });
    }
  };

  const copyShareLink = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    if (pins.length > 0) url.searchParams.set("pins", encodePins(pins));
    if (activeCollectionId) url.searchParams.set("collection", activeCollectionId);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast({ title: "Link copied", description: "Paste it anywhere to reopen this exact view." });
    } catch {
      window.prompt("Copy this link", url.toString());
    }
  };

  const copyCollectionLink = async (c: FavoriteCollection) => {
    const url = new URL(window.location.href);
    url.search = "";
    const collectionPins = c.pins.map((p) => ({
      kind: p.kind,
      value: p.value,
      display_name: lookupDisplay(p.kind, p.value),
    }));
    if (collectionPins.length > 0) url.searchParams.set("pins", encodePins(collectionPins));
    url.searchParams.set("collection", c.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast({ title: "Collection link copied", description: `Share "${c.name}" with one click.` });
    } catch {
      window.prompt("Copy this link", url.toString());
    }
  };

  // Topic shortcut tab handler — sets a single topic pin.
  const onShortcutClick = (topic: string) => {
    const key = `topic:${topic.toLowerCase()}`;
    const isActive = pins.length === 1 && `${pins[0].kind}:${pins[0].value}` === key;
    if (isActive) setPins([]);
    else setPins([{ kind: "topic", value: topic.toLowerCase(), display_name: topic }]);
  };

  // Hydrate active collection highlight from the URL on first load / reload.
  useEffect(() => {
    const cid = searchParams.get("collection");
    if (cid && cid !== activeCollectionId) setActiveCollectionId(cid);
  }, [searchParams, activeCollectionId]);

  if (authLoading || subLoading) return <AppLoadingScreen label="Loading favorites..." />;
  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const paid = isPaid(subscription?.tier);

  return (
    <div className="app-ambient min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SecondaryPageHeader
        title="Favorites"
        onBack={() => navigate("/")}
        trailing={<FavoritesDrawer disabled={!paid} />}
      />

      <main className="container mx-auto max-w-7xl px-4 py-6 pb-24 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:flex lg:col-span-2 items-center justify-between gap-4 -mt-2 mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-brand-red fill-brand-red" /> Favorites
          </h1>
          <FavoritesDrawer disabled={!paid} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <CollectionsSidebar
            activeId={activeCollectionId}
            onLoad={loadCollection}
            onCopyLink={copyCollectionLink}
            disabled={!paid}
          />
        </aside>

        <div className="space-y-6">
          {!paid && (
            <Card className="p-5 border-primary/40 bg-primary/5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-semibold">Pin favorites with Pro</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Free accounts can browse facets below. Upgrade to pin Y&nbsp;Combinator + Elon Musk together, save
                    reusable collections, and rename / reorder pins.
                  </p>
                </div>
                <Button onClick={() => navigate("/account")}>Upgrade</Button>
              </div>
            </Card>
          )}

          {/* Topic shortcut tabs */}
          <div className="flex flex-wrap gap-2">
            {SHORTCUT_TOPICS.map((topic) => {
              const key = `topic:${topic.toLowerCase()}`;
              const active = selectedKey.has(key);
              const count = facets.topics.find((t) => t.value === topic.toLowerCase())?.count ?? 0;
              return (
                <button
                  key={topic}
                  onClick={() => onShortcutClick(topic)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {topic}
                  <span
                    className={`text-xs ${
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Saved pins as toggleable chips */}
          {favorites.length > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-brand-red fill-brand-red" /> Your pins
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  Click to combine — results show the intersection.
                </span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {favorites.map((f) => {
                  const active = selectedKey.has(`${f.kind}:${f.value}`);
                  return (
                    <button
                      key={f.id}
                      onClick={() => togglePin(f.kind, { value: f.value, display_name: f.display_name })}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wide opacity-70">{f.kind}</span>
                      <span className="font-medium">{f.display_name}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Active pin chips + results */}
          {pins.length > 0 && (
            <Card className="p-4 space-y-4">
              <PinChips
                pins={pins}
                onRemove={(p) => setPins(pins.filter((x) => !(x.kind === p.kind && x.value === p.value)))}
                onClear={() => setPins([])}
                onSaveCollection={handleSaveCollection}
                onShare={copyShareLink}
                canSave={paid}
              />
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                  {filteredEpisodes.length}{" "}
                  {filteredEpisodes.length === 1 ? "video" : "videos"} match
                </h3>
                {filteredEpisodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
                    No videos match the intersection of these pins yet.
                    {pins.length > 1 && " Try removing one to widen the search."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredEpisodes.slice(0, 100).map((ep) => (
                      <li key={ep.id} className="py-3 flex items-start gap-3">
                        <button
                          onClick={() => navigate(`/?episode=${ep.id}`)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="font-medium truncate">{ep.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                            {ep.channel_name && <span>{ep.channel_name}</span>}
                            {rowFounders(ep).length > 0 && (
                              <span>· {rowFounders(ep).join(", ")}</span>
                            )}
                            {normalizeTopics(ep.topics).length > 0 && (
                              <span>· {normalizeTopics(ep.topics).slice(0, 3).join(", ")}</span>
                            )}
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
                )}
              </div>
            </Card>
          )}

          {/* Facet browser */}
          <div className="grid gap-4">
            <FacetGroup
              kind="channel"
              facets={facets.channels}
              selectedKey={selectedKey}
              onTogglePin={togglePin}
            />
            <FacetGroup
              kind="founder"
              facets={facets.founders}
              selectedKey={selectedKey}
              onTogglePin={togglePin}
            />
            <FacetGroup
              kind="topic"
              facets={facets.topics}
              selectedKey={selectedKey}
              onTogglePin={togglePin}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Favorites;
