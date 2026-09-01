-- Second seed for the Inspiration Library.
--
-- Headroom, not decoration. The curated library is what fills an edition when
-- live search is thin or unconfigured, and scoreCandidate applies a heavy
-- previously-seen penalty — so with 25 rows and 10 picks per edition, the fill
-- degrades into re-runs after about two and a half weeks. This roughly doubles
-- the pool.
--
-- Metadata + link only, same as the first seed: no copyrighted body text.
-- content_key must match contentKey() in
-- supabase/functions/_shared/discovery/url.ts — hostname (www stripped) + path,
-- lowercased, no trailing slash. url.test.ts pins these strings.
--
-- ON CONFLICT DO NOTHING, so this is safe to re-run and safe against a row the
-- discovery job already found on its own.
--
-- Deliberately conservative on sourcing: every row below is a long-lived,
-- stable URL on a domain the first seed already proved. Categories that remain
-- thin — Sports, Healthcare / Medicine, Biotechnology, Entertainment, Design,
-- E-commerce — are better filled by an admin who can verify each link than by
-- guessing slugs to hit a quota; the category-overlap query in curatedLoader
-- falls back to the general priority list until then.

INSERT INTO public.discovery_content
  (url, canonical_url, content_key, title, description, image_url, publisher, author,
   published_at, content_type, duration_seconds, language, categories, topics,
   source, is_curated, featured, priority, quality_score)
VALUES
  -- --------------------------------------------------- Founding & operating
  ('https://paulgraham.com/before.html', 'https://paulgraham.com/before.html', 'paulgraham.com/before.html',
   'Before the Startup',
   'The counterintuitive things about running a startup — why expertise in startups matters less than expertise in your users, and why most advice reads backwards.',
   NULL, 'Paul Graham', 'Paul Graham', '2014-10-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship','Leadership'], ARRAY['Strategy','Product-Market Fit'],
   'curated', true, false, 90, 0.940),

  ('https://paulgraham.com/really.html', 'https://paulgraham.com/really.html', 'paulgraham.com/really.html',
   'What Startups Are Really Like',
   'Founders describe what surprised them most after starting, collected into the gap between what people expect and what actually happens.',
   NULL, 'Paul Graham', 'Paul Graham', '2009-10-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship'], ARRAY['Strategy','Leadership'],
   'curated', true, false, 85, 0.920),

  ('https://paulgraham.com/founders.html', 'https://paulgraham.com/founders.html', 'paulgraham.com/founders.html',
   'What We Look for in Founders',
   'The five qualities that predict whether a founding team works: determination, flexibility, imagination, naughtiness, and friendship.',
   NULL, 'Paul Graham', 'Paul Graham', '2010-10-01', 'essay', NULL, 'en',
   ARRAY['Startups','Leadership','Venture Capital'], ARRAY['Leadership','Hiring'],
   'curated', true, false, 85, 0.920),

  ('https://paulgraham.com/die.html', 'https://paulgraham.com/die.html', 'paulgraham.com/die.html',
   'How Not to Die',
   'Startups mostly fail because the founders give up. What that actually looks like from the inside, and how to recognise it early.',
   NULL, 'Paul Graham', 'Paul Graham', '2007-08-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship','Leadership'], ARRAY['Leadership','Strategy'],
   'curated', true, false, 80, 0.910),

  ('https://paulgraham.com/determination.html', 'https://paulgraham.com/determination.html', 'paulgraham.com/determination.html',
   'The Anatomy of Determination',
   'Determination splits into willfulness, discipline and ambition — and only some combinations produce founders who finish things.',
   NULL, 'Paul Graham', 'Paul Graham', '2009-09-01', 'essay', NULL, 'en',
   ARRAY['Startups','Leadership','Behavioral Science'], ARRAY['Leadership'],
   'curated', true, false, 75, 0.900),

  ('https://paulgraham.com/schlep.html', 'https://paulgraham.com/schlep.html', 'paulgraham.com/schlep.html',
   'Schlep Blindness',
   'The best startup ideas hide behind work nobody wants to do. Why founders unconsciously filter them out before ever considering them.',
   NULL, 'Paul Graham', 'Paul Graham', '2012-01-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship','Strategy'], ARRAY['Strategy','Product-Market Fit'],
   'curated', true, false, 80, 0.910),

  ('https://paulgraham.com/relres.html', 'https://paulgraham.com/relres.html', 'paulgraham.com/relres.html',
   'Relentlessly Resourceful',
   'A short attempt at naming the single quality that separates founders who make it from founders who do not.',
   NULL, 'Paul Graham', 'Paul Graham', '2009-03-01', 'essay', NULL, 'en',
   ARRAY['Startups','Leadership'], ARRAY['Leadership','Strategy'],
   'curated', true, false, 70, 0.890),

  ('https://paulgraham.com/superlinear.html', 'https://paulgraham.com/superlinear.html', 'paulgraham.com/superlinear.html',
   'Superlinear Returns',
   'Why outcomes in most fields are not proportional to effort, and what that non-linearity implies about what to work on.',
   NULL, 'Paul Graham', 'Paul Graham', '2023-10-01', 'essay', NULL, 'en',
   ARRAY['Strategy','Entrepreneurship','Behavioral Science'], ARRAY['Strategy','Growth'],
   'curated', true, true, 90, 0.930),

  -- ------------------------------------------------------------ Fundraising
  ('https://paulgraham.com/fr.html', 'https://paulgraham.com/fr.html', 'paulgraham.com/fr.html',
   'How to Raise Money',
   'The mechanics of a seed round from the founder''s side: parallel vs. sequential fundraising, when to stop, and how investors actually decide.',
   NULL, 'Paul Graham', 'Paul Graham', '2013-09-01', 'essay', NULL, 'en',
   ARRAY['Venture Capital','Startups','Finance'], ARRAY['Fundraising','Strategy'],
   'curated', true, true, 95, 0.940),

  ('https://paulgraham.com/convince.html', 'https://paulgraham.com/convince.html', 'paulgraham.com/convince.html',
   'How to Convince Investors',
   'Why being formidable beats being persuasive, and what to do when you genuinely cannot tell whether your own idea is good.',
   NULL, 'Paul Graham', 'Paul Graham', '2013-08-01', 'essay', NULL, 'en',
   ARRAY['Venture Capital','Startups'], ARRAY['Fundraising','Strategy'],
   'curated', true, false, 85, 0.920),

  ('https://paulgraham.com/swan.html', 'https://paulgraham.com/swan.html', 'paulgraham.com/swan.html',
   'Black Swan Farming',
   'Why the returns in venture are so skewed that the best investments look bad at the time, and what that does to an investor''s judgement.',
   NULL, 'Paul Graham', 'Paul Graham', '2012-09-01', 'essay', NULL, 'en',
   ARRAY['Venture Capital','Finance','Strategy'], ARRAY['Fundraising','Strategy'],
   'curated', true, false, 80, 0.910),

  -- --------------------------------------------------------------- Operating
  ('https://blog.samaltman.com/idea-generation', 'https://blog.samaltman.com/idea-generation', 'blog.samaltman.com/idea-generation',
   'Idea Generation',
   'Where good startup ideas actually come from, and the habits and company you need to keep to have them regularly.',
   NULL, 'Sam Altman', 'Sam Altman', '2019-11-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship','Product'], ARRAY['Strategy','Product-Market Fit'],
   'curated', true, false, 85, 0.920),

  ('https://blog.samaltman.com/productivity', 'https://blog.samaltman.com/productivity', 'blog.samaltman.com/productivity',
   'Productivity',
   'Choosing the right thing to work on matters more than working faster. A practical account of how to prioritise as a founder.',
   NULL, 'Sam Altman', 'Sam Altman', '2018-04-01', 'essay', NULL, 'en',
   ARRAY['Leadership','Operations','Behavioral Science'], ARRAY['Leadership','Operations'],
   'curated', true, false, 80, 0.910),

  ('https://blog.samaltman.com/the-strength-of-being-misunderstood', 'https://blog.samaltman.com/the-strength-of-being-misunderstood', 'blog.samaltman.com/the-strength-of-being-misunderstood',
   'The Strength of Being Misunderstood',
   'On optimising for the judgement of your future self rather than the reaction of the present crowd.',
   NULL, 'Sam Altman', 'Sam Altman', '2020-07-01', 'essay', NULL, 'en',
   ARRAY['Leadership','Behavioral Science','Strategy'], ARRAY['Leadership','Strategy'],
   'curated', true, false, 75, 0.900),

  ('https://www.joelonsoftware.com/2002/01/06/fire-and-motion/', 'https://joelonsoftware.com/2002/01/06/fire-and-motion', 'joelonsoftware.com/2002/01/06/fire-and-motion',
   'Fire And Motion',
   'Why large competitors ship things designed to keep you reacting instead of building, and how to tell suppressive fire from real strategy.',
   NULL, 'Joel on Software', 'Joel Spolsky', '2002-01-06', 'essay', NULL, 'en',
   ARRAY['Strategy','Engineering','Enterprise'], ARRAY['Strategy','Competitors'],
   'curated', true, false, 75, 0.900),

  -- ----------------------------------------------- Artificial Intelligence
  ('https://arxiv.org/abs/1512.03385', 'https://arxiv.org/abs/1512.03385', 'arxiv.org/abs/1512.03385',
   'Deep Residual Learning for Image Recognition',
   'The ResNet paper. Residual connections made very deep networks trainable and remain a building block of most modern architectures.',
   NULL, 'arXiv', 'He, Zhang, Ren, Sun', '2015-12-10', 'research', NULL, 'en',
   ARRAY['Artificial Intelligence','Engineering'], ARRAY['AI','Engineering'],
   'curated', true, false, 70, 0.930),

  ('https://arxiv.org/abs/1810.04805', 'https://arxiv.org/abs/1810.04805', 'arxiv.org/abs/1810.04805',
   'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
   'Bidirectional pre-training, and the transfer-learning pattern that made task-specific language models cheap to build.',
   NULL, 'arXiv', 'Devlin, Chang, Lee, Toutanova', '2018-10-11', 'research', NULL, 'en',
   ARRAY['Artificial Intelligence','Engineering'], ARRAY['AI','Engineering'],
   'curated', true, false, 70, 0.930),

  ('https://arxiv.org/abs/2203.02155', 'https://arxiv.org/abs/2203.02155', 'arxiv.org/abs/2203.02155',
   'Training Language Models to Follow Instructions with Human Feedback',
   'The InstructGPT paper — how RLHF turned raw language models into systems that do what they are asked.',
   NULL, 'arXiv', 'Ouyang et al.', '2022-03-04', 'research', NULL, 'en',
   ARRAY['Artificial Intelligence','Product','Engineering'], ARRAY['AI','Product'],
   'curated', true, true, 80, 0.940),

  ('https://arxiv.org/abs/1406.2661', 'https://arxiv.org/abs/1406.2661', 'arxiv.org/abs/1406.2661',
   'Generative Adversarial Networks',
   'The original GAN paper: two networks trained against each other, and the idea that shaped a decade of generative modelling.',
   NULL, 'arXiv', 'Goodfellow et al.', '2014-06-10', 'research', NULL, 'en',
   ARRAY['Artificial Intelligence','Engineering'], ARRAY['AI','Engineering'],
   'curated', true, false, 65, 0.920),

  ('https://arxiv.org/abs/2302.13971', 'https://arxiv.org/abs/2302.13971', 'arxiv.org/abs/2302.13971',
   'LLaMA: Open and Efficient Foundation Language Models',
   'Competitive language models trained on public data alone, and the compute/quality tradeoffs behind smaller open models.',
   NULL, 'arXiv', 'Touvron et al.', '2023-02-27', 'research', NULL, 'en',
   ARRAY['Artificial Intelligence','Engineering','Strategy'], ARRAY['AI','Engineering'],
   'curated', true, false, 70, 0.920)

ON CONFLICT (content_key) DO NOTHING;
