import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyBulkDeleteBody } from "../_shared/posthog.ts";

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
  "user_favorites",
  "favorite_collections",
  "user_notification_prefs",
  "user_onboarding",
  "user_monthly_usage",
  "user_startup_profiles",
  "user_roles",
  // Paddle audit rows for this user (Paddle retains its own MoR records
  // outside Supabase — see retainedForCompliance below).
  "subscriptions",
  "user_subscriptions",
  "rate_limits",
  "analysis_discussion_reads",
] as const;

const USER_ANALYSIS_TABLES = [
  // Mentions of this user in other people's comments (mentions inside the
  // user's own comments cascade when insight_comments rows are removed).
  { table: "insight_comment_mentions", column: "mentioned_user_id" },
  { table: "insight_comments", column: "author_user_id" },
  { table: "analysis_discussion_messages", column: "author_user_id" },
  // Analysis-level sharing: access this user granted or received, and
  // invites they sent or accepted.
  { table: "analysis_access_grants", column: "grantee_user_id" },
  { table: "analysis_access_grants", column: "granted_by_user_id" },
  { table: "analysis_invites", column: "invited_by_user_id" },
  { table: "analysis_invites", column: "accepted_by_user_id" },
  { table: "episodes", column: "analyzed_by" },
  // Invites the user sent (invites on their own folders also cascade above).
  { table: "folder_invites", column: "invited_by_user_id" },
] as const;

// All buckets that store objects under a `<userId>/` prefix. `source-uploads`
// holds private documents awaiting analysis (normally deleted right after
// processing, but failed/abandoned runs can leave files behind).
const USER_STORAGE_BUCKETS = ["startup-decks", "exports", "source-uploads"] as const;

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

/**
 * Delete the user's OneSignal user record and PostHog person. Both are
 * best-effort: missing secrets (push/analytics not enabled) are skipped, and
 * HTTP failures are returned rather than failing the whole account deletion
 * (the auth user is already gone by the time this runs).
 */
async function eraseVendorRecords(userId: string): Promise<{
  oneSignal: "deleted" | "skipped" | "failed";
  posthog: "deleted" | "skipped" | "failed";
  errors: string[];
}> {
  const errors: string[] = [];
  let oneSignal: "deleted" | "skipped" | "failed" = "skipped";
  let posthog: "deleted" | "skipped" | "failed" = "skipped";

  const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
  const oneSignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (oneSignalAppId && oneSignalKey) {
    try {
      const res = await fetch(
        `https://api.onesignal.com/apps/${oneSignalAppId}/users/by/external_id/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Key ${oneSignalKey}`,
            Accept: "application/json",
          },
        },
      );
      // 404 = already gone / never registered — treat as success.
      if (res.ok || res.status === 404) {
        oneSignal = "deleted";
      } else {
        oneSignal = "failed";
        errors.push(`OneSignal ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      oneSignal = "failed";
      errors.push(`OneSignal: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // POSTHOG_HOST must be the private app/API host (https://us.posthog.com),
  // not the public ingestion host used by the browser SDK.
  const posthogHost = (Deno.env.get("POSTHOG_HOST") || "https://us.posthog.com").replace(/\/+$/, "");
  const posthogProjectId = Deno.env.get("POSTHOG_PROJECT_ID");
  const posthogPersonalKey = Deno.env.get("POSTHOG_PERSONAL_API_KEY");
  if (posthogProjectId && posthogPersonalKey) {
    try {
      const res = await fetch(
        `${posthogHost}/api/projects/${encodeURIComponent(posthogProjectId)}/persons/bulk_delete/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${posthogPersonalKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            distinct_ids: [userId],
            delete_events: true,
            delete_recordings: true,
          }),
        },
      );

      // 404 is NOT success here — it means the project/endpoint was wrong.
      if (!res.ok) {
        posthog = "failed";
        // Never surface the response body (may echo request data) or the key.
        errors.push(`PostHog erasure rejected with status ${res.status}`);
      } else {
        const verification = verifyBulkDeleteBody(await res.text());
        if (verification.ok) {
          posthog = "deleted";
        } else {
          posthog = "failed";
          errors.push(`PostHog erasure unverified: ${verification.reason}`);
        }
      }
    } catch {
      // Swallow the raw error: fetch errors can include the full request URL.
      posthog = "failed";
      errors.push("PostHog erasure request failed");
    }
  }


  if (errors.length > 0) {
    console.warn("Vendor erasure incomplete after account deletion", { userId, errors });
  }

  return { oneSignal, posthog, errors };
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

    // Best-effort third-party erasure. Failures here must not revive the
    // already-deleted auth user — they are logged and reported so the
    // offboarding runbook can retry.
    const vendorErasure = await eraseVendorRecords(userId);

    return jsonResponse({
      success: true,
      message: "Account deleted successfully",
      deletedTables,
      deletedStorageObjects,
      skippedTables,
      vendorErasure,
      retainedForCompliance: [
        "payment processor tax/accounting records may remain outside Supabase (Paddle, Apple, Google, RevenueCat)",
      ],
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
