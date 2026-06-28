import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type FavoriteKind = "founder" | "channel" | "topic";

export interface Favorite {
  id: string;
  kind: FavoriteKind;
  value: string;        // normalized lowercase, used for matching
  display_name: string; // human-friendly label
  sort_order: number;
  created_at: string;
}

export interface FavoriteCollection {
  id: string;
  name: string;
  pins: Array<{ kind: FavoriteKind; value: string }>;
  sort_order: number;
  created_at: string;
}

const norm = (s: string) => s.trim().toLowerCase();

const sortFav = (a: Favorite, b: Favorite) =>
  a.sort_order - b.sort_order ||
  a.display_name.localeCompare(b.display_name);

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [collections, setCollections] = useState<FavoriteCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setCollections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [favRes, colRes] = await Promise.all([
      supabase
        .from("user_favorites" as any)
        .select("id, kind, value, display_name, sort_order, created_at")
        .eq("user_id", user.id),
      supabase
        .from("favorite_collections" as any)
        .select("id, name, pins, sort_order, created_at")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
    ]);
    if (favRes.error) console.warn("Failed to load favorites:", favRes.error);
    if (colRes.error) console.warn("Failed to load collections:", colRes.error);
    setFavorites(((favRes.data ?? []) as unknown as Favorite[]).slice().sort(sortFav));
    setCollections((colRes.data ?? []) as unknown as FavoriteCollection[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const isFavorite = useCallback(
    (kind: FavoriteKind, value: string) =>
      favorites.some((f) => f.kind === kind && f.value === norm(value)),
    [favorites],
  );

  const handlePaywall = (error: { message: string }, fallbackTitle: string) => {
    const paywall = /paid_plan|row-level security|permission/i.test(error.message);
    toast({
      title: paywall ? "This is a Pro feature" : fallbackTitle,
      description: paywall
        ? "Upgrade to pin, save collections, and organize your library."
        : error.message,
      variant: "destructive",
    });
  };

  const add = useCallback(
    async (kind: FavoriteKind, displayName: string) => {
      if (!user) return;
      const value = norm(displayName);
      if (!value) return;
      const nextOrder = favorites.length
        ? Math.max(...favorites.map((f) => f.sort_order)) + 1
        : 0;
      const { data, error } = await supabase
        .from("user_favorites" as any)
        .insert({
          user_id: user.id,
          kind,
          value,
          display_name: displayName,
          sort_order: nextOrder,
        })
        .select()
        .single();
      if (error) {
        handlePaywall(error, "Could not save favorite");
        return;
      }
      setFavorites((prev) => [...prev, data as unknown as Favorite].sort(sortFav));
    },
    [user, favorites],
  );

  const remove = useCallback(
    async (kind: FavoriteKind, value: string) => {
      if (!user) return;
      const v = norm(value);
      const { error } = await supabase
        .from("user_favorites" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("value", v);
      if (error) {
        toast({ title: "Could not remove favorite", description: error.message, variant: "destructive" });
        return;
      }
      setFavorites((prev) => prev.filter((f) => !(f.kind === kind && f.value === v)));
    },
    [user, toast],
  );

  const toggle = useCallback(
    async (kind: FavoriteKind, displayName: string) => {
      if (isFavorite(kind, displayName)) await remove(kind, displayName);
      else await add(kind, displayName);
    },
    [isFavorite, add, remove],
  );

  const rename = useCallback(
    async (id: string, displayName: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("user_favorites" as any)
        .update({ display_name: displayName })
        .eq("id", id);
      if (error) {
        handlePaywall(error, "Could not rename");
        return;
      }
      setFavorites((prev) =>
        prev.map((f) => (f.id === id ? { ...f, display_name: displayName } : f)),
      );
    },
    [user],
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      if (!user) return;
      // Optimistic local update.
      setFavorites((prev) => {
        const byId = new Map(prev.map((f) => [f.id, f]));
        return orderedIds
          .map((id, i) => {
            const f = byId.get(id);
            return f ? { ...f, sort_order: i } : null;
          })
          .filter(Boolean) as Favorite[];
      });
      // Batched writes.
      await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from("user_favorites" as any).update({ sort_order: i }).eq("id", id),
        ),
      );
    },
    [user],
  );

  // Collections CRUD
  const saveCollection = useCallback(
    async (name: string, pins: Array<{ kind: FavoriteKind; value: string }>) => {
      if (!user) return null;
      const nextOrder = collections.length
        ? Math.max(...collections.map((c) => c.sort_order)) + 1
        : 0;
      const { data, error } = await supabase
        .from("favorite_collections" as any)
        .insert({ user_id: user.id, name, pins, sort_order: nextOrder })
        .select()
        .single();
      if (error) {
        handlePaywall(error, "Could not save collection");
        return null;
      }
      const row = data as unknown as FavoriteCollection;
      setCollections((prev) => [...prev, row]);
      return row;
    },
    [user, collections],
  );

  const renameCollection = useCallback(async (id: string, name: string) => {
    const { error } = await supabase
      .from("favorite_collections" as any)
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      handlePaywall(error, "Could not rename collection");
      return;
    }
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    const { error } = await supabase.from("favorite_collections" as any).delete().eq("id", id);
    if (error) {
      handlePaywall(error, "Could not delete collection");
      return;
    }
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    favorites,
    collections,
    loading,
    isFavorite,
    add,
    remove,
    toggle,
    rename,
    reorder,
    saveCollection,
    renameCollection,
    deleteCollection,
    reload: load,
  };
};
