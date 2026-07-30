import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listEpisodeCollaborators, type EpisodeCollaborator } from "@/services/insightComments";
import {
  createDiscussionMessage,
  deleteDiscussionMessage,
  getDiscussionLastReadAt,
  listDiscussionMessages,
  markDiscussionRead,
  updateDiscussionMessage,
  type DiscussionMessage,
} from "@/services/analysisDiscussion";

export interface AnalysisDiscussionApi {
  /** Initial load only — silent reloads (polls) never toggle this. */
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  collaborators: EpisodeCollaborator[];
  /** Display label for a user id: their email, "You" for the current user. */
  labelFor: (userId: string) => string;
  messages: DiscussionMessage[];
  /** Messages from others newer than the user's read cursor. */
  unreadCount: number;
  send: (body: string) => Promise<void>;
  edit: (messageId: string, body: string) => Promise<void>;
  remove: (messageId: string) => Promise<void>;
  markRead: () => Promise<void>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
}

/**
 * Episode-level discussion thread state. Follows the app's plain-hook pattern
 * (local state + direct Supabase calls + manual reload), like useInsightComments.
 */
export function useAnalysisDiscussion(episodeId: string | null): AnalysisDiscussionApi {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [collaborators, setCollaborators] = useState<EpisodeCollaborator[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!episodeId || !user) {
        setMessages([]);
        setCollaborators([]);
        setLastReadAt(null);
        return;
      }
      if (!options?.silent) setLoading(true);
      setError(null);
      try {
        const [messageRows, collaboratorRows, readCursor] = await Promise.all([
          listDiscussionMessages(episodeId),
          // The RPC raises 42501 until the caller has access; treat as "nobody yet".
          listEpisodeCollaborators(episodeId).catch(() => [] as EpisodeCollaborator[]),
          getDiscussionLastReadAt(episodeId).catch(() => null),
        ]);
        setMessages(messageRows);
        setCollaborators(collaboratorRows);
        setLastReadAt((prev) => {
          // Keep the freshest cursor: an optimistic markRead() may have already
          // advanced past what the server returned.
          if (!readCursor) return prev;
          if (!prev) return readCursor;
          return new Date(readCursor).getTime() > new Date(prev).getTime() ? readCursor : prev;
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load the discussion.");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [episodeId, user],
  );

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

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    const cutoff = lastReadAt ? new Date(lastReadAt).getTime() : 0;
    return messages.filter(
      (m) => m.author_user_id !== user.id && new Date(m.created_at).getTime() > cutoff,
    ).length;
  }, [messages, lastReadAt, user]);

  const send = useCallback(
    async (body: string) => {
      if (!episodeId) throw new Error("Missing analysis id.");
      const created = await createDiscussionMessage(episodeId, body);
      setMessages((prev) => [...prev, created]);
    },
    [episodeId],
  );

  const edit = useCallback(async (messageId: string, body: string) => {
    const updated = await updateDiscussionMessage(messageId, body);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
  }, []);

  const remove = useCallback(async (messageId: string) => {
    await deleteDiscussionMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const markRead = useCallback(async () => {
    if (!episodeId || !user) return;
    setLastReadAt(new Date().toISOString());
    // Read cursors are best-effort — never surface a failure for one.
    await markDiscussionRead(episodeId).catch(() => undefined);
  }, [episodeId, user]);

  return {
    loading,
    error,
    currentUserId: user?.id ?? null,
    collaborators,
    labelFor,
    messages,
    unreadCount,
    send,
    edit,
    remove,
    markRead,
    reload: load,
  };
}
