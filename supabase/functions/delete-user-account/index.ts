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
  { table: "episodes", column: "analyzed_by" },
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
      const { data: objects, error: listError } = await adminClient.storage
        .from(bucket)
        .list(userId, { limit: 1000 });

      if (listError) {
        if (isMissingRelationError(listError)) {
          skippedTables.push(`storage:${bucket}`);
        } else {
          failures.push({ target: `storage:${bucket}`, message: listError.message });
        }
        continue;
      }

      const paths = (objects ?? []).map((object) => `${userId}/${object.name}`);
      if (paths.length === 0) continue;

      const { error: removeError } = await adminClient.storage.from(bucket).remove(paths);
      if (removeError) {
        failures.push({ target: `storage:${bucket}`, message: removeError.message });
      } else {
        deletedStorageObjects.push(...paths.map((path) => `${bucket}/${path}`));
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
