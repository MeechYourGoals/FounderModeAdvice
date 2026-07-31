import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** A discussion message plus client-only optimistic-send state. */
export interface LocalDiscussionMessage extends DiscussionMessage {
  localStatus?: "sending" | "failed";
}

export interface AnalysisDiscussionApi {
  /** Initial load only — silent reloads (polls) never toggle this. */
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  collaborators: EpisodeCollaborator[];
  /** Display label for a user id: their email, "You" for the current user. */
  labelFor: (userId: string) => string;
  messages: LocalDiscussionMessage[];
  /** Messages from others newer than the user's read cursor. */
  unreadCount: number;
  /** Optimistic: the message appears immediately; failures stay in the thread for retry. */
  send: (body: string) => Promise<void>;
  retrySend: (messageId: string) => Promise<void>;
  discardFailed: (messageId: string) => void;
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
  const [messages, setMessages] = useState<LocalDiscussionMessage[]>([]);
  const [collaborators, setCollaborators] = useState<EpisodeCollaborator[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tempIdRef = useRef(0);

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
        // Server rows replace confirmed state; in-flight/failed optimistic
        // sends survive the refresh so they aren't wiped by a poll.
        setMessages((prev) => [...messageRows, ...prev.filter((m) => m.localStatus)]);
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
      (m) =>
        !m.localStatus &&
        m.author_user_id !== user.id &&
        new Date(m.created_at).getTime() > cutoff,
    ).length;
  }, [messages, lastReadAt, user]);

  const deliver = useCallback(
    async (tempId: string, episode: string, body: string) => {
      try {
        const created = await createDiscussionMessage(episode, body);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? created : m)));
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, localStatus: "failed" as const } : m)),
        );
      }
    },
    [],
  );

  const send = useCallback(
    async (body: string) => {
      if (!episodeId || !user) throw new Error("Missing analysis id.");
      const trimmed = body.trim();
      if (!trimmed) return;
      const tempId = `local-${++tempIdRef.current}`;
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          episode_id: episodeId,
          author_user_id: user.id,
          body: trimmed,
          created_at: now,
          updated_at: now,
          localStatus: "sending",
        },
      ]);
      await deliver(tempId, episodeId, trimmed);
    },
    [episodeId, user, deliver],
  );

  const retrySend = useCallback(
    async (messageId: string) => {
      const failed = messages.find((m) => m.id === messageId && m.localStatus === "failed");
      if (!failed || !episodeId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, localStatus: "sending" as const } : m)),
      );
      await deliver(messageId, episodeId, failed.body);
    },
    [messages, episodeId, deliver],
  );

  const discardFailed = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

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
    retrySend,
    discardFailed,
    edit,
    remove,
    markRead,
    reload: load,
  };
}
