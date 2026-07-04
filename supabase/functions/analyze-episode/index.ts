import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getVideoContext, deriveChannelHandle } from "../_shared/transcript.ts";

// Canonical topic vocabulary (keep in sync with src/lib/topics.ts).
const CANONICAL_TOPICS = [
  "Marketing","Sales","Fundraising","Hiring","Competitors","Product","Growth","Operations",
  "Leadership","AI","Engineering","Design","Pricing","Distribution","Community",
  "Bootstrapping","Enterprise","Brand","Product-Market Fit","Strategy","Culture",
] as const;
const TOPIC_SET = new Set(CANONICAL_TOPICS.map((t) => t.toLowerCase()));
const normalizeTopics = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const clean = item.trim().replace(/^#/, "");
    const match = CANONICAL_TOPICS.find((t) => t.toLowerCase() === clean.toLowerCase());
    if (match) out.add(match);
  }
  return Array.from(out).slice(0, 3);
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// YouTube caption extraction and other-platform transcript fetching now live in
// supabase/functions/_shared/transcript.ts via getVideoContext().



// Tier limits configuration (keep in sync with src/types/subscription.ts)
// free = 3/mo, seed = "The C-Suite" 20/mo, series_z = "The Boardroom" unlimited.
const TIER_LIMITS = {
  free: { analyses: 3 },
  seed: { analyses: 20 },
  series_z: { analyses: 999999 },
} as const;

/** Founder/Super Admin emails with unlimited access - no feature limits */
const FOUNDER_EMAILS = ['ccamechi@gmail.com'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ---- AuthN required ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUserFromToken }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUserFromToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authenticatedUserId: string = authUserFromToken.id;

    const { episodeUrl, podcastName, startupProfile, startupProfileId } = await req.json();
    console.log('Analyzing episode:', {
      episodeUrl,
      podcastName,
      hasProfile: !!startupProfile,
      startupProfileId: startupProfileId || null,
      userId: authenticatedUserId,
    });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!episodeUrl || typeof episodeUrl !== 'string') {
      throw new Error('Episode URL is required');
    }
    if (episodeUrl.length > 2048) {
      throw new Error('Episode URL too long');
    }
    if (podcastName && (typeof podcastName !== 'string' || podcastName.length > 200)) {
      throw new Error('Invalid podcast name');
    }

    // Validate URL format and allowed domains
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(episodeUrl);
    } catch {
      throw new Error('Invalid URL format. Please provide a valid video link.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol — must be http or https.');
    }
    // Multi-platform: any public http(s) video URL is accepted. The shared adapter
    // detects the platform (YouTube, TikTok, Instagram, X, Vimeo, LinkedIn, podcast, generic)
    // and pulls a transcript via free YouTube captions or Supadata for everything else.

    let resolvedStartupProfile = startupProfile;
    let resolvedStartupProfileId: string | null = null;
    let resolvedStartupProfileNameSnapshot: string | null = null;

    // Canonical server-side profile resolution and ownership enforcement.
    if (typeof startupProfileId === 'string' && startupProfileId.trim().length > 0) {
      const { data: savedProfile, error: profileError } = await supabase
        .from('user_startup_profiles')
        .select('*')
        .eq('id', startupProfileId)
        .eq('user_id', authenticatedUserId)
        .maybeSingle();

      if (profileError) {
        throw new Error('Could not validate selected profile');
      }
      if (!savedProfile) {
        return new Response(JSON.stringify({ error: 'You can only analyze for profiles you own.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      resolvedStartupProfile = savedProfile;
      resolvedStartupProfileId = savedProfile.id;
      resolvedStartupProfileNameSnapshot = savedProfile.company_name ?? null;
    }


    // Check subscription limits if we have a user (skip for Founder/Super Admin)
    if (authenticatedUserId) {
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(authenticatedUserId);
      const isFounder = authUser?.email && FOUNDER_EMAILS.includes(authUser.email.toLowerCase());

      if (!isFounder) {
        const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Get user's subscription tier
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', authenticatedUserId)
          .single();

        const tier = (subscription?.tier || 'free') as keyof typeof TIER_LIMITS;
        const maxAnalyses = TIER_LIMITS[tier]?.analyses ?? TIER_LIMITS.free.analyses;

        // Get current month usage
        const { data: usage } = await supabase
          .from('user_monthly_usage')
          .select('analyses_count')
          .eq('user_id', authenticatedUserId)
          .eq('month_year', monthYear)
          .single();

        const currentCount = usage?.analyses_count || 0;

        if (currentCount >= maxAnalyses) {
          return new Response(JSON.stringify({
            error: `You've reached your limit of ${maxAnalyses} analyses this month. Upgrade your plan for more.`,
            limitReached: true,
            currentCount,
            maxAnalyses,
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Unified multi-platform context: metadata + transcript (when obtainable).
    const videoContext = await getVideoContext(episodeUrl);
    const videoTitle = videoContext.metadata.title || '';
    const videoAuthor = videoContext.metadata.author || '';
    const transcript = videoContext.transcript
      ? {
          transcriptText: videoContext.transcript.transcriptText,
          language: videoContext.transcript.language,
          source: videoContext.transcript.source,
        }
      : null;
    console.log('Video context:', {
      platform: videoContext.platform,
      hasTitle: Boolean(videoTitle),
      hasTranscript: Boolean(transcript),
      transcriptChars: transcript?.transcriptText.length || 0,
    });


    // Optional context about the viewer's own business, used to bias examples/jargon.
    const viewerBusiness = resolvedStartupProfile && (resolvedStartupProfile.company_name || resolvedStartupProfile.industry || resolvedStartupProfile.stage)
      ? `\n\nViewer's business context (adapt examples, jargon, KPIs, and risks to THIS type of business — do NOT assume a venture-backed tech startup unless stated):
- Business: ${resolvedStartupProfile.company_name || 'Not specified'}
- Industry: ${resolvedStartupProfile.industry || 'Not specified'}
- Stage/type: ${resolvedStartupProfile.stage || 'Not specified'}
${resolvedStartupProfile.description ? `- About: ${resolvedStartupProfile.description}` : ''}`
      : '';

    // Step 2: Use AI to analyze the episode with tool calling
    const systemPrompt = `You are an expert at extracting practical business lessons from videos and podcasts for founders, operators, and business owners across every industry — including local shops, restaurants, agencies, creators, service businesses, ecommerce brands, bootstrapped companies, and venture-backed startups.

CRITICAL REQUIREMENTS:
- Extract EXACTLY 10 tactical lessons ranked by actionability and impact (each 3-4 sentences with specific context)
- Extract EXACTLY 5 business-relevant callouts (key takeaways useful to a business builder at any stage or size)
- Research and include actual company data (funding, valuation, stage, employee count) when the subject is a company; mark "Unknown" or "Not disclosed" otherwise
- Cite specific examples and stories from the speaker
- DO NOT provide mock or placeholder data
- Extract the series/source name from the episode context if not provided
- Do NOT assume the audience is raising venture capital; keep lessons applicable to many business types
- Assign relevant TAGS to each lesson (e.g., #marketing, #hiring, #operations, #pricing, #growth)`;

    const userPrompt = `Analyze this episode/video:
URL: ${episodeUrl}
Platform: ${videoContext.platform}
${videoTitle ? `Title: ${videoTitle}` : ''}
${videoAuthor ? `Creator/Channel: ${videoAuthor}` : ''}
${videoContext.metadata.description ? `Description: ${videoContext.metadata.description.slice(0, 1200)}` : ''}
${podcastName ? `Source: ${podcastName}` : 'Source: Please extract from the episode'}
${transcript?.transcriptText ? `Transcript excerpt for grounding:
${transcript.transcriptText.slice(0, 30000)}` : 'Transcript excerpt: Not available. Use the title, creator, description, and any public knowledge of this URL to extract the most useful business lessons you can. If there truly is nothing to work with, return an error rather than mock data.'}${viewerBusiness}


INSTRUCTIONS:
1. Watch/listen to the episode and extract real insights from the actual content
2. Identify the speaker(s) and the company or topic discussed
3. Research relevant metrics (funding, valuation, stage, employees, industry) when applicable
4. Extract EXACTLY 10 tactical, actionable lessons with specific context from the speaker's stories
5. Extract EXACTLY 5 business-relevant callouts useful to a builder of any business type
6. Rank lessons by actionability (1-10) and impact (1-10)
7. Include speaker attribution for each lesson
8. Assign 1-3 relevant tags to each lesson (e.g. #growth, #culture, #pricing)
9. Assign 1-3 TOPICS to the whole video, chosen ONLY from this fixed list: ${CANONICAL_TOPICS.join(", ")}
10. If you cannot access the content, return an error - do NOT provide mock data`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_episode_data",
              description: "Extract structured data from podcast episode",
              parameters: {
                type: "object",
                properties: {
                  podcastSeriesName: { type: "string", description: "Name of the podcast series" },
                  episodeTitle: { type: "string", description: "Episode title" },
                  releaseDate: { type: "string", description: "Release date in YYYY-MM-DD format", nullable: true },
                  founderNames: { type: "string", description: "Comma-separated founder names" },
                  company: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      foundingYear: { type: "number", nullable: true },
                      currentStage: { type: "string", description: "e.g., Seed, Series A, Public, Acquired" },
                      fundingRaised: { type: "string", description: "Total funding raised, e.g., 0M" },
                      valuation: { type: "string", description: "Current or last known valuation" },
                      employeeCount: { type: "number", nullable: true },
                      industry: { type: "string" },
                      status: { type: "string", enum: ["Active", "Acquired", "Shutdown"] }
                    },
                    required: ["name", "currentStage", "fundingRaised", "valuation", "industry", "status"]
                  },
                  lessons: {
                    type: "array",
                    description: "Exactly 10 tactical lessons",
                    minItems: 10,
                    maxItems: 10,
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "3-4 sentence detailed lesson with specific context" },
                        impactScore: { type: "integer", minimum: 1, maximum: 10 },
                        actionabilityScore: { type: "integer", minimum: 1, maximum: 10 },
                        category: { type: "string", description: "Primary category e.g., Product, Growth" },
                        tags: {
                          type: "array",
                          items: { type: "string" },
                          description: "List of tags e.g. #funding, #hiring"
                        },
                        founderAttribution: { type: "string", description: "Founder's name" }
                      },
                      required: ["text", "impactScore", "actionabilityScore", "category", "tags", "founderAttribution"]
                    }
                  },
                  chavelCallouts: {
                    type: "array",
                    description: "Exactly 5 startup-relevant callouts for founders",
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Specific callout relevant to startup founders" },
                        relevanceScore: { type: "integer", minimum: 1, maximum: 10 }
                      },
                      required: ["text", "relevanceScore"]
                    }
                  },
                  topics: {
                    type: "array",
                    description: `1-3 topics for the video, chosen ONLY from: ${CANONICAL_TOPICS.join(", ")}`,
                    items: { type: "string", enum: [...CANONICAL_TOPICS] },
                    minItems: 1,
                    maxItems: 3
                  }
                },
                required: ["podcastSeriesName", "episodeTitle", "founderNames", "company", "lessons", "chavelCallouts", "topics"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_episode_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits depleted. Please add credits to continue.');
      }
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData, null, 2));
    
    // Extract from tool calls instead of content
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in response:', aiData);
      throw new Error('AI did not return structured data. Please try again.');
    }
    
    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Parsed analysis:', JSON.stringify(analysis, null, 2));

    // Step 3: Find or create podcast
    const finalPodcastName = podcastName || analysis.podcastSeriesName;
    let podcastId: string;
    const { data: existingPodcast } = await supabase
      .from('podcasts')
      .select('id')
      .eq('name', finalPodcastName)
      .maybeSingle();

    if (existingPodcast) {
      podcastId = existingPodcast.id;
    } else {
      const { data: newPodcast, error: podcastError } = await supabase
        .from('podcasts')
        .insert({ name: finalPodcastName })
        .select('id')
        .single();
      
      if (podcastError) throw podcastError;
      podcastId = newPodcast.id;
    }

    // Step 4: Create or find company
    let companyId: string | null = null;
    if (analysis.company?.name) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', analysis.company.name)
        .maybeSingle();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: analysis.company.name,
            founding_year: analysis.company.foundingYear,
            current_stage: analysis.company.currentStage,
            funding_raised: analysis.company.fundingRaised,
            valuation: analysis.company.valuation,
            employee_count: analysis.company.employeeCount,
            industry: analysis.company.industry,
            status: analysis.company.status || 'Active',
          })
          .select('id')
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
          throw new Error(`Failed to create company: ${companyError.message} (${companyError.code})`);
        }
        companyId = newCompany.id;
      }
    }

    // Step 5: Create episode with date validation
    const isValidDate = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

    // Derive channel facets from oEmbed (preferred) with URL fallback.
    const channelName = videoContext.metadata.author || null;
    const channelHandle = deriveChannelHandle(videoContext.metadata.authorUrl, episodeUrl);
    const topics = normalizeTopics(analysis.topics);

    // Canonicalize founder names via the founder_aliases table so favoriting
    // "Elon Musk" once filters all his analyses.
    const rawFounders = (analysis.founderNames || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    let canonicalFounders: string[] = [];
    if (rawFounders.length > 0) {
      const lookupKeys = rawFounders.map((f) => f.toLowerCase().replace(/^@/, ""));
      const { data: aliasRows } = await supabase
        .from('founder_aliases')
        .select('canonical_name, alias')
        .in('alias', Array.from(new Set([...lookupKeys, ...lookupKeys.map((k) => "@" + k)])));
      const aliasMap = new Map<string, string>(
        (aliasRows ?? []).map((r: any) => [r.alias.toLowerCase(), r.canonical_name]),
      );
      const seen = new Set<string>();
      for (const f of rawFounders) {
        const key = f.toLowerCase().replace(/^@/, "");
        const canonical =
          aliasMap.get(key) ||
          aliasMap.get("@" + key) ||
          f.split(/\s+/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
        // Best-effort insert of newly-seen alias so future videos match.
        if (!aliasMap.has(key) && !aliasMap.has("@" + key)) {
          await supabase.from('founder_aliases').upsert(
            { canonical_name: canonical, alias: key },
            { onConflict: 'alias' },
          );
        }
        if (!seen.has(canonical.toLowerCase())) {
          seen.add(canonical.toLowerCase());
          canonicalFounders.push(canonical);
        }
      }
    }

    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .insert({
        podcast_id: podcastId,
        title: analysis.episodeTitle,
        release_date: (analysis.releaseDate && isValidDate(analysis.releaseDate)) ? analysis.releaseDate : undefined,
        url: episodeUrl,
        company_id: companyId,
        analyzed_profile_id: resolvedStartupProfileId,
        analyzed_profile_name_snapshot: resolvedStartupProfileNameSnapshot,
        founder_names: analysis.founderNames,
        founders: canonicalFounders,
        channel_name: channelName,
        channel_handle: channelHandle,
        topics,
        analysis_status: 'completed',
        analyzed_by: authenticatedUserId || null,
      })
      .select('id')
      .single();

    if (episodeError) {
      console.error('Error creating episode:', episodeError);
      throw new Error(`Failed to create episode: ${episodeError.message} (${episodeError.code})`);
    }

    if (transcript?.transcriptText) {
      const { error: transcriptError } = await supabase
        .from('episode_transcripts')
        .upsert({
          episode_id: episode.id,
          transcript_text: transcript.transcriptText,
          language: transcript.language,
          source: transcript.source,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'episode_id' });

      if (transcriptError) {
        console.warn('Could not save transcript for episode:', transcriptError);
      }
    }

    // Increment user's monthly analysis count
    if (authenticatedUserId) {
      const monthYear = new Date().toISOString().slice(0, 7);
      await supabase.rpc('increment_analysis_count', { p_user_id: authenticatedUserId });
      console.log('Incremented analysis count for user:', authenticatedUserId);
    }

    // Step 6: Insert lessons and tags
    if (analysis.lessons?.length > 0) {
      const clampScore = (val: any) => Math.max(1, Math.min(10, Math.round(Number(val) || 5)));
      
      const lessonsWithTags = analysis.lessons.map((lesson: any) => ({
        lesson_text: lesson.text,
        impact_score: clampScore(lesson.impactScore),
        actionability_score: clampScore(lesson.actionabilityScore),
        category: lesson.category,
        founder_attribution: lesson.founderAttribution,
        tags: (lesson.tags || []) as string[]
      }));

      // Insert lessons
      const { data: insertedLessons, error: lessonsError } = await supabase
        .from('lessons')
        .insert(lessonsWithTags.map(({ tags: _tags, ...rest }: { tags: string[], [key: string]: any }) => ({
          ...rest,
          episode_id: episode.id
        })))
        .select('id');

      if (lessonsError) {
        console.error('Error inserting lessons:', lessonsError);
        throw new Error(`Failed to save lessons: ${lessonsError.message} (${lessonsError.code})`);
      }

      // Process tags for each lesson
      if (insertedLessons && insertedLessons.length > 0) {
        for (let i = 0; i < insertedLessons.length; i++) {
          const lessonId = insertedLessons[i].id;
          const tags = lessonsWithTags[i].tags;

          if (tags && tags.length > 0) {
            for (const tagName of tags) {
              // Clean tag name (remove # if present, lowercase)
              const cleanTag = tagName.replace(/^#/, '').toLowerCase();

              if (!cleanTag) continue;

              // 1. Get or create tag
              let tagId;
              const { data: existingTag } = await supabase
                .from('tags')
                .select('id')
                .eq('name', cleanTag)
                .maybeSingle();

              if (existingTag) {
                tagId = existingTag.id;
              } else {
                const { data: newTag, error: tagError } = await supabase
                  .from('tags')
                  .insert({ name: cleanTag })
                  .select('id')
                  .single();

                // Handle concurrent inserts or errors
                if (tagError && tagError.code !== '23505') { // 23505 is unique violation
                   console.error('Error creating tag:', cleanTag, tagError);
                }

                // If failed (e.g. concurrent insert), try fetching again
                if (!newTag) {
                   const { data: retryTag } = await supabase
                     .from('tags')
                     .select('id')
                     .eq('name', cleanTag)
                     .maybeSingle();
                   tagId = retryTag?.id;
                } else {
                   tagId = newTag.id;
                }
              }

              // 2. Link tag to lesson
              if (tagId) {
                const { error: linkError } = await supabase
                  .from('lesson_tags')
                  .insert({ lesson_id: lessonId, tag_id: tagId });
                if (linkError && linkError.code !== '23505') {
                  console.error('Error linking tag:', linkError);
                }
              }
            }
          }
        }
      }
    }

    // Step 7: Insert chavel callouts with normalization
    if (analysis.chavelCallouts?.length > 0) {
      const clampScore = (val: any) => Math.max(1, Math.min(10, Math.round(Number(val) || 5)));
      
      const calloutsToInsert = analysis.chavelCallouts.map((callout: any) => ({
        episode_id: episode.id,
        callout_text: callout.text,
        relevance_score: clampScore(callout.relevanceScore),
      }));

      const { error: calloutsError } = await supabase
        .from('chavel_callouts')
        .insert(calloutsToInsert);

      if (calloutsError) {
        console.error('Error inserting callouts:', calloutsError);
        throw new Error(`Failed to save callouts: ${calloutsError.message} (${calloutsError.code})`);
      }
    }

    // Use the provided startup profile for personalized insights, if any
    const hasCustomProfile = resolvedStartupProfile && (resolvedStartupProfile.company_name || resolvedStartupProfile.stage);
    const profileToUse = hasCustomProfile ? resolvedStartupProfile : null;
    
    // Only generate personalized insights when a user profile is provided
    if (profileToUse) {
    console.log('Generating personalized insights...');
    
    const { data: insertedLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('id, lesson_text')
      .eq('episode_id', episode.id);

    if (fetchError || !insertedLessons) {
      console.error('Error fetching lessons for personalization:', fetchError);
    } else {
      // Generate personalized insights for each lesson
      const personalizedInsights = [];
      
      for (const lesson of insertedLessons) {
        const personalizationPrompt = `
Business Context:
- Business: ${profileToUse.company_name}
- Stage/type: ${profileToUse.stage}
- Funding: ${profileToUse.funding_raised || 'Not specified'}
- Team Size: ${profileToUse.employee_count || 'Not specified'}
- Industry: ${profileToUse.industry || 'Not specified'}
- Description: ${profileToUse.description}
${profileToUse.deck_summary ? `- Additional context: ${profileToUse.deck_summary}` : ''}

Universal Lesson from Episode:
"${lesson.lesson_text}"

Generate a personalized insight in JSON format:
{
  "personalizedText": "2-3 sentences explaining how this lesson specifically applies to THIS business and what they should focus on",
  "relevanceScore": 1-10 (how relevant is this lesson to their specific situation),
  "actionItems": ["Specific action 1", "Specific action 2", "Specific action 3"]
}

Adapt the language, examples, KPIs, risks, and recommended actions to their industry and business type. Do NOT assume they are a venture-backed tech startup raising capital unless their stage/industry indicates it — tailor advice for the kind of business they actually run (e.g. a local shop, restaurant, agency, creator, service business, ecommerce brand, or bootstrapped company). Make it tactical and specific.`;

          try {
            const personalizationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'user', content: personalizationPrompt }
                ],
              }),
            });

            if (personalizationResponse.ok) {
              const personalizationData = await personalizationResponse.json();
              const content = personalizationData.choices?.[0]?.message?.content || '';
              
              try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const personalizedData = JSON.parse(jsonMatch[0]);
                  
                  personalizedInsights.push({
                    lesson_id: lesson.id,
                    startup_profile_id: resolvedStartupProfileId,
                    personalized_text: personalizedData.personalizedText,
                    relevance_score: Math.max(1, Math.min(10, Math.round(Number(personalizedData.relevanceScore) || 5))),
                    action_items: personalizedData.actionItems || [],
                  });
                }
              } catch (parseError) {
                console.error('Error parsing personalized insight:', parseError);
              }
            }
          } catch (personalizationError) {
            console.error('Error generating personalized insight:', personalizationError);
          }
        }

        // Insert personalized insights
        if (personalizedInsights.length > 0) {
          const { error: insightsError } = await supabase
            .from('personalized_insights')
            .insert(personalizedInsights);

          if (insightsError) {
            console.error('Error inserting personalized insights:', insightsError);
          }
      }
    }
    } // end if (profileToUse)

    return new Response(JSON.stringify({ 
      success: true, 
      episodeId: episode.id,
      message: profileToUse ? 'Episode analyzed successfully with personalized insights' : 'Episode analyzed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-episode:', error);

    // Pass through a small allowlist of user-actionable messages; otherwise return a generic error.
    let clientMessage = 'Failed to analyze episode. Please try again.';
    let statusCode = 500;
    if (error instanceof Error) {
      const msg = error.message;
      const safePrefixes = [
        'Episode URL', 'Invalid URL', 'Invalid podcast', 'Unsupported URL',
        'Episode URL too long', 'Invalid URL protocol',
      ];
      if (safePrefixes.some((p) => msg.startsWith(p))) {
        clientMessage = msg;
        statusCode = 400;
      }
    }

    return new Response(JSON.stringify({ error: clientMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
