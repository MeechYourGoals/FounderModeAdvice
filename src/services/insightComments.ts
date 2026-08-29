import { supabase as supabaseTyped } from "@/integrations/supabase/client";

// The insight-comments migration (insight_comments, insight_comment_mentions,
// list_episode_collaborators RPC) post-dates the generated Database types, so
// this file treats the client as untyped — same convention as
// folderSharing.ts / analysisSharing.ts — until the types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;

async function notifyInsightReply(recordId: string): Promise<void> {
  const { error } = await supabaseTyped.functions.invoke("send-collaboration-notification", {
    body: { kind: "insight_comment", recordId },
  });
  if (error && import.meta.env.DEV) console.warn("Insight push notification failed", error);
}

export type InsightType = "lesson" | "callout" | "personalized_insight";

export type CommentVisibility = "shared" | "private";

export interface InsightComment {
  id: string;
  episode_id: string;
  insight_type: InsightType;
  insight_id: string;
  author_user_id: string;
  body: string;
  visibility: CommentVisibility;
  created_at: string;
  updated_at: string;
  insight_comment_mentions?: { mentioned_user_id: string }[];
}

export interface EpisodeCollaborator {
  user_id: string;
  email: string;
  is_owner: boolean;
}

/** Everyone with access to the episode (owner, invitees, folder members). */
export async function listEpisodeCollaborators(episodeId: string): Promise<EpisodeCollaborator[]> {
  const { data, error } = await supabase.rpc("list_episode_collaborators", {
    p_episode_id: episodeId,
  });
  if (error) throw error;
  return (data ?? []) as EpisodeCollaborator[];
}

/** All comments the current user may see for an episode, oldest first. */
export async function listInsightComments(episodeId: string): Promise<InsightComment[]> {
  const { data, error } = await supabase
    .from("insight_comments")
    .select("*, insight_comment_mentions(mentioned_user_id)")
    .eq("episode_id", episodeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InsightComment[];
}

export async function createInsightComment(params: {
  episodeId: string;
  insightType: InsightType;
  insightId: string;
  body: string;
  visibility: CommentVisibility;
  mentionedUserIds: string[];
}): Promise<InsightComment> {
  const {
    data: { user },
  } = await supabaseTyped.auth.getUser();
  if (!user) throw new Error("You must be signed in to comment.");

  const body = params.body.trim();
  if (!body) throw new Error("Write a note before posting.");

  const { data, error } = await supabase
    .from("insight_comments")
    .insert({
      episode_id: params.episodeId,
      insight_type: params.insightType,
      insight_id: params.insightId,
      author_user_id: user.id,
      body,
      visibility: params.visibility,
    })
    .select()
    .single();
  if (error) throw error;

  const comment = data as InsightComment;

  // Mentions only make sense on comments teammates can read.
  const mentionIds = params.visibility === "shared" ? [...new Set(params.mentionedUserIds)] : [];
  if (mentionIds.length > 0) {
    const { error: mentionError } = await supabase
      .from("insight_comment_mentions")
      .insert(mentionIds.map((mentioned_user_id) => ({ comment_id: comment.id, mentioned_user_id })));
    if (mentionError) throw mentionError;
    comment.insight_comment_mentions = mentionIds.map((mentioned_user_id) => ({ mentioned_user_id }));
  } else {
    comment.insight_comment_mentions = [];
  }

  if (comment.visibility === "shared") void notifyInsightReply(comment.id);

  return comment;
}

export async function updateInsightComment(commentId: string, body: string): Promise<InsightComment> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("A note cannot be empty.");

  const { data, error } = await supabase
    .from("insight_comments")
    .update({ body: trimmed })
    .eq("id", commentId)
    .select("*, insight_comment_mentions(mentioned_user_id)")
    .single();
  if (error) throw error;
  return data as InsightComment;
}

export async function deleteInsightComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("insight_comments").delete().eq("id", commentId);
  if (error) throw error;
}
