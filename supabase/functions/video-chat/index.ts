import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getVideoContext } from "../_shared/transcript.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id?: string;
  role: ChatRole;
  content: string;
  created_at?: string;
};

const MAX_TRANSCRIPT_CHARS = 22000;
const CHUNK_SIZE = 2200;
const CHUNK_OVERLAP = 250;

/** Founder/Super Admin emails with unlimited access - no feature limits */
const FOUNDER_EMAILS = ["ccamechi@gmail.com"];

/**
 * Ask-the-video chat is gated to the Boardroom (series_z) plan.
 * Enforced here server-side so the entitlement can never be bypassed from the client.
 */
const userCanChat = async (supabase: any, user: any): Promise<boolean> => {
  if (user?.email && FOUNDER_EMAILS.includes(user.email.toLowerCase())) return true;
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", user.id)
    .maybeSingle();
  return (sub?.tier || "free") === "series_z";
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const tokenize = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3),
  );

const selectTranscriptContext = (transcript: string, question: string) => {
  const normalized = transcript.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_TRANSCRIPT_CHARS) return normalized;

  const questionTokens = tokenize(question);
  const chunks: { text: string; score: number; index: number }[] = [];

  for (let start = 0; start < normalized.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
    const text = normalized.slice(start, start + CHUNK_SIZE);
    const chunkTokens = tokenize(text);
    let score = 0;
    questionTokens.forEach((token) => {
      if (chunkTokens.has(token)) score += 1;
    });
    chunks.push({ text, score, index: chunks.length });
  }

  const selected = chunks
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 8)
    .sort((a, b) => a.index - b.index)
    .map((chunk, idx) => `[Transcript chunk ${idx + 1}]\n${chunk.text}`)
    .join("\n\n");

  return selected.slice(0, MAX_TRANSCRIPT_CHARS);
};

const buildInsightsContext = (lessons: any[], callouts: any[], insights: any[]) => {
  const lessonLines = lessons
    .slice(0, 10)
    .map((lesson, index) => `${index + 1}. ${lesson.lesson_text}`)
    .join("\n");
  const calloutLines = callouts
    .slice(0, 5)
    .map((callout, index) => `${index + 1}. ${callout.callout_text}`)
    .join("\n");
  const insightLines = insights
    .slice(0, 8)
    .map((insight, index) => `${index + 1}. ${insight.personalized_text}`)
    .join("\n");

  return [
    lessonLines ? `Extracted lessons:\n${lessonLines}` : "",
    calloutLines ? `Startup-relevant callouts:\n${calloutLines}` : "",
    insightLines ? `Existing personalized insights:\n${insightLines}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const getAuthenticatedUser = async (supabase: any, req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user;
};

const fetchOwnedEpisodeContext = async (supabase: any, videoId: string, userId: string) => {
  const { data: episode, error: episodeError } = await supabase
    .from("episodes")
    .select("id, title, url, founder_names, analyzed_by, analysis_status")
    .eq("id", videoId)
    .single();

  if (episodeError || !episode) {
    return { error: "Video not found.", status: 404 } as const;
  }

  if (episode.analyzed_by !== userId) {
    return { error: "You do not have access to chat with this video.", status: 403 } as const;
  }

  const [{ data: transcript }, { data: lessons }, { data: callouts }] = await Promise.all([
    supabase
      .from("episode_transcripts")
      .select("transcript_text, language, source, fetched_at")
      .eq("episode_id", videoId)
      .maybeSingle(),
    supabase
      .from("lessons")
      .select("id, lesson_text, impact_score, actionability_score, category, founder_attribution")
      .eq("episode_id", videoId)
      .order("impact_score", { ascending: false }),
    supabase
      .from("chavel_callouts")
      .select("id, callout_text, relevance_score")
      .eq("episode_id", videoId)
      .order("relevance_score", { ascending: false }),
  ]);

  const lessonIds = (lessons || []).map((lesson: any) => lesson.id);
  const { data: insights } = lessonIds.length
    ? await supabase
        .from("personalized_insights")
        .select("lesson_id, personalized_text, relevance_score, action_items")
        .in("lesson_id", lessonIds)
    : { data: [] };

  return {
    episode,
    transcript,
    lessons: lessons || [],
    callouts: callouts || [],
    insights: insights || [],
  } as const;
};

const getOrCreateSession = async (supabase: any, videoId: string, userId: string) => {
  const { data: existing } = await supabase
    .from("video_chat_sessions")
    .select("id")
    .eq("video_id", videoId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("video_chat_sessions")
    .insert({ video_id: videoId, user_id: userId })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
};

const fetchMessages = async (supabase: any, sessionId: string) => {
  const { data, error } = await supabase
    .from("video_chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as ChatMessage[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Supabase environment is not configured." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const user = await getAuthenticatedUser(supabase, req);
    if (!user) {
      return jsonResponse({ error: "Authentication is required to chat with a video." }, 401);
    }

    // Rate limit: 30 requests / minute per user.
    const { data: allowed } = await supabase.rpc("check_and_increment_rate_limit", {
      _user_id: user.id,
      _key: "video-chat",
      _window: "1 minute",
      _limit: 30,
    });
    if (allowed === false) {
      return jsonResponse({ error: "You're sending messages too quickly. Please wait a moment." }, 429);
    }

    const { action = "ask", videoId, message } = await req.json();
    if (!videoId || typeof videoId !== "string") {
      return jsonResponse({ error: "videoId is required." }, 400);
    }

    // Boardroom-only entitlement (defense-in-depth; the UI also gates this).
    if (!(await userCanChat(supabase, user))) {
      return jsonResponse(
        {
          error:
            "Ask-the-video chat is available on The Boardroom plan. Upgrade to unlock unlimited transcript-grounded video Q&A.",
          upgradeRequired: true,
        },
        403,
      );
    }

    const context = await fetchOwnedEpisodeContext(supabase, videoId, user.id);
    if ("error" in context) {
      return jsonResponse({ error: context.error }, context.status);
    }

    const sessionId = await getOrCreateSession(supabase, videoId, user.id);

    if (action === "history") {
      const messages = await fetchMessages(supabase, sessionId);
      return jsonResponse({
        sessionId,
        messages,
        hasTranscript: Boolean(context.transcript?.transcript_text?.trim()),
        transcriptSource: context.transcript?.source || null,
      });
    }

    if (!lovableApiKey) {
      return jsonResponse({ error: "AI provider is not configured." }, 500);
    }

    if (action === "summary") {
      const messages = await fetchMessages(supabase, sessionId);
      if (!messages.length) {
        return jsonResponse({ error: "There's no conversation to summarize yet." }, 409);
      }

      const conversation = messages
        .map((msg) => `${msg.role === "user" ? "Question" : "Answer"}: ${msg.content}`)
        .join("\n\n");

      const summarySystemPrompt = `You summarize a Q&A conversation about a video into a concise brief for a business builder.
Stay grounded ONLY in the conversation provided — do not invent facts, names, or metrics that aren't present.
Output plain text in exactly these sections:
Overview: a 2-4 sentence recap of what was discussed.
Key takeaways: 3-6 short bullet points (prefix each with "- ").
Action items: 3-6 concrete next steps for the user's business (prefix each with "- ").`;

      const summaryUserPrompt = `Video: ${context.episode.title}

Conversation:
${conversation}`;

      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: summarySystemPrompt },
            { role: "user", content: summaryUserPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text();
        console.error("video-chat summary AI error", summaryResponse.status, errorText);
        const status = summaryResponse.status === 429 ? 429 : 502;
        return jsonResponse({ error: "Could not generate a summary right now. Please retry." }, status);
      }

      const summaryData = await summaryResponse.json();
      const summary = summaryData.choices?.[0]?.message?.content?.trim();
      if (!summary) {
        return jsonResponse({ error: "The AI service returned an empty summary. Please retry." }, 502);
      }

      return jsonResponse({ summary, title: context.episode.title, messages });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return jsonResponse({ error: "A question is required." }, 400);
    }

    let transcriptText = context.transcript?.transcript_text?.trim() || "";
    let transcriptSource = context.transcript?.source || null;

    // Backfill: if this video was analyzed before we supported non-YouTube transcripts
    // (or YouTube captions were briefly unavailable), try to fetch a transcript now and
    // cache it so the next question is instant.
    if (!transcriptText && context.episode.url) {
      try {
        const refreshed = await getVideoContext(context.episode.url);
        if (refreshed.transcript?.transcriptText) {
          transcriptText = refreshed.transcript.transcriptText;
          transcriptSource = refreshed.transcript.source;
          await supabase
            .from("episode_transcripts")
            .upsert(
              {
                episode_id: videoId,
                transcript_text: transcriptText,
                language: refreshed.transcript.language,
                source: transcriptSource,
                fetched_at: new Date().toISOString(),
              },
              { onConflict: "episode_id" },
            );
        }
      } catch (e) {
        console.warn("Transcript backfill failed:", e);
      }
    }

    const insightsContext = buildInsightsContext(context.lessons, context.callouts, context.insights);
    const hasAnyInsights =
      (context.lessons?.length || 0) + (context.callouts?.length || 0) + (context.insights?.length || 0) > 0;

    if (!transcriptText && !hasAnyInsights) {
      return jsonResponse(
        {
          error:
            "This video hasn't been analyzed yet. Re-run the analysis from the episode page, then retry Ask this video.",
        },
        409,
      );
    }


    const trimmedMessage = message.trim().slice(0, 2000);
    const priorMessages = (await fetchMessages(supabase, sessionId)).slice(-8);

    await supabase.from("video_chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      video_id: videoId,
      role: "user",
      content: trimmedMessage,
    });

    const groundingMode: "transcript" | "insights" = transcriptText ? "transcript" : "insights";
    const transcriptContext = transcriptText ? selectTranscriptContext(transcriptText, trimmedMessage) : "";

    const baseScope = `SCOPE — this is critical:
- Only answer questions about THIS video's content and how it applies to the user's business, company, product, strategy, operations, marketing, hiring, finance, leadership, or growth.
- If the user asks about anything unrelated to the video or to building/running a business (sports, recipes, gossip, trivia, homework, unrelated coding/medical/legal questions), politely decline in one sentence and steer them back to the video or their business.

For every in-scope answer:
- Separate what the source explicitly says from your interpretation and business-specific application when useful.
- Adapt to the user's industry and stage; do not assume they are a venture-backed tech startup unless their context says so.
- Avoid inventing names, facts, metrics, quotes, or advice not grounded in the provided context.
- Keep answers concise, tactical, and useful to a business builder.
- Do not claim the speaker personally reviewed the user's business; no endorsement, partnership, or private access language.`;

    const systemPrompt =
      groundingMode === "transcript"
        ? `You are a transcript-grounded business analyst for Founder Mode Advice. Answer only from the selected video's transcript and extracted app insights.

${baseScope}

- If the transcript does not support an answer, say that clearly.`
        : `You are an insights-grounded business analyst for Founder Mode Advice. A raw transcript is NOT available for this video, but the app has already extracted lessons, startup callouts, and personalized insights from it during analysis. Treat those as your source of truth.

${baseScope}

- If the extracted insights don't cover the question, say so plainly (e.g. "The extracted insights for this video don't cover that — re-run analysis or pick a more specific question").
- Do not invent quotes or claim to be quoting the speaker directly.`;

    const sourceBlock =
      groundingMode === "transcript"
        ? `Transcript context selected for this question:
${transcriptContext}`
        : `No raw transcript is available for this video. Use only the extracted insights below as your grounding.`;

    const userPrompt = `Video metadata:
Title: ${context.episode.title}
People/companies listed by the app: ${context.episode.founder_names || "Not specified"}
URL: ${context.episode.url}

${insightsContext ? `${insightsContext}\n\n` : ""}${sourceBlock}

Recent conversation:
${priorMessages.map((msg) => `${msg.role}: ${msg.content}`).join("\n") || "No prior messages."}

User question:
${trimmedMessage}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("video-chat AI error", aiResponse.status, errorText);
      const status = aiResponse.status === 429 ? 429 : 502;
      return jsonResponse({ error: "The AI service could not answer right now. Please retry." }, status);
    }

    const aiData = await aiResponse.json();
    const assistantContent = aiData.choices?.[0]?.message?.content?.trim();
    if (!assistantContent) {
      return jsonResponse({ error: "The AI service returned an empty answer. Please retry." }, 502);
    }

    const { data: assistantMessage, error: insertError } = await supabase
      .from("video_chat_messages")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        video_id: videoId,
        role: "assistant",
        content: assistantContent,
        metadata: {
          grounding_mode: groundingMode,
          transcript_source: transcriptSource,
          transcript_chars_used: transcriptContext.length,
        },
      })
      .select("id, role, content, created_at")
      .single();

    if (insertError) throw insertError;

    return jsonResponse({ sessionId, message: assistantMessage, groundingMode });
  } catch (error) {
    console.error("Error in video-chat:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown video chat error." },
      500,
    );
  }
});
