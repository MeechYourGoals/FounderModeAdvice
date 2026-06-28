import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, Trash2, GripVertical, Check, Pencil, X } from "lucide-react";
import { useFavorites, type Favorite, type FavoriteKind } from "@/hooks/useFavorites";

const KIND_LABEL: Record<FavoriteKind, string> = {
  channel: "Channels",
  founder: "Founders",
  topic: "Topics",
};

const KIND_ORDER: FavoriteKind[] = ["channel", "founder", "topic"];

export const FavoritesDrawer = ({ disabled }: { disabled?: boolean }) => {
  const { favorites, rename, remove, reorder } = useFavorites();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const move = (kind: FavoriteKind, fromIdx: number, dir: -1 | 1) => {
    const list = favorites.filter((f) => f.kind === kind);
    const toIdx = fromIdx + dir;
    if (toIdx < 0 || toIdx >= list.length) return;
    const reordered = [...list];
    [reordered[fromIdx], reordered[toIdx]] = [reordered[toIdx], reordered[fromIdx]];
    // Build new global order: keep other kinds where they are, replace this kind's slice.
    const newOrder: string[] = [];
    for (const k of KIND_ORDER) {
      if (k === kind) newOrder.push(...reordered.map((f) => f.id));
      else newOrder.push(...favorites.filter((f) => f.kind === k).map((f) => f.id));
    }
    void reorder(newOrder);
  };

  const startEdit = (f: Favorite) => {
    setEditingId(f.id);
    setDraft(f.display_name);
  };

  const commitEdit = async (f: Favorite) => {
    const name = draft.trim();
    if (name && name !== f.display_name) await rename(f.id, name);
    setEditingId(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Settings2 className="h-4 w-4 mr-1.5" />
          Manage pins
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage favorites</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {favorites.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You haven't pinned anything yet. Star a channel, founder, or topic to pin it here.
            </p>
          )}
          {KIND_ORDER.map((kind) => {
            const list = favorites.filter((f) => f.kind === kind);
            if (list.length === 0) return null;
            return (
              <section key={kind}>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  {KIND_LABEL[kind]}
                </h4>
                <ul className="space-y-1.5">
                  {list.map((f, idx) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                    >
                      <div className="flex flex-col">
                        <button
                          onClick={() => move(kind, idx, -1)}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <GripVertical className="h-3 w-3 rotate-180" />
                        </button>
                        <button
                          onClick={() => move(kind, idx, 1)}
                          disabled={idx === list.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <GripVertical className="h-3 w-3" />
                        </button>
                      </div>
                      {editingId === f.id ? (
                        <>
                          <Input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitEdit(f);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            className="h-8 flex-1"
                          />
                          <Button size="icon" variant="ghost" onClick={() => void commitEdit(f)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 truncate text-sm">{f.display_name}</span>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(f)} aria-label="Rename">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => void remove(f.kind, f.value)}
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
