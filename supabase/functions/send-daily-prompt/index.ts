// Sends the daily founder prompt to all opted-in users via OneSignal.
// Trigger this via pg_cron once OneSignal credentials are configured.
//
// Required secrets:
//   ONESIGNAL_APP_ID
//   ONESIGNAL_REST_API_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPTS = [
  "What's the one decision today that, if you got it right, would matter most this quarter?",
  "Which customer conversation would teach you the most this week? Book it.",
  "Name the biggest risk you're not currently tracking. Add it to your top-of-mind list.",
  "Where are you the bottleneck? Delegate one thing today.",
  "What would you do this week if you had 10x more conviction?",
  "Identify a feature you can cut. Ship the smaller thing faster.",
  "Who on your team is underused? Give them a stretch assignment.",
  "What metric have you been avoiding? Look at it now.",
  "Write the one-sentence version of your strategy. Read it tomorrow.",
  "Which meeting on your calendar this week is optional? Cancel it.",
];

function todaysPrompt(): string {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return PROMPTS[dayIndex % PROMPTS.length];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // This endpoint pushes to EVERY opted-in user, so it must not be publicly
  // triggerable. The scheduler (pg_cron / external cron) must send the shared
  // secret: set CRON_SECRET in the function's env and include an
  // `x-cron-secret` header on the scheduled request. Fails closed when unset.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!oneSignalAppId || !oneSignalKey) {
      return new Response(
        JSON.stringify({ error: "OneSignal not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: optedIn, error } = await supabase
      .from("user_notification_prefs")
      .select("user_id")
      .eq("daily_prompt", true);

    if (error) throw error;
    if (!optedIn || optedIn.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No opted-in users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const externalIds = optedIn.map((r) => r.user_id);
    const prompt = todaysPrompt();

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${oneSignalKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        include_external_user_ids: externalIds,
        channel_for_external_user_ids: "push",
        headings: { en: "Founder Mode — daily prompt" },
        contents: { en: prompt },
        url: "https://foundermodeadvice.com/?utm_source=push&utm_campaign=daily_prompt",
      }),
    });

    const payload = await res.json();
    if (!res.ok) {
      console.error("OneSignal error", payload);
      return new Response(
        JSON.stringify({ error: "OneSignal request failed", details: payload }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ sent: externalIds.length, oneSignalId: payload.id, prompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-daily-prompt error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
