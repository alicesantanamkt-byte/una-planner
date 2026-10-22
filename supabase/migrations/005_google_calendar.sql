create table if not exists public.oauth_states(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  state text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.calendar_connections(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  provider text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expiry_date bigint,
  scope text,
  sync_token text,
  connected_at timestamptz default now(),
  last_synced_at timestamptz,
  unique(client_id,provider)
);

alter table public.oauth_states enable row level security;
alter table public.calendar_connections enable row level security;

create policy "oauth_state_self_all" on public.oauth_states
for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

create policy "connection_client_select" on public.calendar_connections
for select to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=calendar_connections.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "connection_client_insert" on public.calendar_connections
for insert to authenticated
with check (
  exists(
    select 1 from public.clients c
    where c.id=calendar_connections.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "connection_client_update" on public.calendar_connections
for update to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=calendar_connections.client_id
      and c.user_id=(select auth.uid())
  )
)
with check (
  exists(
    select 1 from public.clients c
    where c.id=calendar_connections.client_id
      and c.user_id=(select auth.uid())
  )
);

-- A normal unique index is required for Supabase/PostgREST upsert with
-- onConflict:"client_id,source,external_id". PostgreSQL still allows
-- multiple NULL external_id values, so a partial index is unnecessary here.
drop index if exists public.calendar_events_external_unique;
create unique index calendar_events_external_unique
  on public.calendar_events(client_id,source,external_id);

alter table public.calendar_events
  add column if not exists metadata_json jsonb default '{}'::jsonb;

alter table public.suggested_slots
  add column if not exists google_event_id text;
