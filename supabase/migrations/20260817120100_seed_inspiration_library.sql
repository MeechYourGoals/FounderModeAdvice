-- Starting set for the Inspiration Library.
--
-- Metadata + link only (title, publisher, author, short description, external
-- URL) — no copyrighted body text is copied here. YouTube thumbnails use the
-- documented i.ytimg.com URL form.
--
-- This is a seed, not the whole library: admins add rows through the same table
-- (RLS: has_role(auth.uid(),'admin')) and the weekly discovery job appends
-- non-curated rows, so categories without a seed below fill in over time.
--
-- content_key must match the normalizer in
-- supabase/functions/_shared/discovery/url.ts (contentKey) — a Deno test pins
-- these exact strings so the two implementations cannot drift.

INSERT INTO public.discovery_content
  (url, canonical_url, content_key, title, description, image_url, publisher, author,
   published_at, content_type, duration_seconds, language, categories, topics,
   source, is_curated, featured, priority, quality_score)
VALUES
  -- ---------------------------------------------------------------- Startups
  ('https://paulgraham.com/ds.html', 'https://paulgraham.com/ds.html', 'paulgraham.com/ds.html',
   'Do Things that Don''t Scale',
   'Why the unscalable, manual, deeply unglamorous work of recruiting early users by hand is usually what makes a startup work at all.',
   NULL, 'Paul Graham', 'Paul Graham', '2013-07-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship','Growth'], ARRAY['Growth','Product-Market Fit'],
   'curated', true, true, 100, 0.950),

  ('https://paulgraham.com/startupideas.html', 'https://paulgraham.com/startupideas.html', 'paulgraham.com/startupideas.html',
   'How to Get Startup Ideas',
   'Notice problems you have yourself rather than inventing ideas — and how to tell an organic idea from a made-up one.',
   NULL, 'Paul Graham', 'Paul Graham', '2012-11-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship','Product'], ARRAY['Product','Strategy'],
   'curated', true, true, 98, 0.950),

  ('https://paulgraham.com/growth.html', 'https://paulgraham.com/growth.html', 'paulgraham.com/growth.html',
   'Startup = Growth',
   'The argument that growth rate is the defining property of a startup, and what picking a growth target does to every other decision.',
   NULL, 'Paul Graham', 'Paul Graham', '2012-09-01', 'essay', NULL, 'en',
   ARRAY['Startups','Venture Capital','Strategy'], ARRAY['Growth','Strategy'],
   'curated', true, false, 92, 0.940),

  ('https://paulgraham.com/startupmistakes.html', 'https://paulgraham.com/startupmistakes.html', 'paulgraham.com/startupmistakes.html',
   'The 18 Mistakes That Kill Startups',
   'A catalogue of the specific, repeated ways early companies die — single founders, bad location, derivative ideas, hiring too early.',
   NULL, 'Paul Graham', 'Paul Graham', '2006-10-01', 'essay', NULL, 'en',
   ARRAY['Startups','Entrepreneurship','Operations'], ARRAY['Strategy','Operations'],
   'curated', true, false, 88, 0.930),

  ('https://paulgraham.com/13sentences.html', 'https://paulgraham.com/13sentences.html', 'paulgraham.com/13sentences.html',
   'Startups in 13 Sentences',
   'Thirteen compressed rules — pick good cofounders, launch fast, understand your users, avoid distractions — ranked by importance.',
   NULL, 'Paul Graham', 'Paul Graham', '2009-02-01', 'essay', NULL, 'en',
   ARRAY['Startups','Strategy','Leadership'], ARRAY['Strategy','Leadership'],
   'curated', true, false, 80, 0.920),

  ('https://blog.samaltman.com/how-to-be-successful', 'https://blog.samaltman.com/how-to-be-successful', 'blog.samaltman.com/how-to-be-successful',
   'How to Be Successful',
   'Thirteen compounding habits — self-belief, independent thinking, sales, risk-taking — drawn from watching thousands of founders.',
   NULL, 'Sam Altman', 'Sam Altman', '2019-01-24', 'essay', NULL, 'en',
   ARRAY['Startups','Leadership','Entrepreneurship'], ARRAY['Leadership','Strategy'],
   'curated', true, false, 86, 0.930),

  ('https://steveblank.com/2010/01/25/whats-a-startup-first-principles/', 'https://steveblank.com/2010/01/25/whats-a-startup-first-principles/', 'steveblank.com/2010/01/25/whats-a-startup-first-principles',
   'What''s A Startup? First Principles.',
   'Defines a startup as a temporary organization searching for a repeatable business model — and why that changes how you run one.',
   NULL, 'Steve Blank', 'Steve Blank', '2010-01-25', 'essay', NULL, 'en',
   ARRAY['Startups','Strategy','Entrepreneurship'], ARRAY['Strategy','Product-Market Fit'],
   'curated', true, false, 78, 0.910),

  ('https://www.ycombinator.com/library', 'https://ycombinator.com/library', 'ycombinator.com/library',
   'The YC Startup Library',
   'Y Combinator''s indexed collection of essays, talks, and guides on founding, fundraising, hiring, and growth.',
   NULL, 'Y Combinator', 'Y Combinator', NULL, 'other', NULL, 'en',
   ARRAY['Startups','Venture Capital','Entrepreneurship'], ARRAY['Fundraising','Strategy'],
   'curated', true, false, 70, 0.900),

  -- -------------------------------------------------------- Entrepreneurship
  ('https://paulgraham.com/wealth.html', 'https://paulgraham.com/wealth.html', 'paulgraham.com/wealth.html',
   'How to Make Wealth',
   'Wealth as something you create rather than take, and why small groups working on measurable, leveraged problems get paid for it.',
   NULL, 'Paul Graham', 'Paul Graham', '2004-05-01', 'essay', NULL, 'en',
   ARRAY['Entrepreneurship','Finance','Strategy'], ARRAY['Strategy','Bootstrapping'],
   'curated', true, false, 76, 0.920),

  ('https://kk.org/thetechnium/1000-true-fans/', 'https://kk.org/thetechnium/1000-true-fans/', 'kk.org/thetechnium/1000-true-fans',
   '1,000 True Fans',
   'The original case that a creator or niche business needs a small number of deeply committed customers, not a mass audience.',
   NULL, 'The Technium', 'Kevin Kelly', '2008-03-04', 'essay', NULL, 'en',
   ARRAY['Creator Economy','Marketing','Entrepreneurship','Consumer'], ARRAY['Marketing','Community','Distribution'],
   'curated', true, true, 90, 0.930),

  ('https://cdixon.org/2009/11/15/the-next-big-thing-will-start-out-looking-like-a-toy', 'https://cdixon.org/2009/11/15/the-next-big-thing-will-start-out-looking-like-a-toy', 'cdixon.org/2009/11/15/the-next-big-thing-will-start-out-looking-like-a-toy',
   'The next big thing will start out looking like a toy',
   'Disruptive products look like toys precisely because they under-serve today''s customers on the axis incumbents measure.',
   NULL, 'cdixon.org', 'Chris Dixon', '2009-11-15', 'essay', NULL, 'en',
   ARRAY['Entrepreneurship','Strategy','Product','Venture Capital'], ARRAY['Strategy','Product','Competitors'],
   'curated', true, false, 74, 0.910),

  -- -------------------------------------------------------------- Leadership
  ('https://www.youtube.com/watch?v=UF8uR6Z6KLc', 'https://youtube.com/watch?v=UF8uR6Z6KLc', 'youtube:UF8uR6Z6KLc',
   'Steve Jobs'' 2005 Stanford Commencement Address',
   'Three stories about connecting the dots, love and loss, and death — the most-quoted talk on founder conviction ever given.',
   'https://i.ytimg.com/vi/UF8uR6Z6KLc/hqdefault.jpg', 'Stanford', 'Steve Jobs', '2008-03-07', 'video', 902, 'en',
   ARRAY['Leadership','Entrepreneurship','Startups'], ARRAY['Leadership','Culture'],
   'curated', true, true, 96, 0.950),

  ('https://www.youtube.com/watch?v=qp0HIF3SfI4', 'https://youtube.com/watch?v=qp0HIF3SfI4', 'youtube:qp0HIF3SfI4',
   'How great leaders inspire action',
   'The "Start With Why" golden-circle talk: why people buy the reason a company exists before they buy what it makes.',
   'https://i.ytimg.com/vi/qp0HIF3SfI4/hqdefault.jpg', 'TED', 'Simon Sinek', '2009-09-28', 'video', 1080, 'en',
   ARRAY['Leadership','Marketing','Brand'], ARRAY['Leadership','Brand','Marketing'],
   'curated', true, true, 94, 0.940),

  ('https://paulgraham.com/makersschedule.html', 'https://paulgraham.com/makersschedule.html', 'paulgraham.com/makersschedule.html',
   'Maker''s Schedule, Manager''s Schedule',
   'Why a single meeting can cost a builder an entire afternoon, and how to run a company that contains both kinds of calendar.',
   NULL, 'Paul Graham', 'Paul Graham', '2009-07-01', 'essay', NULL, 'en',
   ARRAY['Leadership','Operations','Engineering'], ARRAY['Operations','Culture','Leadership'],
   'curated', true, false, 82, 0.930),

  -- ------------------------------------------------------ Behavioral Science
  ('https://www.youtube.com/watch?v=Ks-_Mh1QhMc', 'https://youtube.com/watch?v=Ks-_Mh1QhMc', 'youtube:Ks-_Mh1QhMc',
   'Your body language may shape who you are',
   'A talk on presence and confidence before high-stakes moments — useful before a pitch, a board meeting, or a hard negotiation.',
   'https://i.ytimg.com/vi/Ks-_Mh1QhMc/hqdefault.jpg', 'TED', 'Amy Cuddy', '2012-10-01', 'video', 1242, 'en',
   ARRAY['Behavioral Science','Leadership'], ARRAY['Leadership'],
   'curated', true, false, 64, 0.880),

  -- ----------------------------------------------------------------- Product
  ('https://www.svpg.com/good-product-team-bad-product-team/', 'https://svpg.com/good-product-team-bad-product-team/', 'svpg.com/good-product-team-bad-product-team',
   'Good Product Team / Bad Product Team',
   'A side-by-side contrast of how strong and weak product organizations decide what to build and who they answer to.',
   NULL, 'Silicon Valley Product Group', 'Marty Cagan', '2017-07-25', 'essay', NULL, 'en',
   ARRAY['Product','Leadership','Operations'], ARRAY['Product','Culture','Operations'],
   'curated', true, true, 84, 0.930),

  ('https://www.svpg.com/product-fail/', 'https://svpg.com/product-fail/', 'svpg.com/product-fail',
   'Product Fail',
   'The standard roadmap-and-requirements process, taken apart: where value, usability, feasibility, and viability risk actually get missed.',
   NULL, 'Silicon Valley Product Group', 'Marty Cagan', '2017-06-06', 'essay', NULL, 'en',
   ARRAY['Product','Engineering','Operations'], ARRAY['Product','Operations'],
   'curated', true, false, 72, 0.910),

  -- ---------------------------------------------------------------- Strategy
  ('https://stratechery.com/2015/aggregation-theory/', 'https://stratechery.com/2015/aggregation-theory/', 'stratechery.com/2015/aggregation-theory',
   'Aggregation Theory',
   'How owning the demand side — the user relationship — beats owning supply, and what that implies for any platform or marketplace.',
   NULL, 'Stratechery', 'Ben Thompson', '2015-07-21', 'essay', NULL, 'en',
   ARRAY['Strategy','Media','Consumer','Enterprise'], ARRAY['Strategy','Distribution','Competitors'],
   'curated', true, true, 88, 0.940),

  -- ------------------------------------------------------------- Engineering
  ('https://www.joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code/', 'https://joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code/', 'joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code',
   'The Joel Test: 12 Steps to Better Code',
   'A twelve-question audit of an engineering organization that still separates functioning teams from struggling ones.',
   NULL, 'Joel on Software', 'Joel Spolsky', '2000-08-09', 'essay', NULL, 'en',
   ARRAY['Engineering','Operations'], ARRAY['Engineering','Operations'],
   'curated', true, false, 68, 0.900),

  ('https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/', 'https://joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/', 'joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i',
   'Things You Should Never Do, Part I',
   'The case against the full rewrite: why the ugly code you want to throw away encodes years of bug fixes you cannot see.',
   NULL, 'Joel on Software', 'Joel Spolsky', '2000-04-06', 'essay', NULL, 'en',
   ARRAY['Engineering','Product','Strategy'], ARRAY['Engineering','Strategy'],
   'curated', true, false, 66, 0.900),

  -- --------------------------------------------------- Artificial Intelligence
  ('https://arxiv.org/abs/1706.03762', 'https://arxiv.org/abs/1706.03762', 'arxiv.org/abs/1706.03762',
   'Attention Is All You Need',
   'The transformer paper. Primary source for anyone whose company now depends on the architecture underneath modern AI.',
   NULL, 'arXiv', 'Vaswani et al.', '2017-06-12', 'research', NULL, 'en',
   ARRAY['Artificial Intelligence','Engineering'], ARRAY['AI','Engineering'],
   'curated', true, true, 86, 0.950),

  ('https://arxiv.org/abs/2005.14165', 'https://arxiv.org/abs/2005.14165', 'arxiv.org/abs/2005.14165',
   'Language Models are Few-Shot Learners',
   'The GPT-3 paper — where in-context learning came from, and the scaling argument that reshaped every AI product roadmap.',
   NULL, 'arXiv', 'Brown et al.', '2020-05-28', 'research', NULL, 'en',
   ARRAY['Artificial Intelligence','Engineering','Product'], ARRAY['AI','Engineering','Product'],
   'curated', true, false, 78, 0.940),

  ('https://karpathy.medium.com/software-2-0-a64152b37c35', 'https://karpathy.medium.com/software-2-0-a64152b37c35', 'karpathy.medium.com/software-2-0-a64152b37c35',
   'Software 2.0',
   'Reframes neural networks as a new kind of software stack — a useful lens for deciding what your team should still hand-write.',
   NULL, 'Medium', 'Andrej Karpathy', '2017-11-11', 'essay', NULL, 'en',
   ARRAY['Artificial Intelligence','Engineering','Strategy'], ARRAY['AI','Engineering','Strategy'],
   'curated', true, false, 76, 0.920),

  ('https://www.youtube.com/watch?v=kCc8FmEb1nY', 'https://youtube.com/watch?v=kCc8FmEb1nY', 'youtube:kCc8FmEb1nY',
   'Let''s build GPT: from scratch, in code, spelled out.',
   'A line-by-line build of a small GPT. The fastest way for a non-ML founder or operator to stop treating models as magic.',
   'https://i.ytimg.com/vi/kCc8FmEb1nY/hqdefault.jpg', 'YouTube', 'Andrej Karpathy', '2023-01-17', 'video', 7020, 'en',
   ARRAY['Artificial Intelligence','Engineering'], ARRAY['AI','Engineering'],
   'curated', true, false, 74, 0.930),

  -- ------------------------------------------------------------ Startups (video)
  ('https://www.youtube.com/watch?v=CBYhVcO4WgI', 'https://youtube.com/watch?v=CBYhVcO4WgI', 'youtube:CBYhVcO4WgI',
   'How to Start a Startup — Lecture 1: Ideas, Products, Teams and Execution',
   'The opening Stanford CS183B lecture on the four things a startup needs, and the order in which they actually matter.',
   'https://i.ytimg.com/vi/CBYhVcO4WgI/hqdefault.jpg', 'Y Combinator', 'Sam Altman, Dustin Moskovitz', '2014-09-23', 'video', 2940, 'en',
   ARRAY['Startups','Entrepreneurship','Product','Leadership'], ARRAY['Product','Leadership','Strategy'],
   'curated', true, true, 92, 0.940)

ON CONFLICT (content_key) DO NOTHING;
