import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Pencil, Trash2, Check, X, Link2 } from "lucide-react";
import { useFavorites, type FavoriteCollection } from "@/hooks/useFavorites";

interface Props {
  activeId: string | null;
  onLoad: (c: FavoriteCollection) => void;
  onCopyLink: (c: FavoriteCollection) => void;
  disabled?: boolean;
}

export const CollectionsSidebar = ({ activeId, onLoad, onCopyLink, disabled }: Props) => {
  const { collections, renameCollection, deleteCollection } = useFavorites();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Collections</h3>
      </div>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pin two or more facets, then save them as a reusable collection.
        </p>
      ) : (
        <ul className="space-y-1">
          {collections.map((c) => {
            const active = c.id === activeId;
            const editing = c.id === editingId;
            return (
              <li
                key={c.id}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 ${
                  active ? "bg-primary/10 border border-primary/40" : "hover:bg-muted/50"
                }`}
              >
                {editing ? (
                  <>
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && draft.trim()) {
                          void renameCollection(c.id, draft.trim());
                          setEditingId(null);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="h-7 flex-1 text-sm"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        if (draft.trim()) void renameCollection(c.id, draft.trim());
                        setEditingId(null);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onLoad(c)}
                      className="flex-1 text-left min-w-0"
                      disabled={disabled}
                    >
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.pins.length} {c.pins.length === 1 ? "pin" : "pins"}
                      </div>
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setDraft(c.name);
                        setEditingId(c.id);
                      }}
                      aria-label="Rename collection"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => void deleteCollection(c.id)}
                      aria-label="Delete collection"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
