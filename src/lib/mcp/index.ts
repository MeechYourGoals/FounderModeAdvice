import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAnalysesTool from "./tools/list-analyses";
import getAnalysisTool from "./tools/get-analysis";
import searchLessonsTool from "./tools/search-lessons";
import listStartupProfilesTool from "./tools/list-startup-profiles";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (inlined at build time, so this stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "founder-mode-advisor",
  title: "Founder Mode Advisor",
  version: "0.1.0",
  instructions:
    "Tools for Founder Mode Advisor. Use `list_analyses` to browse the user's analyzed videos, decks, and documents, `get_analysis` for one source's extracted lessons and personalized insights, `search_lessons` to find operating lessons by topic, and `list_startup_profiles` for the user's business context. All tools act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listAnalysesTool, getAnalysisTool, searchLessonsTool, listStartupProfilesTool],
});
