import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USER_OWNED_TABLES = [
  "video_chat_messages",
  "video_chat_sessions",
  "bookmarked_lessons",
  "bookmarked_episodes",
  "episode_folder_assignments",
  // Remove the user's collaborator access (their memberships in any folder,
  // including ones owned by others). Memberships on their own folders also
  // cascade when episode_folders is removed below.
  "folder_members",
  "bookmark_folders",
  "episode_folders",
  "personalized_insights",
  "user_notification_prefs",
  "user_onboarding",
  "user_monthly_usage",
  "user_startup_profiles",
  "user_roles",
  "user_subscriptions",
] as const;

const USER_ANALYSIS_TABLES = [
  // Mentions of this user in other people's comments (mentions inside the
  // user's own comments cascade when insight_comments rows are removed).
  { table: "insight_comment_mentions", column: "mentioned_user_id" },
  { table: "insight_comments", column: "author_user_id" },
  { table: "episodes", column: "analyzed_by" },
  // Invites the user sent (invites on their own folders also cascade above).
  { table: "folder_invites", column: "invited_by_user_id" },
] as const;

const USER_STORAGE_BUCKETS = ["startup-decks", "exports"] as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isMissingRelationError(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST205" || /could not find|does not exist|not found/i.test(error.message ?? "");
}

async function listStoragePathsForPrefix(
  adminClient: any,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const { data: objects, error } = await adminClient.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw error;
    if (!objects || objects.length === 0) break;

    for (const object of objects) {
      const objectPath = `${prefix}/${object.name}`;
      // Supabase Storage returns folder placeholders without an object id. Recurse
      // so account deletion covers future nested deck/export paths too.
      if (object.id) {
        paths.push(objectPath);
      } else {
        paths.push(...await listStoragePathsForPrefix(adminClient, bucket, objectPath));
      }
    }

    if (objects.length < pageSize) break;
    offset += pageSize;
  }

  return paths;
}

async function removeStoragePaths(
  adminClient: any,
  bucket: string,
  paths: string[],
): Promise<void> {
  const chunkSize = 100;
  for (let index = 0; index < paths.length; index += chunkSize) {
    const chunk = paths.slice(index, index + chunkSize);
    const { error } = await adminClient.storage.from(bucket).remove(chunk);
    if (error) throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Server is missing required Supabase secrets" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const deletedTables: string[] = [];
    const skippedTables: string[] = [];
    const deletedStorageObjects: string[] = [];
    const failures: Array<{ target: string; message: string }> = [];

    for (const bucket of USER_STORAGE_BUCKETS) {
      try {
        const paths = await listStoragePathsForPrefix(adminClient, bucket, userId);
        if (paths.length === 0) continue;

        await removeStoragePaths(adminClient, bucket, paths);
        deletedStorageObjects.push(...paths.map((path) => `${bucket}/${path}`));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isMissingRelationError({ message })) {
          skippedTables.push(`storage:${bucket}`);
        } else {
          failures.push({ target: `storage:${bucket}`, message });
        }
      }
    }

    for (const table of USER_OWNED_TABLES) {
      const { error } = await adminClient.from(table).delete().eq("user_id", userId);
      if (error) {
        if (isMissingRelationError(error)) skippedTables.push(table);
        else failures.push({ target: table, message: error.message });
      } else {
        deletedTables.push(table);
      }
    }

    for (const { table, column } of USER_ANALYSIS_TABLES) {
      const { error } = await adminClient.from(table).delete().eq(column, userId);
      if (error) {
        if (isMissingRelationError(error)) skippedTables.push(table);
        else failures.push({ target: table, message: error.message });
      } else {
        deletedTables.push(`${table}.${column}`);
      }
    }

    if (failures.length > 0) {
      console.error("Account deletion failed before auth user deletion", { userId, failures });
      return jsonResponse({
        error: "Could not delete all account data. Auth user was retained so the request can be retried safely.",
        failures,
        deletedTables,
        deletedStorageObjects,
        skippedTables,
      }, 500);
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return jsonResponse({
        error: deleteUserError.message,
        deletedTables,
        deletedStorageObjects,
        skippedTables,
      }, 500);
    }

    return jsonResponse({
      success: true,
      message: "Account deleted successfully",
      deletedTables,
      deletedStorageObjects,
      skippedTables,
      retainedForCompliance: ["payment processor tax/accounting records may remain outside Supabase"],
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
