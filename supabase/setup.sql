-- =========================================================
-- The Beautiful Game — Supabase setup
-- Run this once in your Supabase project (SQL Editor → New query → Run).
-- Anyone can read published stories; only accounts listed in
-- public.authors can write, hide or delete them.
-- =========================================================

-- Who is allowed to write
create table if not exists public.authors (
    user_id uuid primary key references auth.users on delete cascade
);
alter table public.authors enable row level security;
-- No policies: the table is only read through is_author() below.

create or replace function public.is_author()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.authors where user_id = auth.uid());
$$;

-- Stories
create table if not exists public.articles (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    section text not null check (section in (
        'Chronicles.html',
        'football-flashbacks.html',
        'legendary-performances.html',
        'gaming-corner.html'
    )),
    teaser text not null,
    cover_url text not null,
    cover_alt text not null,
    body text not null,
    published boolean not null default true,
    author_id uuid not null default auth.uid() references auth.users,
    created_at timestamptz not null default now()
);
alter table public.articles enable row level security;

drop policy if exists "Anyone can read published stories" on public.articles;
create policy "Anyone can read published stories" on public.articles
    for select using (published or public.is_author());

drop policy if exists "Authors can add stories" on public.articles;
create policy "Authors can add stories" on public.articles
    for insert to authenticated with check (public.is_author());

drop policy if exists "Authors can edit stories" on public.articles;
create policy "Authors can edit stories" on public.articles
    for update to authenticated using (public.is_author()) with check (public.is_author());

drop policy if exists "Authors can delete stories" on public.articles;
create policy "Authors can delete stories" on public.articles
    for delete to authenticated using (public.is_author());

-- Photos (public to view, only authors can upload or remove)
insert into storage.buckets (id, name, public)
values ('article-photos', 'article-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authors can upload photos" on storage.objects;
create policy "Authors can upload photos" on storage.objects
    for insert to authenticated with check (bucket_id = 'article-photos' and public.is_author());

drop policy if exists "Authors can remove photos" on storage.objects;
create policy "Authors can remove photos" on storage.objects
    for delete to authenticated using (bucket_id = 'article-photos' and public.is_author());

-- ---------------------------------------------------------
-- LAST STEP — after creating your user in Authentication → Users,
-- put your login email below and run just this line:
--
-- insert into public.authors (user_id) select id from auth.users where email = 'you@example.com';
-- ---------------------------------------------------------
