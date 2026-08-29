import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendPush } from "../_shared/oneSignal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type RequestBody =
  | { kind: "discussion"; recordId: string }
  | { kind: "insight_comment"; recordId: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ error: "Server configuration unavailable" }, 503);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await caller.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body || !UUID_PATTERN.test(body.recordId) || !["discussion", "insight_comment"].includes(body.kind)) {
    return json({ error: "Invalid request" }, 400);
  }

  let episodeId: string;
  if (body.kind === "discussion") {
    const { data, error } = await admin
      .from("analysis_discussion_messages")
      .select("id, episode_id, author_user_id")
      .eq("id", body.recordId)
      .maybeSingle();
    if (error) return json({ error: "Could not load reply" }, 500);
    if (!data) return json({ error: "Reply not found" }, 404);
    if (data.author_user_id !== user.id) return json({ error: "Forbidden" }, 403);
    episodeId = String(data.episode_id);
  } else {
    const { data, error } = await admin
      .from("insight_comments")
      .select("id, episode_id, author_user_id, visibility")
      .eq("id", body.recordId)
      .maybeSingle();
    if (error) return json({ error: "Could not load comment" }, 500);
    if (!data) return json({ error: "Comment not found" }, 404);
    if (data.author_user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (data.visibility !== "shared") return json({ sent: 0, reason: "private" });
    episodeId = String(data.episode_id);
  }

  // This SECURITY DEFINER RPC checks auth.uid() and returns only people who
  // already have access to the shared analysis.
  const { data: collaborators, error: collaboratorError } = await caller.rpc(
    "list_episode_collaborators",
    { p_episode_id: episodeId },
  );
  if (collaboratorError) return json({ error: "Could not resolve collaborators" }, 403);

  const collaboratorRows = (collaborators ?? []) as Array<{ user_id?: string }>;
  const candidateIds: string[] = [...new Set<string>(
    collaboratorRows
      .map((row) => row.user_id)
      .filter((id): id is string => Boolean(id && id !== user.id)),
  )];
  if (candidateIds.length === 0) return json({ sent: 0, reason: "no-recipients" });

  // Push is opt-in: only recipients who explicitly enabled teammate replies
  // are targeted. OS-level permission is requested by the app at that moment.
  const { data: prefs, error: prefsError } = await admin
    .from("user_notification_prefs")
    .select("user_id, collaboration_replies")
    .in("user_id", candidateIds);
  if (prefsError) return json({ error: "Could not load notification preferences" }, 500);
  const enabled = new Set(
    (prefs ?? [])
      .filter((row: { collaboration_replies?: boolean }) => row.collaboration_replies === true)
      .map((row: { user_id: string }) => row.user_id),
  );
  const externalIds = candidateIds.filter((id) => enabled.has(id));
  if (externalIds.length === 0) return json({ sent: 0, reason: "not-opted-in" });

  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!appId || !apiKey) return json({ error: "Push is not configured" }, 503);

  const { data: episode } = await admin
    .from("episodes")
    .select("title")
    .eq("id", episodeId)
    .maybeSingle();
  const rawTitle = typeof episode?.title === "string" ? episode.title.trim() : "a shared analysis";
  const title = rawTitle.length > 72 ? `${rawTitle.slice(0, 69)}…` : rawTitle;
  const path = `/shared-analysis/${episodeId}?utm_source=push&utm_campaign=collaboration_reply`;

  try {
    const result = await sendPush({
      appId,
      apiKey,
      externalIds,
      heading: "New teammate reply",
      content: `A teammate replied to “${title}”.`,
      path,
      idempotencyKey: body.recordId,
    });
    return json({ sent: externalIds.length, oneSignalId: result.id ?? null });
  } catch (error) {
    console.error("send-collaboration-notification error", error);
    return json({ error: "Push provider rejected the notification" }, 502);
  }
});
