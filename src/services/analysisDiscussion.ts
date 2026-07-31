import { supabase as supabaseTyped } from "@/integrations/supabase/client";

// The analysis-discussion migration (analysis_discussion_messages,
// analysis_discussion_reads) post-dates the generated Database types, so this
// file treats the client as untyped — same convention as insightComments.ts —
// until the types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;

export interface DiscussionMessage {
  id: string;
  episode_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** All discussion messages the current user may see for an episode, oldest first. */
export async function listDiscussionMessages(episodeId: string): Promise<DiscussionMessage[]> {
  const { data, error } = await supabase
    .from("analysis_discussion_messages")
    .select("*")
    .eq("episode_id", episodeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DiscussionMessage[];
}

export async function createDiscussionMessage(episodeId: string, body: string): Promise<DiscussionMessage> {
  const {
    data: { user },
  } = await supabaseTyped.auth.getUser();
  if (!user) throw new Error("You must be signed in to join the discussion.");

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Write a message before sending.");

  const { data, error } = await supabase
    .from("analysis_discussion_messages")
    .insert({ episode_id: episodeId, author_user_id: user.id, body: trimmed })
    .select()
    .single();
  if (error) throw error;
  return data as DiscussionMessage;
}

export async function updateDiscussionMessage(messageId: string, body: string): Promise<DiscussionMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("A message cannot be empty.");

  const { data, error } = await supabase
    .from("analysis_discussion_messages")
    .update({ body: trimmed })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;
  return data as DiscussionMessage;
}

export async function deleteDiscussionMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("analysis_discussion_messages").delete().eq("id", messageId);
  if (error) throw error;
}

/** When the current user last opened this episode's discussion, or null if never. */
export async function getDiscussionLastReadAt(episodeId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabaseTyped.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("analysis_discussion_reads")
    .select("last_read_at")
    .eq("episode_id", episodeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data?.last_read_at as string | undefined) ?? null;
}

/**
 * Unread message counts per episode for the current user, for badge chips on
 * lists of shared analyses. Two batched queries; RLS scopes both to episodes
 * the caller can access.
 */
export async function getUnreadDiscussionCounts(episodeIds: string[]): Promise<Record<string, number>> {
  if (episodeIds.length === 0) return {};
  const {
    data: { user },
  } = await supabaseTyped.auth.getUser();
  if (!user) return {};

  const [messagesRes, readsRes] = await Promise.all([
    supabase
      .from("analysis_discussion_messages")
      .select("episode_id, author_user_id, created_at")
      .in("episode_id", episodeIds),
    supabase
      .from("analysis_discussion_reads")
      .select("episode_id, last_read_at")
      .eq("user_id", user.id)
      .in("episode_id", episodeIds),
  ]);
  if (messagesRes.error) throw messagesRes.error;
  if (readsRes.error) throw readsRes.error;

  const readCutoffs = new Map<string, number>(
    ((readsRes.data ?? []) as { episode_id: string; last_read_at: string }[]).map((r) => [
      r.episode_id,
      new Date(r.last_read_at).getTime(),
    ]),
  );

  const counts: Record<string, number> = {};
  for (const m of (messagesRes.data ?? []) as {
    episode_id: string;
    author_user_id: string;
    created_at: string;
  }[]) {
    if (m.author_user_id === user.id) continue;
    const cutoff = readCutoffs.get(m.episode_id) ?? 0;
    if (new Date(m.created_at).getTime() > cutoff) {
      counts[m.episode_id] = (counts[m.episode_id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function markDiscussionRead(episodeId: string): Promise<void> {
  const {
    data: { user },
  } = await supabaseTyped.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("analysis_discussion_reads")
    .upsert(
      { episode_id: episodeId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "episode_id,user_id" },
    );
  if (error) throw error;
}
