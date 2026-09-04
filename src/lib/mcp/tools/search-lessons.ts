import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_lessons",
  title: "Search lessons",
  description:
    "Search the lessons extracted from the signed-in user's analyzed sources by free text, optionally narrowed to a category.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Free text to match inside lesson content."),
    category: z.string().trim().min(1).optional().describe("Optional lesson category filter."),
    limit: z.number().int().min(1).max(50).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("lessons")
      .select(
        "id, lesson_text, category, founder_attribution, impact_score, actionability_score, episode_id, episodes!inner(id, title, url, analyzed_by)",
      )
      .eq("episodes.analyzed_by", ctx.getUserId()!)
      .ilike("lesson_text", `%${query}%`)
      .order("impact_score", { ascending: false })
      .limit(limit ?? 20);

    if (category) request = request.eq("category", category);

    const { data, error } = await request;
    if (error) {
      console.error("search_lessons query failed", error);
      return { content: [{ type: "text", text: "Could not search lessons." }], isError: true };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { lessons: data ?? [] },
    };
  },
});
