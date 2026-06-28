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
  created_at: string;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Per-user pinned founders / channels / topics.
 * Insert is RLS-gated to paid plans only (user_has_paid_plan); reads stay open.
 */
export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_favorites" as any)
      .select("id, kind, value, display_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("Failed to load favorites:", error);
      setFavorites([]);
    } else {
      setFavorites((data ?? []) as unknown as Favorite[]);
    }
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

  const add = useCallback(
    async (kind: FavoriteKind, displayName: string) => {
      if (!user) return;
      const value = norm(displayName);
      if (!value) return;
      const { data, error } = await supabase
        .from("user_favorites" as any)
        .insert({ user_id: user.id, kind, value, display_name: displayName })
        .select()
        .single();
      if (error) {
        const paywall = /paid_plan|row-level security|permission/i.test(error.message);
        toast({
          title: paywall ? "Favorites is a Pro feature" : "Could not save favorite",
          description: paywall
            ? "Upgrade to pin founders, channels, and topics for one-tap filtering."
            : error.message,
          variant: "destructive",
        });
        return;
      }
      setFavorites((prev) => [data as unknown as Favorite, ...prev]);
    },
    [user, toast],
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

  return { favorites, loading, isFavorite, add, remove, toggle, reload: load };
};
