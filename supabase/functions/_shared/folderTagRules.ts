// Apply Boardroom smart-folder rules after tags are written.
// Service-role callers still check user_has_boardroom_plan so a downgrade
// stops future auto-filing without deleting existing assignments.

// Minimal surface of the Supabase client used here. The analyze-episode
// function passes the service-role client; we avoid importing supabase-js
// types into this shared module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FolderRuleClient = {
  rpc: (fn: string, args: Record<string, string>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any;
};

function normalizeTagName(tag: string): string {
  return tag.replace(/^#/, "").trim().toLowerCase();
}

export async function applyFolderTagRules(
  supabase: FolderRuleClient,
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
  if (entitlementError) {
    console.error("folder tag rules: entitlement check failed", entitlementError.message);
    return;
  }
  if (!entitled) return;

  const { data: rules, error: rulesError } = await supabase
    .from("episode_folder_tag_rules")
    .select("folder_id, tag_name")
    .eq("user_id", userId)
    .in("tag_name", tags);

  if (rulesError) {
    console.error("folder tag rules: load failed", rulesError.message);
    return;
  }
  if (!rules?.length) return;

  const seen = new Set<string>();
  const rows = rules.flatMap((rule) => {
    if (seen.has(rule.folder_id)) return [];
    seen.add(rule.folder_id);
    return [{
      user_id: userId,
      episode_id: episodeId,
      folder_id: rule.folder_id,
    }];
  });

  const { error: assignError } = await supabase
    .from("episode_folder_assignments")
    .insert(rows);
  if (assignError && assignError.code !== "23505") {
    console.error("folder tag rules: assign failed", assignError.message);
  }
}
