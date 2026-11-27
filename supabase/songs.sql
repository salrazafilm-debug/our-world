-- Our World · shared songs (MP3 library for background music and letters).
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- A list of songs both of you can see. Each song is added by one person; either of you may remove any.
create table if not exists public.songs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null,
  path       text        not null,
  created_at timestamptz not null default now()
);
alter table public.songs enable row level security;

drop policy if exists "members songs read"   on public.songs;
drop policy if exists "members songs add"    on public.songs;
drop policy if exists "members songs remove" on public.songs;
drop policy if exists "members songs rename" on public.songs;
create policy "members songs read"   on public.songs for select to authenticated using (true);
create policy "members songs add"    on public.songs for insert to authenticated with check (user_id = auth.uid());
create policy "members songs remove" on public.songs for delete to authenticated using (true);
create policy "members songs rename" on public.songs for update to authenticated using (true) with check (true);
revoke all on public.songs from anon;

-- The files themselves live in a PRIVATE bucket: only signed-in accounts can read or add them.
insert into storage.buckets (id, name, public, file_size_limit)
values ('songs', 'songs', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "members songs files read"   on storage.objects;
drop policy if exists "members songs files add"    on storage.objects;
drop policy if exists "members songs files remove" on storage.objects;
create policy "members songs files read"   on storage.objects for select to authenticated using (bucket_id = 'songs');
create policy "members songs files add"    on storage.objects for insert to authenticated with check (bucket_id = 'songs');
create policy "members songs files remove" on storage.objects for delete to authenticated using (bucket_id = 'songs');
