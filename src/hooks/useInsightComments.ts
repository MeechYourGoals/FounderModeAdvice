import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  createInsightComment,
  deleteInsightComment,
  listEpisodeCollaborators,
  listInsightComments,
  updateInsightComment,
  type CommentVisibility,
  type EpisodeCollaborator,
  type InsightComment,
  type InsightType,
} from "@/services/insightComments";

export interface InsightCommentsApi {
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  collaborators: EpisodeCollaborator[];
  /** Display label for a user id: their email, "You" for the current user. */
  labelFor: (userId: string) => string;
  commentsFor: (insightType: InsightType, insightId: string) => InsightComment[];
  addComment: (params: {
    insightType: InsightType;
    insightId: string;
    body: string;
    visibility: CommentVisibility;
    mentionedUserIds: string[];
  }) => Promise<void>;
  editComment: (commentId: string, body: string) => Promise<void>;
  removeComment: (commentId: string) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Loads every comment + the collaborator directory for an episode once, and
 * hands per-insight slices to each InsightComments block. Follows the app's
 * plain-hook pattern (local state + direct Supabase calls + manual reload).
 */
export function useInsightComments(episodeId: string | null): InsightCommentsApi {
  const { user } = useAuth();
  const [comments, setComments] = useState<InsightComment[]>([]);
  const [collaborators, setCollaborators] = useState<EpisodeCollaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!episodeId || !user) {
      setComments([]);
      setCollaborators([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [commentRows, collaboratorRows] = await Promise.all([
        listInsightComments(episodeId),
        listEpisodeCollaborators(episodeId).catch(() => [] as EpisodeCollaborator[]),
      ]);
      setComments(commentRows);
      setCollaborators(collaboratorRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [episodeId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const emailById = useMemo(() => {
    const map = new Map<string, string>();
    collaborators.forEach((c) => map.set(c.user_id, c.email));
    return map;
  }, [collaborators]);

  const labelFor = useCallback(
    (userId: string) => {
      if (user && userId === user.id) return "You";
      return emailById.get(userId) ?? "Teammate";
    },
    [emailById, user],
  );

  const commentsFor = useCallback(
    (insightType: InsightType, insightId: string) =>
      comments.filter((c) => c.insight_type === insightType && c.insight_id === insightId),
    [comments],
  );

  const addComment = useCallback(
    async (params: {
      insightType: InsightType;
      insightId: string;
      body: string;
      visibility: CommentVisibility;
      mentionedUserIds: string[];
    }) => {
      if (!episodeId) throw new Error("Missing analysis id.");
      const created = await createInsightComment({
        episodeId,
        insightType: params.insightType,
        insightId: params.insightId,
        body: params.body,
        visibility: params.visibility,
        mentionedUserIds: params.mentionedUserIds,
      });
      setComments((prev) => [...prev, created]);
    },
    [episodeId],
  );

  const editComment = useCallback(async (commentId: string, body: string) => {
    const updated = await updateInsightComment(commentId, body);
    setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
  }, []);

  const removeComment = useCallback(async (commentId: string) => {
    await deleteInsightComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return {
    loading,
    error,
    currentUserId: user?.id ?? null,
    collaborators,
    labelFor,
    commentsFor,
    addComment,
    editComment,
    removeComment,
    reload: load,
  };
}
