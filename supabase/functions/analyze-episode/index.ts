import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import JSZip from "https://esm.sh/jszip@3.10.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
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

// ---- Premium document upload support ----
// Uploaded private documents are analyzed through the SAME pipeline as URLs:
// we extract plain text from the file and feed it to the analysis prompt as the
// grounding content. Upload is a premium (paid-tier) feature, enforced server-side.
const ALLOWED_UPLOAD_EXTS = ['.pdf', '.txt', '.md', '.csv', '.docx', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_GROUNDING_CHARS = 200000;
const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Extract analyzable plain text from an uploaded document stored in the
 * `source-uploads` bucket. Text formats are decoded directly; DOCX is unzipped;
 * PDFs and images are transcribed by the multimodal model. Throws a
 * user-actionable "Could not …" error on failure.
 */
async function extractDocumentText(
  supabase: any,
  filePath: string,
  lovableApiKey: string,
): Promise<string> {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('source-uploads')
    .download(filePath);
  if (downloadError || !fileData) {
    throw new Error('Could not read the uploaded file. Please try uploading it again.');
  }
  const buffer = await fileData.arrayBuffer();
  const lower = filePath.toLowerCase();

  // Plain-text formats — decode directly, no AI needed.
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv')) {
    return new TextDecoder().decode(buffer).slice(0, MAX_GROUNDING_CHARS);
  }

  // DOCX — unzip and read word/document.xml, then strip XML tags to text.
  if (lower.endsWith('.docx')) {
    const zip = await JSZip.loadAsync(buffer);
    const doc = zip.file('word/document.xml');
    if (!doc) throw new Error('Could not extract text from this document.');
    const xml = await doc.async('string');
    const text = xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text.length < 1) throw new Error('Could not extract text from this document.');
    return text.slice(0, MAX_GROUNDING_CHARS);
  }

  // XLSX / XLS — deterministic CSV extraction per sheet, no AI round-trip.
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    } catch (err) {
      console.error('XLSX parse error:', err);
      throw new Error('Could not extract text from this document.');
    }
    const parts: string[] = [];
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim().length === 0) continue;
      parts.push(`# Sheet: ${name}\n${csv}`);
      if (parts.join('\n\n').length >= MAX_GROUNDING_CHARS) break;
    }
    const text = parts.join('\n\n').trim();
    if (text.length < 1) throw new Error('Could not extract text from this document.');
    return text.slice(0, MAX_GROUNDING_CHARS);
  }

  // PDF and images — hand to the multimodal model to transcribe verbatim.
  const imageExt = Object.keys(IMAGE_MIME).find((ext) => lower.endsWith(ext));
  const mime = imageExt ? IMAGE_MIME[imageExt] : 'application/pdf';
  const instruction = imageExt
    ? 'Transcribe all visible text in this image verbatim, then briefly describe any non-text content (charts, screenshots, diagrams). Return only the transcription and description — do not summarize or add commentary.'
    : 'Extract and return the full plain text of this document, preserving paragraph breaks. Return only the document text — do not summarize, comment, or add anything not present in the document.';
  const dataUrl = `data:${mime};base64,${arrayBufferToBase64(buffer)}`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) throw new Error('Rate limit exceeded. Please try again in a few moments.');
    if (aiResponse.status === 402) throw new Error('AI credits depleted. Please add credits to continue.');
    const errorText = await aiResponse.text();
    console.error('Document extraction AI error:', aiResponse.status, errorText);
    throw new Error('Could not extract text from the uploaded file.');
  }
  const aiResult = await aiResponse.json();
  const text = aiResult.choices?.[0]?.message?.content || '';
  return String(text).slice(0, MAX_GROUNDING_CHARS);
}

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

    const {
      episodeUrl,
      podcastName,
      startupProfile,
      startupProfileId,
      sourceFilePath,
      sourceFileName,
    } = await req.json();

    // Two ingestion modes: a public URL, or a premium uploaded document.
    const isUpload = typeof sourceFilePath === 'string' && sourceFilePath.length > 0;
    const displayFileName =
      (typeof sourceFileName === 'string' && sourceFileName.trim()) || 'Uploaded document';
    // Uploaded documents have no navigable URL; use a synthetic, non-navigable value
    // so the NOT NULL episodes.url column and downstream references stay consistent.
    const sourceUrl = isUpload
      ? `document://${encodeURIComponent(displayFileName)}`
      : episodeUrl;

    console.log('Analyzing source:', {
      mode: isUpload ? 'upload' : 'url',
      episodeUrl: isUpload ? undefined : episodeUrl,
      sourceFileName: isUpload ? displayFileName : undefined,
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

    if (podcastName && (typeof podcastName !== 'string' || podcastName.length > 200)) {
      throw new Error('Invalid podcast name');
    }

    if (isUpload) {
      // ---- Uploaded document: AuthZ + validation ----
      if (sourceFilePath.length > 1024) {
        throw new Error('Invalid file path');
      }
      // File must live inside the caller's own storage folder.
      if (!sourceFilePath.startsWith(`${authenticatedUserId}/`)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const lowerPath = sourceFilePath.toLowerCase();
      if (!ALLOWED_UPLOAD_EXTS.some((ext) => lowerPath.endsWith(ext))) {
        throw new Error('Unsupported file type. Supported files: PDF, TXT, Markdown, CSV, DOCX, and images.');
      }
      if (displayFileName.length > 300) {
        throw new Error('Invalid file name');
      }
    } else {
      // ---- Public URL: validate format ----
      if (!episodeUrl || typeof episodeUrl !== 'string') {
        throw new Error('Source URL is required');
      }
      if (episodeUrl.length > 2048) {
        throw new Error('Source URL too long');
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(episodeUrl);
      } catch {
        throw new Error('Invalid URL format. Please provide a valid public link.');
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid URL protocol — must be http or https.');
      }
      // Multi-source: any public http(s) URL is accepted. The shared adapter detects
      // the source type (YouTube, TikTok, Instagram, X, Vimeo, LinkedIn, podcast, or a
      // generic article/web page) and pulls a transcript (video/audio) or extracts the
      // readable article text for everything else.
    }

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

        // Document upload is a premium (paid-tier) feature. Enforce server-side —
        // the client gate is UX only. Re-read tier from the DB; never trust the client.
        if (isUpload && tier !== 'seed' && tier !== 'series_z') {
          return new Response(JSON.stringify({
            error: 'Document upload is a premium feature. Upgrade to The C-Suite or The Boardroom to analyze private documents.',
            upgradeRequired: true,
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

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

    // Acquire content from either the URL (metadata + transcript or article text)
    // or the uploaded document (extracted plain text). Both feed the same analysis
    // prompt through `groundingText`.
    let videoContext: Awaited<ReturnType<typeof getVideoContext>>;
    let transcript: { transcriptText: string; language: string | null; source: string } | null = null;
    let groundingText = '';
    let groundingLabel: string | null = null;

    if (isUpload) {
      groundingText = (await extractDocumentText(supabase, sourceFilePath, lovableApiKey)).trim();
      if (groundingText.length < 20) {
        throw new Error('Could not extract enough text from the uploaded file to analyze. Try a different file or paste the text as a URL.');
      }
      groundingLabel = 'Document text excerpt for grounding';
      videoContext = {
        platform: 'generic',
        metadata: { title: displayFileName, author: null, authorUrl: null, thumbnail: null, description: null },
        transcript: null,
        article: null,
      };
      // Privacy: remove the raw uploaded file now that we've extracted its text.
      // Only the derived lessons/callouts are persisted (mirrors parse-deck).
      supabase.storage.from('source-uploads').remove([sourceFilePath]).catch(() => {});
    } else {
      videoContext = await getVideoContext(episodeUrl);
      transcript = videoContext.transcript
        ? {
            transcriptText: videoContext.transcript.transcriptText,
            language: videoContext.transcript.language,
            source: videoContext.transcript.source,
          }
        : null;
      if (transcript?.transcriptText) {
        groundingText = transcript.transcriptText;
        groundingLabel = 'Transcript excerpt for grounding';
      } else if (videoContext.article?.text) {
        groundingText = videoContext.article.text;
        groundingLabel = 'Article text excerpt for grounding';
      }
    }

    const videoTitle = videoContext.metadata.title || '';
    const videoAuthor = videoContext.metadata.author || '';
    console.log('Source context:', {
      mode: isUpload ? 'upload' : 'url',
      platform: videoContext.platform,
      hasTitle: Boolean(videoTitle),
      hasGrounding: Boolean(groundingText),
      groundingChars: groundingText.length,
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
    const systemPrompt = `You are an expert at extracting practical business lessons from ANY piece of content — articles, blog posts, newsletters, social posts, PDFs, notes, podcasts, and videos — for founders, operators, and business owners across every industry, including local shops, restaurants, agencies, creators, service businesses, ecommerce brands, bootstrapped companies, and venture-backed startups.

CRITICAL REQUIREMENTS:
- Extract EXACTLY 10 tactical lessons ranked by actionability and impact (each 3-4 sentences with specific context)
- Extract EXACTLY 5 business-relevant callouts (key takeaways useful to a business builder at any stage or size)
- Research and include actual company data (funding, valuation, stage, employee count) when the subject is a company; mark "Unknown" or "Not disclosed" otherwise
- Cite specific examples and stories from the source's author or creator
- DO NOT provide mock or placeholder data
- Extract the source or publication name from context if not provided
- Do NOT assume the audience is raising venture capital; keep lessons applicable to many business types
- Assign relevant TAGS to each lesson (e.g., #marketing, #hiring, #operations, #pricing, #growth)`;

    const userPrompt = `Analyze this content:
${isUpload ? `Source: Uploaded document — ${displayFileName}` : `URL: ${sourceUrl}`}
Source type: ${isUpload ? 'document' : videoContext.platform}
${videoTitle ? `Title: ${videoTitle}` : ''}
${videoAuthor ? `Author/Creator: ${videoAuthor}` : ''}
${videoContext.metadata.description ? `Description: ${videoContext.metadata.description.slice(0, 1200)}` : ''}
${podcastName ? `Source name: ${podcastName}` : 'Source name: Please extract from the content'}
${groundingText ? `${groundingLabel}:
${groundingText.slice(0, 30000)}` : 'Full text: Not available. Use the title, author, description, and any public knowledge of this source to extract the most useful business lessons you can. If there truly is nothing to work with, return an error rather than mock data.'}${viewerBusiness}


INSTRUCTIONS:
1. Read the actual content and extract real insights from it
2. Identify the author or creator(s) and the company or topic discussed
3. Research relevant metrics (funding, valuation, stage, employees, industry) when applicable
4. Extract EXACTLY 10 tactical, actionable lessons with specific context from the author's stories and points
5. Extract EXACTLY 5 business-relevant callouts useful to a builder of any business type
6. Rank lessons by actionability (1-10) and impact (1-10)
7. Include author attribution for each lesson
8. Assign 1-3 relevant tags to each lesson (e.g. #growth, #culture, #pricing)
9. Assign 1-3 TOPICS to the whole source, chosen ONLY from this fixed list: ${CANONICAL_TOPICS.join(", ")}
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
              description: "Extract structured business insights from a piece of content (article, post, PDF, note, podcast, or video)",
              parameters: {
                type: "object",
                properties: {
                  podcastSeriesName: { type: "string", description: "Name of the source, publication, show, or channel" },
                  episodeTitle: { type: "string", description: "Title of the content" },
                  releaseDate: { type: "string", description: "Publish/release date in YYYY-MM-DD format", nullable: true },
                  founderNames: { type: "string", description: "Comma-separated names of the people featured or quoted (authors, speakers, founders)" },
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
                        founderAttribution: { type: "string", description: "Name of the person the lesson is attributed to" }
                      },
                      required: ["text", "impactScore", "actionabilityScore", "category", "tags", "founderAttribution"]
                    }
                  },
                  chavelCallouts: {
                    type: "array",
                    description: "Exactly 5 business-relevant callouts for founders and operators",
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
                    description: `1-3 topics for the content, chosen ONLY from: ${CANONICAL_TOPICS.join(", ")}`,
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
    const channelHandle = deriveChannelHandle(videoContext.metadata.authorUrl, sourceUrl);
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
        url: sourceUrl,
        source_type: isUpload ? 'document' : 'url',
        platform: isUpload ? 'Document' : undefined,
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
        'Source URL', 'Invalid URL', 'Invalid podcast', 'Unsupported URL',
        'Invalid URL protocol', 'Unsupported file type', 'Invalid file',
        'Could not extract', 'Could not read the uploaded',
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
