alter table public.content_items
  add column if not exists metadata_json jsonb default '{}'::jsonb;

create table if not exists public.ai_import_reviews(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source_filename text not null,
  source_type text not null,
  ai_payload jsonb not null,
  confidence numeric,
  status text not null default 'pending_review'
    check(status in ('pending_review','confirmed','rejected')),
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

create table if not exists public.micro_capture_suggestions(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete cascade,
  suggestion_text text not null,
  estimated_seconds integer default 30,
  tags_json jsonb default '[]'::jsonb,
  ai_payload jsonb default '{}'::jsonb,
  status text not null default 'suggested'
    check(status in ('suggested','completed','dismissed')),
  created_at timestamptz default now()
);

alter table public.ai_import_reviews enable row level security;
alter table public.micro_capture_suggestions enable row level security;

create policy "admin_ai_reviews_all" on public.ai_import_reviews
for all to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
)
with check (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

create policy "micro_capture_client_select" on public.micro_capture_suggestions
for select to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=micro_capture_suggestions.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "micro_capture_client_insert" on public.micro_capture_suggestions
for insert to authenticated
with check (
  exists(
    select 1 from public.clients c
    where c.id=micro_capture_suggestions.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "micro_capture_client_update" on public.micro_capture_suggestions
for update to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=micro_capture_suggestions.client_id
      and c.user_id=(select auth.uid())
  )
)
with check (
  exists(
    select 1 from public.clients c
    where c.id=micro_capture_suggestions.client_id
      and c.user_id=(select auth.uid())
  )
);
