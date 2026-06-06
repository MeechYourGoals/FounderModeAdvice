import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { extractYouTubeTranscript, extractYouTubeVideoId, isYouTubeUrl } from "../_shared/youtubeTranscript.ts";

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


const prepareTranscript = async (supabase: any, episode: { id: string; url: string }) => {
  if (!isYouTubeUrl(episode.url)) {
    return { transcript: null, error: "Transcript preparation is currently supported for YouTube videos with public captions." };
  }

  const youtubeVideoId = extractYouTubeVideoId(episode.url);
  const transcript = await extractYouTubeTranscript(youtubeVideoId);

  if (!transcript?.transcriptText) {
    return { transcript: null, error: "No public transcript captions were found for this YouTube video." };
  }

  const { error } = await supabase
    .from("episode_transcripts")
    .upsert(
      {
        episode_id: episode.id,
        transcript_text: transcript.transcriptText,
        language: transcript.language,
        source: transcript.source,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "episode_id" },
    );

  if (error) throw error;

  return {
    transcript: {
      transcript_text: transcript.transcriptText,
      language: transcript.language,
      source: transcript.source,
      fetched_at: new Date().toISOString(),
    },
    error: null,
  };
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

    const { action = "ask", videoId, message } = await req.json();
    if (!videoId || typeof videoId !== "string") {
      return jsonResponse({ error: "videoId is required." }, 400);
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
        canPrepareTranscript: isYouTubeUrl(context.episode.url),
        transcriptSource: context.transcript?.source || null,
      });
    }

    if (action === "prepare-transcript") {
      if (context.transcript?.transcript_text?.trim()) {
        return jsonResponse({
          hasTranscript: true,
          transcriptSource: context.transcript.source || null,
          message: "Transcript is already ready.",
        });
      }

      const prepared = await prepareTranscript(supabase, context.episode);
      if (!prepared.transcript) {
        return jsonResponse({ error: prepared.error, hasTranscript: false }, 409);
      }

      return jsonResponse({
        hasTranscript: true,
        transcriptSource: prepared.transcript.source || null,
        message: "Transcript is ready. You can now ask this video.",
      });
    }

    if (!lovableApiKey) {
      return jsonResponse({ error: "AI provider is not configured." }, 500);
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return jsonResponse({ error: "A question is required." }, 400);
    }

    let transcriptRecord = context.transcript;
    if (!transcriptRecord?.transcript_text?.trim()) {
      const prepared = await prepareTranscript(supabase, context.episode);
      transcriptRecord = prepared.transcript;

      if (!transcriptRecord?.transcript_text?.trim()) {
        return jsonResponse(
          {
            error:
              prepared.error ||
              "This video does not have an available transcript yet, so Ask this video cannot provide source-grounded answers.",
          },
          409,
        );
      }
    }

    const transcriptText = transcriptRecord.transcript_text.trim();
    const trimmedMessage = message.trim().slice(0, 2000);
    const priorMessages = (await fetchMessages(supabase, sessionId)).slice(-8);

    await supabase.from("video_chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      video_id: videoId,
      role: "user",
      content: trimmedMessage,
    });

    const transcriptContext = selectTranscriptContext(transcriptText, trimmedMessage);
    const insightsContext = buildInsightsContext(context.lessons, context.callouts, context.insights);

    const systemPrompt = `You are a transcript-grounded startup analyst for Founder Lessons.
Answer only from the selected video's transcript and extracted app insights. Do not claim the investor, founder, operator, or expert personally reviewed the user's startup. Do not imply endorsement, affiliation, partnership, cap-table access, or private network access.

For every answer:
- Separate what the video explicitly says from your interpretation and startup-specific application when useful.
- If the transcript does not support an answer, say that clearly and ask for the missing startup context or a different source.
- Avoid inventing names, facts, metrics, quotes, or advice not grounded in the provided transcript/context.
- Keep answers concise, tactical, and useful to a founder.`;

    const userPrompt = `Video metadata:
Title: ${context.episode.title}
People/companies listed by the app: ${context.episode.founder_names || "Not specified"}
URL: ${context.episode.url}

${insightsContext ? `${insightsContext}\n\n` : ""}Transcript context selected for this question:
${transcriptContext}

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
          transcript_source: transcriptRecord?.source || null,
          transcript_chars_used: transcriptContext.length,
        },
      })
      .select("id, role, content, created_at")
      .single();

    if (insertError) throw insertError;

    return jsonResponse({ sessionId, message: assistantMessage });
  } catch (error) {
    console.error("Error in video-chat:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown video chat error." },
      500,
    );
  }
});
