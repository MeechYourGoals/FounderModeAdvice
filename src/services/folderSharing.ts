import { supabase as supabaseTyped } from "@/integrations/supabase/client";

// The base folder-sharing migration (folder_invites, folder_members,
// episode_folders, folder_role enum, accept_folder_invite RPC) is not yet
// applied to this project, so the generated Database types don't know about
// these objects. Until the migration ships, we treat the client as untyped in
// this file only — every other module keeps its full type safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;

export const PENDING_INVITE_KEY = "fma_pending_invite";

export type FolderRole = "viewer" | "editor";
export interface FolderInvite {
  id: string;
  folder_id: string;
  invited_email: string;
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  role: FolderRole;
  status: string;
  token_hash: string;
  created_at: string;
  expires_at?: string | null;
}
export interface FolderMember {
  id: string;
  folder_id: string;
  user_id: string;
  role: FolderRole;
  created_at: string;
}

const INVITE_TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Cryptographically-random, URL-safe invite token. Lives only in the link. */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(INVITE_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** SHA-256 (hex) of a raw token — the only form that ever reaches the database. */
export async function hashInviteToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Public base URL for building shareable links (prefers the configured app URL). */
export function getAppBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined;
  if (fromEnv && /^https?:\/\//.test(fromEnv)) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.origin.startsWith("http")) {
    return window.location.origin;
  }
  return "https://foundermodeadvice.com";
}

export function buildInviteLink(rawToken: string): string {
  return `${getAppBaseUrl()}/invite/${rawToken}`;
}

/**
 * Invites are link-based: creating one returns a private URL that the owner
 * shares themselves (Slack, iMessage, their own email client). No mail
 * provider is involved.
 */


export interface CreatedInvite {
  invite: FolderInvite;
  link: string;
  rawToken: string;
}

/** Create a pending invite for a folder the caller owns and return its link. */
export async function createFolderInvite(params: {
  folderId: string;
  email: string;
  role?: FolderRole;
}): Promise<CreatedInvite> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to invite collaborators.");

  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error("Enter an email address to invite.");

  const rawToken = generateInviteToken();
  const tokenHash = await hashInviteToken(rawToken);

  const { data, error } = await supabase
    .from("folder_invites")
    .insert({
      folder_id: params.folderId,
      invited_email: email,
      invited_by_user_id: user.id,
      role: params.role ?? "viewer",
      token_hash: tokenHash,
    })
    .select()
    .single();

  if (error) throw error;

  const link = buildInviteLink(rawToken);
  return { invite: data, link, rawToken };

}

/** Active (non-revoked) invites/collaborators for a folder the caller owns. */
export async function listFolderCollaborators(folderId: string): Promise<FolderInvite[]> {
  const { data, error } = await supabase
    .from("folder_invites")
    .select("*")
    .eq("folder_id", folderId)
    .neq("status", "revoked")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Revoke an invite and, if it was already accepted, remove the collaborator. */
export async function revokeFolderInvite(invite: FolderInvite): Promise<void> {
  const { error } = await supabase
    .from("folder_invites")
    .update({ status: "revoked" })
    .eq("id", invite.id);
  if (error) throw error;

  if (invite.accepted_by_user_id) {
    const { error: delErr } = await supabase
      .from("folder_members")
      .delete()
      .eq("folder_id", invite.folder_id)
      .eq("user_id", invite.accepted_by_user_id);
    if (delErr) throw delErr;
  }
}

/** Redeem an invite link for the signed-in user. Returns the shared folder id. */
export async function acceptFolderInvite(rawToken: string): Promise<string> {
  const tokenHash = await hashInviteToken(rawToken);
  const { data, error } = await supabase.rpc("accept_folder_invite", {
    p_token_hash: tokenHash,
  });
  if (error) throw error;
  return data as string;
}

export interface SharedFolderSummary {
  id: string;
  name: string;
  color: string | null;
  role: FolderRole;
  episodeCount: number;
}

/** Folders shared with the signed-in user (i.e. where they are a collaborator). */
export async function listSharedFolders(): Promise<SharedFolderSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error } = await supabase
    .from("folder_members")
    .select("folder_id, role, episode_folders(id, name, color)")
    .eq("user_id", user.id);
  if (error) throw error;

  const rows = (memberships ?? []).filter((m) => m.episode_folders);
  if (rows.length === 0) return [];

  const folderIds = rows.map((m) => m.folder_id);
  const counts = new Map<string, number>();
  const { data: assignments } = await supabase
    .from("episode_folder_assignments")
    .select("folder_id")
    .in("folder_id", folderIds);
  (assignments ?? []).forEach((a) => {
    counts.set(a.folder_id, (counts.get(a.folder_id) ?? 0) + 1);
  });

  return rows.map((m) => {
    const folder = m.episode_folders as unknown as {
      id: string;
      name: string;
      color: string | null;
    };
    return {
      id: folder.id,
      name: folder.name,
      color: folder.color,
      role: m.role,
      episodeCount: counts.get(m.folder_id) ?? 0,
    };
  });
}

export interface SharedLesson {
  id: string;
  lesson_text: string;
  category: string | null;
  personalized_insights?: { personalized_text: string | null }[] | null;
}

export interface SharedEpisode {
  id: string;
  title: string;
  url: string | null;
  platform: string | null;
  founder_names: string | null;
  analyzed_profile_id?: string | null;
  analyzed_profile_name_snapshot?: string | null;
  user_startup_profiles?: { company_name?: string | null } | null;
  companies?: { name: string | null } | null;
  lessons?: SharedLesson[] | null;
}

export interface SharedFolderDetail {
  folder: { id: string; name: string; color: string | null; user_id: string | null };
  episodes: SharedEpisode[];
}

/** Load a shared folder plus its episodes and insights for the read-only view. */
export async function getSharedFolder(folderId: string): Promise<SharedFolderDetail | null> {
  const { data: folder, error: folderErr } = await supabase
    .from("episode_folders")
    .select("id, name, color, user_id")
    .eq("id", folderId)
    .maybeSingle();
  if (folderErr) throw folderErr;
  if (!folder) return null;

  const { data: assignments, error: assignErr } = await supabase
    .from("episode_folder_assignments")
    .select("episode_id")
    .eq("folder_id", folderId);
  if (assignErr) throw assignErr;

  const episodeIds = (assignments ?? []).map((a) => a.episode_id);
  if (episodeIds.length === 0) {
    return { folder: folder as SharedFolderDetail["folder"], episodes: [] };
  }

  const { data: episodes, error: epErr } = await supabase
    .from("episodes")
    .select(
      `*, companies(*), lessons(*, personalized_insights(*)), chavel_callouts(*)`,
    )
    .in("id", episodeIds)
    .order("created_at", { ascending: false });
  if (epErr) throw epErr;

  return {
    folder: folder as SharedFolderDetail["folder"],
    episodes: (episodes ?? []) as unknown as SharedEpisode[],
  };
}
