import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getVideoContext } from "../_shared/transcript.ts";

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

    const { episodeUrl, podcastName, startupProfile } = await req.json();
    console.log('Analyzing episode:', { episodeUrl, podcastName, hasProfile: !!startupProfile, userId: authenticatedUserId });

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
      throw new Error('Invalid URL format. Please provide a valid YouTube or Spotify link.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    const allowedHosts = [
      'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
      'youtu.be',
      'open.spotify.com', 'spotify.com',
      'podcasts.apple.com',
    ];
    const isAllowed = allowedHosts.some(host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host));
    if (!isAllowed) {
      throw new Error('Unsupported URL. Please provide a YouTube, Spotify, or Apple Podcasts link.');
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
        const maxAnalyses = TIER_LIMITS[tier]?.analyses || 4;

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

    // Extract video ID for YouTube URLs
    let videoId = '';
    let videoTitle = '';
    const isYouTube = parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname === 'youtu.be';
    if (isYouTube) {
      if (parsedUrl.hostname === 'youtu.be') {
        videoId = parsedUrl.pathname.slice(1).split('/')[0];
      } else if (parsedUrl.pathname.startsWith('/shorts/')) {
        videoId = parsedUrl.pathname.split('/shorts/')[1]?.split('/')[0] || '';
      } else {
        videoId = parsedUrl.searchParams.get('v') || '';
      }

      try {
        const ytResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(episodeUrl)}&format=json`);
        if (ytResponse.ok) {
          const ytData = await ytResponse.json();
          videoTitle = ytData.title || '';
        }
      } catch (e) {
        console.log('Could not fetch YouTube metadata:', e);
      }
    }

    const transcript = isYouTube ? await extractYouTubeTranscript(videoId) : null;

    // Optional context about the viewer's own business, used to bias examples/jargon.
    const viewerBusiness = startupProfile && (startupProfile.company_name || startupProfile.industry || startupProfile.stage)
      ? `\n\nViewer's business context (adapt examples, jargon, KPIs, and risks to THIS type of business — do NOT assume a venture-backed tech startup unless stated):
- Business: ${startupProfile.company_name || 'Not specified'}
- Industry: ${startupProfile.industry || 'Not specified'}
- Stage/type: ${startupProfile.stage || 'Not specified'}
${startupProfile.description ? `- About: ${startupProfile.description}` : ''}`
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
${videoTitle ? `Title: ${videoTitle}` : ''}
${podcastName ? `Source: ${podcastName}` : 'Source: Please extract from the episode'}
${transcript?.transcriptText ? `Transcript excerpt for grounding:
${transcript.transcriptText.slice(0, 30000)}` : 'Transcript excerpt: Not available; analyze only if the model can access the public episode content.'}${viewerBusiness}

INSTRUCTIONS:
1. Watch/listen to the episode and extract real insights from the actual content
2. Identify the speaker(s) and the company or topic discussed
3. Research relevant metrics (funding, valuation, stage, employees, industry) when applicable
4. Extract EXACTLY 10 tactical, actionable lessons with specific context from the speaker's stories
5. Extract EXACTLY 5 business-relevant callouts useful to a builder of any business type
6. Rank lessons by actionability (1-10) and impact (1-10)
7. Include speaker attribution for each lesson
8. Assign 1-3 relevant tags to each lesson (e.g. #growth, #culture, #pricing)
9. If you cannot access the content, return an error - do NOT provide mock data`;

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
                  }
                },
                required: ["podcastSeriesName", "episodeTitle", "founderNames", "company", "lessons", "chavelCallouts"],
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

    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .insert({
        podcast_id: podcastId,
        title: analysis.episodeTitle,
        release_date: (analysis.releaseDate && isValidDate(analysis.releaseDate)) ? analysis.releaseDate : undefined,
        url: episodeUrl,
        company_id: companyId,
        founder_names: analysis.founderNames,
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
    const hasCustomProfile = startupProfile && (startupProfile.company_name || startupProfile.stage);
    const profileToUse = hasCustomProfile ? startupProfile : null;
    
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
                    startup_profile_id: null, // Can be linked later if profile was saved
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
