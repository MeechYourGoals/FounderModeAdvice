import { supabase } from "@/integrations/supabase/client";
import {
  folderColorFromTag,
  folderNameFromTag,
  normalizeTagName,
} from "@/lib/folderTagRules";

export class SmartFolderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmartFolderError";
  }
}

export async function applyRulesForEpisodeTags(
  userId: string,
  episodeId: string,
  tagNames: string[],
): Promise<void> {
  const tags = [...new Set(tagNames.map(normalizeTagName).filter(Boolean))];
  if (!userId || tags.length === 0) return;

  const { data: entitled, error: entitlementError } = await supabase.rpc(
    "user_has_boardroom_plan",
    { _user_id: userId },
  );
  if (entitlementError || !entitled) return;

  const { data: rules, error: rulesError } = await supabase
    .from("episode_folder_tag_rules")
    .select("folder_id, tag_name")
    .eq("user_id", userId)
    .in("tag_name", tags);
  if (rulesError || !rules?.length) return;

  const seen = new Set<string>();
  const rows = rules.flatMap((rule) => {
    if (seen.has(rule.folder_id)) return [];
    seen.add(rule.folder_id);
    return [{ user_id: userId, episode_id: episodeId, folder_id: rule.folder_id }];
  });

  const { error } = await supabase.from("episode_folder_assignments").insert(rows);
  if (error && error.code !== "23505") {
    console.error("applyRulesForEpisodeTags failed", error.message);
  }
}

export async function createSmartFolderFromTag(opts: {
  userId: string;
  tagName: string;
  matchingEpisodeIds: string[];
  existingFolders: { id: string; name: string; color: string }[];
}): Promise<{ folderId: string; folderName: string; assigned: number; reusedFolder: boolean }> {
  const tagName = normalizeTagName(opts.tagName);
  if (!tagName) throw new SmartFolderError("Pick a tag first.");

  const { data: entitled, error: entitlementError } = await supabase.rpc(
    "user_has_boardroom_plan",
    { _user_id: opts.userId },
  );
  if (entitlementError) throw new SmartFolderError(entitlementError.message);
  if (!entitled) {
    throw new SmartFolderError("Smart folders are included with The Boardroom.");
  }

  const { data: existingRule } = await supabase
    .from("episode_folder_tag_rules")
    .select("folder_id")
    .eq("user_id", opts.userId)
    .eq("tag_name", tagName)
    .maybeSingle();
  if (existingRule) {
    throw new SmartFolderError("This tag already auto-files into a folder.");
  }

  const folderName = folderNameFromTag(tagName);
  const existing = opts.existingFolders.find(
    (folder) => folder.name.trim().toLowerCase() === folderName.toLowerCase(),
  );

  let folderId = existing?.id ?? null;
  const reusedFolder = Boolean(folderId);

  if (!folderId) {
    const { data: created, error: createError } = await supabase
      .from("episode_folders")
      .insert({
        user_id: opts.userId,
        name: folderName,
        color: folderColorFromTag(tagName),
      })
      .select("id, name")
      .single();
    if (createError || !created) {
      throw new SmartFolderError(createError?.message || "Could not create the folder.");
    }
    folderId = created.id;
  }

  const { error: ruleError } = await supabase.from("episode_folder_tag_rules").insert({
    user_id: opts.userId,
    folder_id: folderId,
    tag_name: tagName,
  });
  if (ruleError) {
    throw new SmartFolderError(ruleError.message);
  }

  const uniqueIds = [...new Set(opts.matchingEpisodeIds)];
  if (uniqueIds.length > 0) {
    const { error: assignError } = await supabase.from("episode_folder_assignments").insert(
      uniqueIds.map((episodeId) => ({
        user_id: opts.userId,
        episode_id: episodeId,
        folder_id: folderId,
      })),
    );
    if (assignError && assignError.code !== "23505") {
      throw new SmartFolderError(assignError.message);
    }
  }

  return {
    folderId,
    folderName,
    assigned: uniqueIds.length,
    reusedFolder,
  };
}
