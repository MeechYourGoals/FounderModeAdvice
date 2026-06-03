import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert a binary file (ArrayBuffer) to base64 in chunks to avoid stack overflow on large PDFs.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let filePath: string | null = null;

  try {
    const { fileUrl } = await req.json();
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    filePath = fileUrl;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Only PDF is supported by the multimodal model. Reject PPT/PPTX up front
    // with a clear message so users export to PDF.
    const lowerPath = (fileUrl as string).toLowerCase();
    if (lowerPath.endsWith(".ppt") || lowerPath.endsWith(".pptx")) {
      return new Response(
        JSON.stringify({
          error:
            "PowerPoint files aren't supported yet — please export your deck as a PDF and upload that instead.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("startup-decks")
      .download(fileUrl);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Read as binary and base64-encode for multimodal input.
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
                {
                  type: "image_url",
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiResult = await aiResponse.json();
    const summary = aiResult.choices?.[0]?.message?.content || "";

    if (!summary) {
      throw new Error("AI returned empty summary");
    }

    // Best-effort cleanup of the uploaded deck — we only needed it long enough
    // to summarize. Ignore errors here so they don't mask a successful summary.
    if (filePath) {
      supabase.storage.from("startup-decks").remove([filePath]).catch(() => {});
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-deck error:", e);
    // Clean up on failure so we don't leak files in storage.
    if (filePath) {
      supabase.storage.from("startup-decks").remove([filePath]).catch(() => {});
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
