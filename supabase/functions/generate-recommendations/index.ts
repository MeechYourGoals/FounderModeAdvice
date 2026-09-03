// Weekly personalized discovery.
//
// Two callers, one pipeline:
//   • Scheduler — pg_cron sends `x-cron-secret` and this drains a bounded batch
//     of profiles that still need the current week's edition. Run it as often
//     as you like: the UNIQUE (profile_id, week_key) claim makes repeat runs
//     no-ops, so "process 25, come back in 10 minutes" is the whole design.
//   • A signed-in Boardroom user — sends `{ profileId }` with their JWT to
//     refresh one profile they own, behind a rate limit.
//
// Per profile:
//   claim week slot → context → query plan → providers → rank/dedupe/select
//   → evergreen fill if short → persist content + recommendations
//   → one batched "why this" model call
//
// Cost shape: at most two model calls per profile (query expansion + reasons),
// a bounded number of provider calls, and zero page fetches. The expensive
// path — transcripts, scraping, full analysis — only runs later, when the user
// actually presses Analyze.
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET.
// Optional: LOVABLE_API_KEY (reasons + sharper queries),
// EXA_API_KEY, YOUTUBE_API_KEY, ONESIGNAL_APP_ID + ONESIGNAL_REST_API_KEY.
// With no optional keys the job still runs, filling each edition from the
// curated library.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildRecommendationContext,
  profileFingerprint,
  type RecommendationContext,
  type StartupProfileRow,
} from "../_shared/discovery/context.ts";
import { buildQueryPlan, expandQueries, type DiscoveryQuery } from "../_shared/discovery/queries.ts";
import {
  createEvergreenFill,
  resolveProviders,
  toResult,
  type DiscoveryProvider,
  type DiscoveryResult,
} from "../_shared/discovery/providers.ts";
import { filterBriefingEligible } from "../_shared/discovery/recency.ts";
import {
  contextTerms,
  scoreCandidate,
  selectRecommendations,
  type ScoredCandidate,
} from "../_shared/discovery/ranking.ts";
import { fallbackReason, generateReasons } from "../_shared/discovery/reasons.ts";
import { isoWeekKey } from "../_shared/discovery/week.ts";
import { sendPush } from "../_shared/oneSignal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---- Cost ceilings. A malfunctioning scheduler cannot outspend these. -------
const envInt = (name: string, fallback: number, hardMax: number): number => {
  const raw = Number(Deno.env.get(name));
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), hardMax);
};

const RECOMMENDATIONS_PER_BATCH = envInt("DISCOVERY_ITEMS_PER_BATCH", 10, 20);
const MAX_PROFILES_PER_RUN = envInt("DISCOVERY_MAX_PROFILES_PER_RUN", 25, 100);
const MAX_QUERIES_PER_PROFILE = envInt("DISCOVERY_MAX_QUERIES_PER_PROFILE", 10, 20);
const MAX_CANDIDATES_PER_PROFILE = 150;
const RESULTS_PER_QUERY = 10;
/** Whole-run ceiling on outbound provider calls, across every profile. */
const MAX_PROVIDER_CALLS_PER_RUN = envInt("DISCOVERY_MAX_PROVIDER_CALLS", 400, 1000);
/** Manual refreshes allowed per profile per rolling day. */
const MANUAL_REFRESH_PER_DAY = 2;

interface RunStats {
  providerCalls: number;
}

// ---------------------------------------------------------------------------
// Context cache
// ---------------------------------------------------------------------------

async function loadOrBuildContext(
  supabase: ReturnType<typeof createClient>,
  profile: StartupProfileRow,
): Promise<RecommendationContext> {
  const fingerprint = profileFingerprint(profile);

  const { data: cached } = await supabase
    .from("profile_recommendation_contexts")
    .select("context, profile_fingerprint")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (cached?.profile_fingerprint === fingerprint && cached?.context) {
    return cached.context as RecommendationContext;
  }

  const context = buildRecommendationContext(profile);
  const { error } = await supabase.from("profile_recommendation_contexts").upsert(
    {
      profile_id: profile.id,
      user_id: profile.user_id,
      context,
      profile_fingerprint: fingerprint,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
  if (error) console.warn("[discovery] could not cache context:", error.message);
  return context;
}

// ---------------------------------------------------------------------------
// Candidate gathering
// ---------------------------------------------------------------------------

/**
 * Runs the query plan across every configured provider. A provider that throws,
 * times out, or is over quota contributes nothing and the run continues — one
 * failing source must never take down the whole edition.
 */
async function gatherCandidates(
  providers: DiscoveryProvider[],
  plan: DiscoveryQuery[],
  stats: RunStats,
): Promise<DiscoveryResult[]> {
  const candidates: DiscoveryResult[] = [];
  const usedByProvider = new Map<string, number>();

  for (const query of plan) {
    if (candidates.length >= MAX_CANDIDATES_PER_PROFILE) break;
    for (const provider of providers) {
      if (stats.providerCalls >= MAX_PROVIDER_CALLS_PER_RUN) return candidates;
      if (!provider.supports(query.intent)) continue;
      const used = usedByProvider.get(provider.id) ?? 0;
      if (used >= provider.maxQueriesPerRun) continue;

      usedByProvider.set(provider.id, used + 1);
      stats.providerCalls += 1;
      try {
        const results = await provider.search(query, { limit: RESULTS_PER_QUERY });
        candidates.push(...results);
      } catch (error) {
        console.warn(`[discovery] provider ${provider.id} failed:`, error);
      }
    }
  }
  return candidates.slice(0, MAX_CANDIDATES_PER_PROFILE);
}

/** Curated library rows, shaped like provider results. */
function curatedLoader(supabase: ReturnType<typeof createClient>, ctx: RecommendationContext) {
  return async (limit: number): Promise<DiscoveryResult[]> => {
    // Prefer items tagged with one of this profile's categories, then fill from
    // the highest-priority curated items so the list is never empty.
    //
    // Deliberately unfiltered by date: these rows are editorial and timeless
    // (Paul Graham on ideas, Steve Blank on customer development). A recency
    // filter here is what emptied the library and, with it, every briefing.
    const select =
      "url, canonical_url, content_key, title, description, image_url, publisher, author, published_at, content_type, duration_seconds, language, categories";
    const [tagged, general] = await Promise.all([
      supabase
        .from("discovery_content")
        .select(select)
        .eq("active", true)
        .eq("is_curated", true)
        .overlaps("categories", ctx.categories.length > 0 ? ctx.categories : ["Startups"])
        .order("priority", { ascending: false })
        .limit(limit),
      supabase
        .from("discovery_content")
        .select(select)
        .eq("active", true)
        .eq("is_curated", true)
        .order("priority", { ascending: false })
        .limit(limit),
    ]);

    const rows = [...(tagged.data ?? []), ...(general.data ?? [])] as Array<Record<string, unknown>>;
    const seen = new Set<string>();
    const out: DiscoveryResult[] = [];
    rows.forEach((row) => {
      const key = String(row.content_key ?? "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      const result = toResult({
        url: row.canonical_url ?? row.url,
        title: row.title,
        description: row.description,
        publisher: row.publisher,
        author: row.author,
        publishedAt: row.published_at as string | undefined,
        imageUrl: row.image_url,
        contentType: row.content_type as DiscoveryResult["contentType"],
        durationSeconds: (row.duration_seconds as number | null) ?? null,
        language: row.language,
        providerId: "curated",
        recencyBasis: "evergreen",
        rank: out.length,
        intent: "evergreen",
        label: Array.isArray(row.categories) ? (row.categories[0] as string) : undefined,
      });
      if (result) out.push(result);
    });
    return out.slice(0, limit);
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Upsert the selected items into the shared catalog and return their ids. */
async function persistContent(
  supabase: ReturnType<typeof createClient>,
  picked: ScoredCandidate[],
): Promise<Map<string, string>> {
  const rows = picked.map(({ result }) => ({
    url: result.url,
    canonical_url: result.canonicalUrl,
    content_key: result.contentKey,
    title: result.title,
    description: result.description,
    image_url: result.imageUrl,
    publisher: result.publisher,
    author: result.author,
    published_at: result.publishedAt,
    content_type: result.contentType,
    duration_seconds: result.durationSeconds,
    language: result.language,
    source: result.providerId,
    updated_at: new Date().toISOString(),
  }));

  // ignoreDuplicates keeps curated rows (and their editor-set categories,
  // priority, featured flags) authoritative when discovery rediscovers them.
  const { error } = await supabase
    .from("discovery_content")
    .upsert(rows, { onConflict: "content_key", ignoreDuplicates: true });
  if (error) throw new Error(`Could not persist discovery content: ${error.message}`);

  const keys = picked.map((p) => p.result.contentKey);
  const { data, error: readError } = await supabase
    .from("discovery_content")
    .select("id, content_key")
    .in("content_key", keys);
  if (readError) throw new Error(`Could not read discovery content: ${readError.message}`);

  return new Map((data ?? []).map((row: Record<string, unknown>) => [String(row.content_key), String(row.id)]));
}

// ---------------------------------------------------------------------------
// One profile, end to end
// ---------------------------------------------------------------------------

interface ProfileOutcome {
  profileId: string;
  status: "created" | "skipped" | "failed" | "empty";
  itemCount?: number;
  reason?: string;
  batchId?: string;
  userId?: string;
  /** What the run actually did, so the client can explain an empty edition. */
  stats?: Record<string, unknown>;
  /** Provider ids that were configured, even if they returned nothing. */
  providersConfigured?: string[];
  /** True when a fruitless manual refresh left the previous edition in place. */
  retainedExistingEdition?: boolean;
}

async function generateForProfile(
  supabase: ReturnType<typeof createClient>,
  profile: StartupProfileRow,
  options: { weekKey: string; source: "scheduled" | "manual"; stats: RunStats },
): Promise<ProfileOutcome> {
  const { weekKey, source, stats } = options;
  const userId = profile.user_id;
  if (!userId) return { profileId: profile.id, status: "skipped", reason: "orphan profile" };

  // Claim the week slot first. The UNIQUE (profile_id, week_key) constraint
  // makes this the idempotency gate: a concurrent or repeat scheduled run loses
  // the race and does no work at all, so no duplicate edition and no duplicate
  // spend. A manual refresh deliberately reuses the row it collides with —
  // it is replacing this week's edition, not adding a second one.
  const { data: batch, error: claimError } = await supabase
    .from("recommendation_batches")
    .insert({
      user_id: userId,
      profile_id: profile.id,
      week_key: weekKey,
      status: "pending",
      generation_source: source,
      // Manual refreshes are user-initiated, so they never earn a push.
      notified_at: source === "manual" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  let batchId: string;
  if (claimError) {
    if (claimError.code !== "23505") {
      return { profileId: profile.id, status: "failed", reason: claimError.message };
    }
    if (source !== "manual") {
      return { profileId: profile.id, status: "skipped", reason: "already generated this week" };
    }
    const { data: existing } = await supabase
      .from("recommendation_batches")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("week_key", weekKey)
      .maybeSingle();
    if (!existing) {
      return { profileId: profile.id, status: "failed", reason: "could not claim week slot" };
    }
    batchId = String(existing.id);
  } else {
    batchId = String(batch.id);
  }

  try {
    const context = await loadOrBuildContext(supabase, profile);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const expanded = lovableApiKey
      ? await expandQueries(context, { apiKey: lovableApiKey })
      : [];
    const plan = buildQueryPlan(context, expanded, MAX_QUERIES_PER_PROFILE);

    // Discovery uses Exa + YouTube only. Brave is intentionally not wired.
    const providers = resolveProviders({
      youTubeApiKey: Deno.env.get("YOUTUBE_API_KEY"),
      exaApiKey: Deno.env.get("EXA_API_KEY"),
    });

    const evergreenFill = createEvergreenFill(curatedLoader(supabase, context));

    const gatheredCandidates = await gatherCandidates(providers, plan, stats);
    const candidates = filterBriefingEligible(gatheredCandidates);
    const rejectedMissingDate = gatheredCandidates.filter((candidate) => !candidate.publishedAt).length;
    const rejectedStaleOrFuture = gatheredCandidates.length - candidates.length - rejectedMissingDate;

    // Novelty: what this profile has already been shown, so a repeat is pushed
    // far down rather than filling the new edition. Bounded and ordered newest
    // first — recent history is what weekly duplication actually depends on,
    // and the cap is deliberately about a year deep so a genuinely evergreen
    // resource can resurface eventually.
    const { data: seenRows } = await supabase
      .from("profile_recommendations")
      .select("created_at, discovery_content!inner(content_key)")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(500);
    const seenContentKeys = new Set<string>(
      (seenRows ?? [])
        .map((row: Record<string, unknown>) =>
          String((row.discovery_content as { content_key?: string } | null)?.content_key ?? ""),
        )
        .filter(Boolean),
    );

    const terms = contextTerms(context);
    const scored = candidates.map((result) =>
      scoreCandidate(result, context, terms, { seenContentKeys }),
    );
    const selectOptions = {
      limit: RECOMMENDATIONS_PER_BATCH,
      maxPerHost: 2,
      // Soft format mix: no single type may take more than ~40% of an edition.
      maxPerContentType: Math.max(2, Math.ceil(RECOMMENDATIONS_PER_BATCH * 0.4)),
    };
    const rankedPicks = selectRecommendations(scored, selectOptions);
    // Defense immediately before persistence/LLM reasoning. This is intentionally
    // redundant with candidate admission: no future ranking or fallback change
    // may turn an ineligible candidate into a persisted recommendation.
    const timelyPicks = rankedPicks.filter(
      (candidate) => filterBriefingEligible([candidate.result]).length === 1,
    );
    if (timelyPicks.length !== rankedPicks.length) {
      console.error("[discovery] daily_brief_freshness_violation", {
        rejectedAtPersistence: rankedPicks.length - timelyPicks.length,
      });
    }

    // ---- Tier 2: evergreen fill ------------------------------------------
    //
    // Live search can be thin (a quiet week), unconfigured (no provider keys),
    // or down. None of those should hand the user a blank page when there is a
    // curated library sitting right there. Fill runs through the same scorer,
    // so the previously-seen penalty still suppresses repeats and an item the
    // profile has already been shown loses to one it has not.
    //
    // The cap is asymmetric on purpose: a first edition may be entirely
    // evergreen — a brand-new profile has seen nothing, and ten genuinely good
    // essays is a fine first briefing. After that, fill is capped at half, so a
    // provider outage shows up as a visibly short edition rather than a full one
    // of re-runs the user has already read.
    const fillNeeded = RECOMMENDATIONS_PER_BATCH - timelyPicks.length;
    let fillPicks: ScoredCandidate[] = [];
    if (fillNeeded > 0) {
      const fillCap = seenContentKeys.size === 0
        ? RECOMMENDATIONS_PER_BATCH
        : Math.ceil(RECOMMENDATIONS_PER_BATCH * 0.5);
      const want = Math.min(fillNeeded, fillCap);
      if (want > 0) {
        const pickedKeys = new Set(timelyPicks.map((candidate) => candidate.result.contentKey));
        const fillCandidates = (await evergreenFill(want * 3))
          .filter((result) => !pickedKeys.has(result.contentKey))
          .map((result) => scoreCandidate(result, context, terms, { seenContentKeys }));
        fillPicks = selectRecommendations(fillCandidates, { ...selectOptions, limit: want });
      }
    }

    // Timely first, so the featured card is a live find whenever there is one.
    const picked = [...timelyPicks, ...fillPicks];

    const providersConfigured = providers.map((provider) => provider.id);
    // Everything the UI needs to say WHY an edition looks the way it does,
    // rather than falling back on "still gathering" for every failure mode.
    // Counts and provider ids only, plus the searches — which derive from the
    // owner's own profile and are shown back to them in the app.
    const baseStats = {
      queries: plan.length,
      providers_configured: providersConfigured,
      query_plan: plan.slice(0, 10).map((query) => ({ q: query.query, intent: query.intent })),
      context_terms: terms.slice(0, 12),
      daily_brief_candidates_total: gatheredCandidates.length,
      daily_brief_candidates_rejected_stale: rejectedStaleOrFuture,
      daily_brief_candidates_rejected_missing_date: rejectedMissingDate,
      daily_brief_candidates_eligible: candidates.length,
    };

    if (picked.length === 0) {
      // A fruitless manual refresh must not destroy the edition the user
      // already had, so an existing batch with items is left exactly as it is.
      if (source === "manual") {
        const { data: existingItems } = await supabase
          .from("profile_recommendations")
          .select("id")
          .eq("batch_id", batchId)
          .limit(1);
        if (existingItems && existingItems.length > 0) {
          return {
            profileId: profile.id,
            status: "empty",
            batchId,
            userId,
            reason: "nothing new found",
            stats: { ...baseStats, selected: 0, evergreen_fill: 0 },
            providersConfigured,
            retainedExistingEdition: true,
          };
        }
      }
      const emptyStats = {
        ...baseStats,
        selected: 0,
        evergreen_fill: 0,
        daily_brief_oldest_item_age_days: null,
        daily_brief_freshness_violation: 0,
      };
      await supabase
        .from("recommendation_batches")
        .update({ status: "empty", item_count: 0, generation_stats: emptyStats })
        .eq("id", batchId);
      return {
        profileId: profile.id,
        status: "empty",
        batchId,
        userId,
        stats: emptyStats,
        providersConfigured,
      };
    }

    const contentIds = await persistContent(supabase, picked);

    const reasons = lovableApiKey
      ? await generateReasons(
          picked.map((p) => ({ contentKey: p.result.contentKey, result: p.result })),
          context,
          { apiKey: lovableApiKey },
        )
      : new Map<string, string>();

    const rows = picked
      .map((candidate, index) => {
        const contentId = contentIds.get(candidate.result.contentKey);
        if (!contentId) return null;
        return {
          batch_id: batchId,
          user_id: userId,
          profile_id: profile.id,
          content_id: contentId,
          position: index,
          score: candidate.breakdown.total,
          score_breakdown: candidate.breakdown,
          reason: reasons.get(candidate.result.contentKey) ?? fallbackReason(candidate.result, context),
          state: "unseen",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    // Only now, with a full new edition in hand, is the old one replaced.
    if (source === "manual") {
      await supabase.from("profile_recommendations").delete().eq("batch_id", batchId);
    }

    const { error: insertError } = await supabase
      .from("profile_recommendations")
      .upsert(rows, { onConflict: "batch_id,content_id", ignoreDuplicates: true });
    if (insertError) throw new Error(`Could not save recommendations: ${insertError.message}`);

    // Age of the oldest DATED, non-evergreen pick. Evergreen fill is excluded by
    // design (a 2004 essay is not a freshness violation), and an edition made
    // entirely of fill reports null rather than the NaN a bare Math.max over an
    // empty list would produce — this is the metric the recency invariant is
    // monitored by, so it has to stay a number or an honest null.
    const datedAges = picked
      .filter((candidate) => candidate.result.recencyBasis !== "evergreen" && candidate.result.publishedAt)
      .map((candidate) => (Date.now() - Date.parse(candidate.result.publishedAt!)) / 86_400_000)
      .filter((age) => Number.isFinite(age));

    const readyStats = {
      ...baseStats,
      candidates: candidates.length,
      selected: rows.length,
      evergreen_fill: fillPicks.length,
      providers: [...new Set(picked.map((candidate) => candidate.result.providerId))],
      reasons_generated: reasons.size,
      daily_brief_oldest_item_age_days: datedAges.length > 0 ? Math.max(...datedAges) : null,
      daily_brief_freshness_violation: rankedPicks.length - timelyPicks.length,
    };

    await supabase
      .from("recommendation_batches")
      .update({
        status: "ready",
        item_count: rows.length,
        generation_source: source,
        error_message: null,
        generation_stats: readyStats,
      })
      .eq("id", batchId);

    return {
      profileId: profile.id,
      status: "created",
      itemCount: rows.length,
      batchId,
      userId,
      stats: readyStats,
      providersConfigured,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[discovery] profile ${profile.id} failed:`, message);
    // The batch row stays, marked failed, so next week's run is unaffected and
    // the failure is visible. Manual refresh can clear it (see DELETE below).
    await supabase
      .from("recommendation_batches")
      .update({ status: "failed", error_message: message.slice(0, 500) })
      .eq("id", batchId);
    return { profileId: profile.id, status: "failed", reason: message, batchId };
  }
}

// ---------------------------------------------------------------------------
// Notification — one push per ready batch, never one per article.
// ---------------------------------------------------------------------------

async function notifyReadyBatches(supabase: ReturnType<typeof createClient>): Promise<number> {
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!appId || !apiKey) return 0;

  const { data: pending } = await supabase
    .from("recommendation_batches")
    .select("id, user_id, item_count, profile_id, user_startup_profiles!inner(company_name)")
    .is("notified_at", null)
    .eq("status", "ready")
    .limit(50);

  if (!pending || pending.length === 0) return 0;

  // Only push to users who opted in, using the same prefs table as the daily prompt.
  const userIds = [...new Set(pending.map((b: Record<string, unknown>) => String(b.user_id)))];
  const { data: prefs } = await supabase
    .from("user_notification_prefs")
    .select("user_id")
    .in("user_id", userIds)
    .eq("daily_prompt", true);
  const optedIn = new Set((prefs ?? []).map((p: Record<string, unknown>) => String(p.user_id)));

  let sent = 0;
  for (const batch of pending as Array<Record<string, unknown>>) {
    const userId = String(batch.user_id);
    const batchId = String(batch.id);
    if (optedIn.has(userId)) {
      const company =
        (batch.user_startup_profiles as { company_name?: string } | null)?.company_name ?? "your company";
      try {
        await sendPush({
          appId,
          apiKey,
          externalIds: [userId],
          heading: "Your weekly Founder Briefing",
          content: `${batch.item_count} recommendations for ${company} are ready.`,
          path: "/discover?utm_source=push&utm_campaign=weekly_discovery",
          idempotencyKey: batchId,
        });
        sent += 1;
      } catch (error) {
        console.warn("[discovery] notification failed:", error);
      }
    }
    // Stamp regardless of opt-in/send result: this batch has had its one shot.
    await supabase
      .from("recommendation_batches")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", batchId);
  }
  return sent;
}

// ---------------------------------------------------------------------------

const PROFILE_COLUMNS =
  "id, user_id, company_name, company_website, description, industry, stage, role, funding_raised, valuation, employee_count, deck_summary";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const weekKey = isoWeekKey();
  const stats: RunStats = { providerCalls: 0 };

  // ---- Scheduled run -------------------------------------------------------
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  if (providedSecret) {
    // Fails closed: a scheduler header with no configured secret is rejected.
    if (!cronSecret || providedSecret !== cronSecret) return json({ error: "Unauthorized" }, 401);

    try {
      const { data: due, error } = await supabase.rpc("list_profiles_needing_recommendations", {
        _week_key: weekKey,
        _limit: MAX_PROFILES_PER_RUN,
      });
      if (error) throw error;

      const outcomes: ProfileOutcome[] = [];
      for (const row of (due ?? []) as Array<{ profile_id: string }>) {
        const { data: profile } = await supabase
          .from("user_startup_profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", row.profile_id)
          .maybeSingle();
        // Deleted between listing and processing — skip, don't fail the run.
        if (!profile) {
          outcomes.push({ profileId: row.profile_id, status: "skipped", reason: "profile removed" });
          continue;
        }
        outcomes.push(
          await generateForProfile(supabase, profile as StartupProfileRow, {
            weekKey, source: "scheduled", stats,
          }),
        );
      }

      const notified = await notifyReadyBatches(supabase);

      return json({
        weekKey,
        processed: outcomes.length,
        created: outcomes.filter((o) => o.status === "created").length,
        skipped: outcomes.filter((o) => o.status === "skipped").length,
        failed: outcomes.filter((o) => o.status === "failed").length,
        empty: outcomes.filter((o) => o.status === "empty").length,
        providerCalls: stats.providerCalls,
        notified,
        // Non-zero means more profiles are waiting: the next cron tick drains them.
        moreLikelyPending: outcomes.length >= MAX_PROFILES_PER_RUN,
      });
    } catch (error) {
      console.error("[discovery] scheduled run failed:", error);
      return json({ error: "Scheduled run failed" }, 500);
    }
  }

  // ---- Manual refresh (user JWT) -------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authentication required" }, 401);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { profileId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
  if (!profileId) return json({ error: "profileId is required" }, 400);

  // Ownership, then entitlement — both server-side. The client gate is UX only.
  const { data: profile } = await supabase
    .from("user_startup_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", profileId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return json({ error: "You can only refresh profiles you own." }, 403);

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subscription?.tier !== "series_z") {
    return json(
      {
        error: "Personalized discovery is part of The Boardroom plan.",
        upgradeRequired: true,
      },
      403,
    );
  }

  const { data: allowed, error: rateError } = await supabase.rpc("check_and_increment_rate_limit", {
    _user_id: user.id,
    _key: `discovery_refresh:${profileId}`,
    _window: "24 hours",
    _limit: MANUAL_REFRESH_PER_DAY,
  });
  if (rateError) console.warn("[discovery] rate limit check failed:", rateError.message);
  if (allowed === false) {
    return json(
      { error: "You've already refreshed this profile's recommendations today. Try again tomorrow." },
      429,
    );
  }

  // A manual refresh replaces this week's edition in place: generateForProfile
  // reuses the existing batch row and only swaps its items once a full new set
  // has been selected, so a fruitless refresh leaves what the user had intact.
  const outcome = await generateForProfile(supabase, profile as StartupProfileRow, {
    weekKey, source: "manual", stats,
  });

  if (outcome.status === "failed") {
    return json({ error: "Could not refresh recommendations. Please try again." }, 502);
  }

  // Refund the allowance when no work was performed. The rule is deliberately
  // "nothing was called", not "nothing was found": a refresh that queried
  // providers and came back empty still spent money and still counts. But two
  // presses against a deployment with no provider keys used to cost a user
  // their whole day for a run that could never have returned anything.
  if (stats.providerCalls === 0 && (outcome.itemCount ?? 0) === 0) {
    const { error: refundError } = await supabase.rpc("refund_rate_limit", {
      _user_id: user.id,
      _key: `discovery_refresh:${profileId}`,
      _window: "24 hours",
    });
    if (refundError) console.warn("[discovery] rate limit refund failed:", refundError.message);
  }

  await supabase
    .from("profile_recommendation_contexts")
    .update({ last_manual_refresh_at: new Date().toISOString() })
    .eq("profile_id", profileId);

  return json({
    weekKey,
    batchId: outcome.batchId,
    status: outcome.status,
    itemCount: outcome.itemCount ?? 0,
    // Owner-scoped counts, provider ids, and the searches run for this profile.
    // Lets the client say why an edition is empty instead of guessing.
    diagnostics: {
      ...(outcome.stats ?? {}),
      providers_configured: outcome.providersConfigured ?? [],
      retained_existing_edition: outcome.retainedExistingEdition ?? false,
    },
  });
});
