import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

const jsonError = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let filePath: string | null = null;

  try {
    // ---- AuthN: require a valid JWT ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Authentication required", 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonError("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl : "";
    if (!fileUrl) return jsonError("fileUrl is required", 400);
    if (fileUrl.length > 1024) return jsonError("Invalid fileUrl", 400);

    // ---- AuthZ: file must be inside the caller's own folder ----
    if (!fileUrl.startsWith(`${user.id}/`)) {
      return jsonError("Forbidden", 403);
    }
    filePath = fileUrl;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("parse-deck: LOVABLE_API_KEY not configured");
      return jsonError("Service temporarily unavailable", 503);
    }

    const lowerPath = fileUrl.toLowerCase();
    if (lowerPath.endsWith(".ppt") || lowerPath.endsWith(".pptx")) {
      return jsonError(
        "PowerPoint files aren't supported yet — please export your deck as a PDF and upload that instead.",
        400,
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("startup-decks")
      .download(fileUrl);

    if (downloadError || !fileData) {
      console.error("parse-deck download error:", downloadError);
      return jsonError("Could not read uploaded file", 400);
    }

    const buffer = await fileData.arrayBuffer();
    const base64Pdf = arrayBufferToBase64(buffer);
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an expert at analyzing startup pitch decks. Produce a comprehensive narrative summary from the actual deck content. Only state facts present in the deck — do not invent metrics, numbers, team members, or claims.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Read this pitch deck and write a comprehensive 2-3 paragraph summary covering:
- What the company does (product/service, value proposition)
- Their market, target audience, and competitive positioning
- Stage, traction, metrics, and team highlights
- Any key challenges, growth plans, or strategic priorities mentioned

Write in third person. Be specific with any numbers or data points found in the deck. If something isn't mentioned, omit it — do not make it up.`,
                },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      },
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return jsonError("Too many requests. Please try again shortly.", 429);
      if (aiResponse.status === 402) return jsonError("Analysis service temporarily unavailable.", 503);
      const errorText = await aiResponse.text();
      console.error("parse-deck AI gateway error:", aiResponse.status, errorText);
      return jsonError("Failed to analyze deck. Please try again.", 502);
    }

    const aiResult = await aiResponse.json();
    const summary = aiResult.choices?.[0]?.message?.content || "";
    if (!summary) return jsonError("Failed to analyze deck. Please try again.", 502);

    if (filePath) {
      supabase.storage.from("startup-decks").remove([filePath]).catch(() => {});
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-deck error:", e);
    if (filePath) {
      supabase.storage.from("startup-decks").remove([filePath]).catch(() => {});
    }
    return jsonError("Failed to analyze deck. Please try again.", 500);
  }
});
