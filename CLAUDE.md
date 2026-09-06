# CLAUDE.md

Project guidance for Claude Code.

## AI provider: Lovable gateway only

**Every AI feature in this app goes through the Lovable AI gateway**
(`https://ai.gateway.lovable.dev/v1/chat/completions`, authenticated with the
`LOVABLE_API_KEY` edge-function secret). That covers `analyze-episode`,
`video-chat`, `parse-deck`, and the two model calls inside
`generate-recommendations` — `expandQueries` (search themes) and
`generateReasons` (the "why this" line on each card).

Do not introduce another LLM provider or SDK. If a feature needs a model, route
it through the same gateway.

**Search providers are not AI providers.** `EXA_API_KEY`, `BRAVE_SEARCH_API_KEY`
and `YOUTUBE_API_KEY` are web-search APIs used by the briefing engine to *find*
candidate articles; the gateway then ranks and explains them. They are a
different category of service, not an alternative to Lovable. All three are
optional — with none configured, a briefing still fills from the curated
Inspiration Library.

## Secrets

Server-side keys are **Supabase Edge Function secrets**, never frontend env
vars. Never give one a `VITE_` prefix: Vite inlines those into the browser
bundle, which would publish the key to anyone who loads the site.

## Discovery freshness: two distinct rules

Easy to conflate, and conflating them has caused outages here:

- **Recency** — a discovered item needs its own parseable, in-window
  publication date (`is_daily_brief_content_fresh`, 365 days). Undated hits are
  rejected, even from a date-constrained vendor query, because a row persisted
  with `published_at = null` is unservable and would be counted in `item_count`
  while invisible on the page.
- **Servability** — whether a row may be shown at all
  (`is_discovery_content_servable`). Curated rows (`is_curated = true`) are
  editorial and exempt from the age rule; that is what lets the library carry
  essays from 2004.

The SQL predicates and their TypeScript mirrors in
`src/lib/dailyBriefFreshness.ts` and
`supabase/functions/_shared/discovery/recency.ts` must stay in agreement.

## Tests

```bash
npm test              # deno task test — shared edge-function modules + src/lib
npm run test:discovery # narrower loop: discovery modules + src/lib
npm run test:rls      # psql against a local stack; prints a PASS line per check
npm run lint
```

`npm test` needs Deno (`npm i -g deno`). The RLS suite needs a running Postgres
with the migrations applied.
