-- Our World · Supabase setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- 1. One table holds every collection (discoveries, memories, surprises, deleted).
create table if not exists public.docs (
  collection text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

-- 2. Lock it down: only signed-in users can touch anything. Nobody anonymous can.
--    (Keep "Allow new users to sign up" switched OFF so only your two accounts exist.)
alter table public.docs enable row level security;

drop policy if exists "members read"   on public.docs;
drop policy if exists "members insert" on public.docs;
drop policy if exists "members update" on public.docs;
drop policy if exists "members delete" on public.docs;
create policy "members read"   on public.docs for select to authenticated using (true);
create policy "members insert" on public.docs for insert to authenticated with check (true);
create policy "members update" on public.docs for update to authenticated using (true) with check (true);
create policy "members delete" on public.docs for delete to authenticated using (true);

revoke all on public.docs from anon;

-- 3. Partial updates (opening a letter, editing a memory) merge into the stored document.
create or replace function public.doc_merge(c text, i text, patch jsonb)
returns void
language sql
security invoker
as $$
  insert into public.docs (collection, id, data)
  values (c, i, patch)
  on conflict (collection, id)
  do update set data = public.docs.data || excluded.data, updated_at = now();
$$;
revoke all on function public.doc_merge(text, text, jsonb) from public, anon;
grant execute on function public.doc_merge(text, text, jsonb) to authenticated;

-- 4. Live updates between your two phones.
do $$
begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;

-- 5. Private photo bucket. Photos are never public; the app asks for short-lived links.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

drop policy if exists "members read photos"   on storage.objects;
drop policy if exists "members upload photos" on storage.objects;
drop policy if exists "members change photos" on storage.objects;
drop policy if exists "members delete photos" on storage.objects;
create policy "members read photos"   on storage.objects for select to authenticated using (bucket_id = 'photos');
create policy "members upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
create policy "members change photos" on storage.objects for update to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');
create policy "members delete photos" on storage.objects for delete to authenticated using (bucket_id = 'photos');

-- 6. Places you had already been (moved out of the page's public source).
insert into public.docs (collection, id, data) values
  ('discoveries', 'seed-bushkill',    '{"name":"Bushkill Falls","lat":41.1165,"lng":-75.0121,"r":20,"by":"bruce","at":0}'),
  ('discoveries', 'seed-bartonsville','{"name":"Bartonsville","lat":41.0092,"lng":-75.2510,"r":18,"by":"bruce","at":0}'),
  ('discoveries', 'seed-nyc',         '{"name":"New York City","lat":40.7580,"lng":-73.9855,"r":26,"by":"bruce","at":0}'),
  ('discoveries', 'seed-camelback',   '{"name":"Tannersville","lat":41.0514,"lng":-75.3553,"r":16,"by":"bruce","at":0}'),
  ('discoveries', 'seed-longpond',    '{"name":"Long Pond","lat":41.0536,"lng":-75.5110,"r":16,"by":"bruce","at":0}'),
  ('discoveries', 'seed-greatfalls',  '{"name":"Great Falls","lat":38.9976,"lng":-77.2530,"r":15,"by":"bruce","at":0}')
on conflict (collection, id) do nothing;
-- Our World · Phase 4 setup (journal, diary photos, live presence).
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- 7. Private journal: each entry belongs to ONE person and only that person can see it.
create table if not exists public.journal (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  day        date        not null default current_date,
  mood       text,
  miss       int         not null default 0,
  body       text        not null default '',
  photos     text[]      not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.journal enable row level security;

drop policy if exists "own journal read"   on public.journal;
drop policy if exists "own journal write"  on public.journal;
drop policy if exists "own journal change" on public.journal;
drop policy if exists "own journal delete" on public.journal;
create policy "own journal read"   on public.journal for select to authenticated using (user_id = auth.uid());
create policy "own journal write"  on public.journal for insert to authenticated with check (user_id = auth.uid());
create policy "own journal change" on public.journal for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own journal delete" on public.journal for delete to authenticated using (user_id = auth.uid());
revoke all on public.journal from anon;

-- 8. Private diary photos: each person's files live in a folder named after their own user id.
insert into storage.buckets (id, name, public)
values ('diary', 'diary', false)
on conflict (id) do update set public = false;

drop policy if exists "own diary read"   on storage.objects;
drop policy if exists "own diary upload" on storage.objects;
drop policy if exists "own diary change" on storage.objects;
drop policy if exists "own diary delete" on storage.objects;
create policy "own diary read"   on storage.objects for select to authenticated
  using (bucket_id = 'diary' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own diary upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'diary' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own diary change" on storage.objects for update to authenticated
  using (bucket_id = 'diary' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'diary' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own diary delete" on storage.objects for delete to authenticated
  using (bucket_id = 'diary' and (storage.foldername(name))[1] = auth.uid()::text);

-- 9. Live presence ("she is online", shared live location) runs over a PRIVATE realtime channel:
--    only signed-in accounts may join it.
do $$
begin
  drop policy if exists "members presence read"  on realtime.messages;
  drop policy if exists "members presence write" on realtime.messages;
  create policy "members presence read"  on realtime.messages for select to authenticated using (true);
  create policy "members presence write" on realtime.messages for insert to authenticated with check (true);
exception when others then
  raise notice 'Could not set realtime policies: %', sqlerrm;
end $$;
