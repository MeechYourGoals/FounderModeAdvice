import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_analyses",
  title: "List analyses",
  description:
    "List the signed-in user's analyzed sources (videos, decks, documents), newest first. Optionally filter by topic or title text.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Match against the source title."),
    topic: z.string().trim().min(1).optional().describe("Filter by a topic tag, e.g. 'marketing'."),
    limit: z.number().int().min(1).max(50).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, topic, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("episodes")
      .select(
        "id, title, url, platform, source_type, founders, topics, analysis_status, created_at",
      )
      .eq("analyzed_by", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (query) request = request.ilike("title", `%${query}%`);
    if (topic) request = request.contains("topics", [topic]);

    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { analyses: data ?? [] },
    };
  },
});
