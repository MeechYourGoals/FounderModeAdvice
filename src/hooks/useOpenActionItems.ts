import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OpenActionItem {
  id: string;
  text: string;
  episodeId: string;
  episodeTitle: string;
}

type InsightRow = {
  id: string;
  action_items: unknown;
  startup_profile_id: string | null;
  lessons:
    | {
        episode_id: string | null;
        episodes:
          | {
              id: string;
              title: string | null;
              analyzed_profile_id: string | null;
            }
          | null;
      }
    | {
        episode_id: string | null;
        episodes:
          | {
              id: string;
              title: string | null;
              analyzed_profile_id: string | null;
            }
          | null;
      }[]
    | null;
};

function asLesson(lessons: InsightRow["lessons"]) {
  if (!lessons) return null;
  return Array.isArray(lessons) ? lessons[0] ?? null : lessons;
}

function flattenActionItems(rows: InsightRow[], profileId: string | null): OpenActionItem[] {
  const items: OpenActionItem[] = [];
  for (const row of rows) {
    const lesson = asLesson(row.lessons);
    const episode = lesson?.episodes ?? null;
    if (!episode?.id) continue;
    if (
      profileId &&
      row.startup_profile_id !== profileId &&
      episode.analyzed_profile_id !== profileId
    ) {
      continue;
    }
    const texts = Array.isArray(row.action_items)
      ? row.action_items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    for (const [index, text] of texts.entries()) {
      items.push({
        id: `${row.id}:${index}`,
        text,
        episodeId: episode.id,
        episodeTitle: episode.title?.trim() || "Untitled memo",
      });
      if (items.length >= 5) return items;
    }
  }
  return items;
}

/**
 * Recent unfinished action items from personalized memos, filtered to the
 * active business profile when one is selected.
 */
export function useOpenActionItems(profileId: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<OpenActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { data, error } = await supabase
        .from("personalized_insights")
        .select(
          "id, action_items, startup_profile_id, lessons!inner ( episode_id, episodes!inner ( id, title, analyzed_profile_id ) )",
        )
        .not("action_items", "is", null)
        .order("created_at", { ascending: false })
        .limit(40);

      if (cancelled) return;
      if (error) {
        console.error("Failed to load open action items", error);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(flattenActionItems((data ?? []) as unknown as InsightRow[], profileId));
      setLoading(false);
    })();

    const refresh = () => {
      void (async () => {
        const { data } = await supabase
          .from("personalized_insights")
          .select(
            "id, action_items, startup_profile_id, lessons!inner ( episode_id, episodes!inner ( id, title, analyzed_profile_id ) )",
          )
          .not("action_items", "is", null)
          .order("created_at", { ascending: false })
          .limit(40);
        if (cancelled || !data) return;
        setItems(flattenActionItems(data as unknown as InsightRow[], profileId));
      })();
    };

    window.addEventListener("episodeAnalyzed", refresh);
    window.addEventListener("libraryRefresh", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("episodeAnalyzed", refresh);
      window.removeEventListener("libraryRefresh", refresh);
    };
  }, [user, profileId]);

  return { items, loading };
}
