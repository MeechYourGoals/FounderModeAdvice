import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_analysis",
  title: "Get analysis",
  description:
    "Get one analyzed source the signed-in user can access, with its extracted lessons and personalized insights.",
  inputSchema: {
    analysis_id: z.string().uuid().describe("Analysis (episode) id from list_analyses."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ analysis_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select(
        "id, title, url, platform, source_type, founders, topics, custom_prompt, analysis_status, created_at",
      )
      .eq("id", analysis_id)
      .maybeSingle();

    if (episodeError) {
      return { content: [{ type: "text", text: episodeError.message }], isError: true };
    }
    if (!episode) {
      return {
        content: [{ type: "text", text: "No analysis found with that id, or access denied." }],
        isError: true,
      };
    }

    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select(
        "id, lesson_text, category, founder_attribution, impact_score, actionability_score, personalized_insights(personalized_text, action_items, relevance_score)",
      )
      .eq("episode_id", analysis_id)
      .order("impact_score", { ascending: false });

    if (lessonsError) {
      return { content: [{ type: "text", text: lessonsError.message }], isError: true };
    }

    const payload = { ...episode, lessons: lessons ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
