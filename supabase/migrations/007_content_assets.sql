create table if not exists public.content_assets(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_url text not null,
  storage_path text,
  asset_type text check(asset_type in ('image','video')),
  captured_at timestamptz,
  context text,
  tags_json jsonb default '[]'::jsonb,
  consent_status text,
  used_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.content_asset_matches(
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.content_assets(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  score integer check(score between 0 and 100),
  reason text,
  suggested_usage text,
  created_at timestamptz default now(),
  unique(asset_id,content_item_id)
);

alter table public.content_assets enable row level security;
alter table public.content_asset_matches enable row level security;

create policy "assets_client_all" on public.content_assets
for all to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=content_assets.client_id
      and c.user_id=(select auth.uid())
  )
)
with check (
  exists(
    select 1 from public.clients c
    where c.id=content_assets.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "matches_client_select" on public.content_asset_matches
for select to authenticated
using (
  exists(
    select 1
    from public.content_assets a
    join public.clients c on c.id=a.client_id
    where a.id=content_asset_matches.asset_id
      and c.user_id=(select auth.uid())
  )
);

create policy "matches_client_insert" on public.content_asset_matches
for insert to authenticated
with check (
  exists(
    select 1
    from public.content_assets a
    join public.clients c on c.id=a.client_id
    where a.id=content_asset_matches.asset_id
      and c.user_id=(select auth.uid())
  )
);

insert into storage.buckets (id,name,public)
values ('client-assets','client-assets',true)
on conflict (id) do nothing;

create policy "client assets upload" on storage.objects
for insert to authenticated
with check (
  bucket_id='client-assets'
  and (storage.foldername(name))[1] in (
    select id::text from public.clients where user_id=(select auth.uid())
  )
);

create policy "client assets delete" on storage.objects
for delete to authenticated
using (
  bucket_id='client-assets'
  and (storage.foldername(name))[1] in (
    select id::text from public.clients where user_id=(select auth.uid())
  )
);
