-- Our World · Phase 4 setup (shared journal, diary photos, live presence).
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- 7. Our journal: each entry is written by one person and readable by both of you.
--    Only its author can change or delete it.
create table if not exists public.journal (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  day        date        not null default current_date,
  mood       text,
  miss       int         not null default 0,
  body       text        not null default '',
  photos     text[]      not null default '{}',
  who        text,
  created_at timestamptz not null default now()
);
alter table public.journal add column if not exists who text;
alter table public.journal enable row level security;

drop policy if exists "own journal read"   on public.journal;
drop policy if exists "members journal read" on public.journal;
drop policy if exists "own journal write"  on public.journal;
drop policy if exists "own journal change" on public.journal;
drop policy if exists "own journal delete" on public.journal;
create policy "members journal read" on public.journal for select to authenticated using (true);
create policy "own journal write"  on public.journal for insert to authenticated with check (user_id = auth.uid());
create policy "own journal change" on public.journal for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own journal delete" on public.journal for delete to authenticated using (user_id = auth.uid());
revoke all on public.journal from anon;

-- 8. Journal photos: each person uploads into a folder named after their own user id;
--    both of you can view them, nobody signed out can.
insert into storage.buckets (id, name, public)
values ('diary', 'diary', false)
on conflict (id) do update set public = false;

drop policy if exists "own diary read"   on storage.objects;
drop policy if exists "own diary upload" on storage.objects;
drop policy if exists "own diary change" on storage.objects;
drop policy if exists "own diary delete" on storage.objects;
create policy "own diary read"   on storage.objects for select to authenticated
  using (bucket_id = 'diary');
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
