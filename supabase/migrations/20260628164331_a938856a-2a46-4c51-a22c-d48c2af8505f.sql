
-- 1. Favorites enhancements
alter table public.user_favorites
  add column if not exists display_name text,
  add column if not exists sort_order integer not null default 0;

-- 2. Collections
create table if not exists public.favorite_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pins jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.favorite_collections to authenticated;
grant all on public.favorite_collections to service_role;
alter table public.favorite_collections enable row level security;
drop policy if exists "own collections read" on public.favorite_collections;
create policy "own collections read" on public.favorite_collections
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own collections write" on public.favorite_collections;
create policy "own collections write" on public.favorite_collections
  for all to authenticated
  using (auth.uid() = user_id and public.user_has_paid_plan(auth.uid()))
  with check (auth.uid() = user_id and public.user_has_paid_plan(auth.uid()));
create index if not exists favorite_collections_user_idx on public.favorite_collections(user_id, sort_order);

-- 3. Founder aliases
create table if not exists public.founder_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  alias text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists founder_aliases_canonical_idx on public.founder_aliases(canonical_name);
grant select on public.founder_aliases to authenticated, anon;
grant all on public.founder_aliases to service_role;
alter table public.founder_aliases enable row level security;
drop policy if exists "aliases readable" on public.founder_aliases;
create policy "aliases readable" on public.founder_aliases
  for select to authenticated, anon using (true);

-- 4. Episode founders column
alter table public.episodes add column if not exists founders text[] not null default '{}';
create index if not exists episodes_founders_gin on public.episodes using gin(founders);

-- 5. Seed common founder aliases
insert into public.founder_aliases (canonical_name, alias) values
  ('Elon Musk','elon musk'),('Elon Musk','elon'),('Elon Musk','@elonmusk'),('Elon Musk','elonmusk'),
  ('Paul Graham','paul graham'),('Paul Graham','pg'),('Paul Graham','@paulg'),
  ('Sam Altman','sam altman'),('Sam Altman','@sama'),('Sam Altman','sama'),
  ('Steve Jobs','steve jobs'),('Steve Jobs','jobs'),
  ('Mark Zuckerberg','mark zuckerberg'),('Mark Zuckerberg','zuck'),('Mark Zuckerberg','@zuck'),
  ('Jeff Bezos','jeff bezos'),('Jeff Bezos','bezos'),
  ('Brian Chesky','brian chesky'),('Brian Chesky','@bchesky'),
  ('Reid Hoffman','reid hoffman'),('Reid Hoffman','@reidhoffman'),
  ('Naval Ravikant','naval ravikant'),('Naval Ravikant','naval'),('Naval Ravikant','@naval'),
  ('Patrick Collison','patrick collison'),('Patrick Collison','@patrickc'),
  ('John Collison','john collison'),('John Collison','@collision'),
  ('Marc Andreessen','marc andreessen'),('Marc Andreessen','@pmarca'),
  ('Ben Horowitz','ben horowitz'),('Ben Horowitz','@bhorowitz'),
  ('Peter Thiel','peter thiel'),('Peter Thiel','thiel'),
  ('Jensen Huang','jensen huang'),('Jensen Huang','jensen'),
  ('Satya Nadella','satya nadella'),('Satya Nadella','satya'),
  ('Sundar Pichai','sundar pichai'),('Sundar Pichai','sundar'),
  ('Tim Cook','tim cook'),
  ('Jack Dorsey','jack dorsey'),('Jack Dorsey','@jack'),
  ('Travis Kalanick','travis kalanick'),
  ('Whitney Wolfe Herd','whitney wolfe herd'),('Whitney Wolfe Herd','whitney wolfe'),
  ('Sara Blakely','sara blakely'),
  ('Melanie Perkins','melanie perkins'),
  ('Tony Fadell','tony fadell'),
  ('Jony Ive','jony ive'),
  ('Demis Hassabis','demis hassabis'),
  ('Ilya Sutskever','ilya sutskever'),
  ('Fei-Fei Li','fei-fei li'),('Fei-Fei Li','fei fei li'),
  ('Aaron Levie','aaron levie'),('Aaron Levie','@levie'),
  ('Marc Benioff','marc benioff'),
  ('Garry Tan','garry tan'),('Garry Tan','@garrytan'),
  ('Gary Vaynerchuk','gary vaynerchuk'),('Gary Vaynerchuk','@garyvee'),('Gary Vaynerchuk','garyvee'),
  ('Alex Hormozi','alex hormozi'),('Alex Hormozi','@hormozi'),
  ('Y Combinator','y combinator'),('Y Combinator','yc'),('Y Combinator','@ycombinator')
on conflict (alias) do nothing;
