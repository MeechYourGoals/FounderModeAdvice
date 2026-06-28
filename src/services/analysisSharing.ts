import { supabase } from "@/integrations/supabase/client";
import {
  buildInviteLink,
  generateInviteToken,
  hashInviteToken,
  sendInviteEmail,
} from "@/services/folderSharing";

export const PENDING_ANALYSIS_INVITE_KEY = "fma_pending_analysis_invite";

export interface AnalysisInvite {
  id: string;
  episode_id: string;
  invited_email: string;
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  role: "viewer";
  status: "pending" | "accepted" | "revoked" | "expired";
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface SharedAnalysisSummary {
  id: string;
  title: string;
  created_at: string | null;
  founder_names: string | null;
  analyzed_profile_id: string | null;
  analyzed_profile_name_snapshot: string | null;
  user_startup_profiles?: { company_name: string | null } | null;
}

export async function createAnalysisInvite(params: { episodeId: string; email: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to invite collaborators.");

  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error("Enter an email address to invite.");

  const rawToken = generateInviteToken();
  const tokenHash = await hashInviteToken(rawToken);

  const { data, error } = await (supabase as any)
    .from("analysis_invites")
    .insert({
      episode_id: params.episodeId,
      invited_email: email,
      invited_by_user_id: user.id,
      role: "viewer",
      token_hash: tokenHash,
    })
    .select()
    .single();

  if (error) throw error;

  const link = `${buildInviteLink(rawToken).replace("/invite/", "/analysis-invite/")}`;
  void sendInviteEmail({ email, link, folderId: params.episodeId });
  return { invite: data as AnalysisInvite, link, rawToken };
}

export async function listAnalysisInvites(episodeId: string): Promise<AnalysisInvite[]> {
  const { data, error } = await (supabase as any)
    .from("analysis_invites")
    .select("*")
    .eq("episode_id", episodeId)
    .neq("status", "revoked")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnalysisInvite[];
}

export async function revokeAnalysisInvite(invite: AnalysisInvite) {
  const { error } = await (supabase as any)
    .from("analysis_invites")
    .update({ status: "revoked" })
    .eq("id", invite.id);
  if (error) throw error;

  if (invite.accepted_by_user_id) {
    const { error: deleteError } = await (supabase as any)
      .from("analysis_access_grants")
      .delete()
      .eq("episode_id", invite.episode_id)
      .eq("grantee_user_id", invite.accepted_by_user_id);
    if (deleteError) throw deleteError;
  }
}

export async function acceptAnalysisInvite(rawToken: string): Promise<string> {
  const tokenHash = await hashInviteToken(rawToken);
  const { data, error } = await (supabase as any).rpc("accept_analysis_invite", {
    p_token_hash: tokenHash,
  });
  if (error) throw error;
  return data as string;
}

export async function listSharedAnalyses(): Promise<SharedAnalysisSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: grants, error } = await (supabase as any)
    .from("analysis_access_grants")
    .select(`
      episode_id,
      episodes (
        id,
        title,
        created_at,
        founder_names
      )
    `)
    .eq("grantee_user_id", user.id);

  if (error) throw error;
  return (grants ?? [])
    .map((row: any) => row.episodes)
    .filter(Boolean);
}
