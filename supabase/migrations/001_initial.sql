create extension if not exists "pgcrypto";

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'client' check(role in ('admin','client')),
  created_at timestamptz default now()
);

create table if not exists public.clients(
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  brand text,
  segment text,
  timezone text default 'America/Sao_Paulo',
  calendar_mode text check(calendar_mode in ('google','manual','hybrid')),
  recording_mode text check(recording_mode in ('block','distributed','hybrid')),
  min_free_minutes integer default 15,
  micro_capture_enabled boolean default true,
  restrictions text,
  created_at timestamptz default now()
);

create table if not exists public.calendar_events(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source text not null default 'manual' check(source in ('google','manual')),
  external_id text,
  title text not null,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  location text,
  protected boolean default false,
  capture_allowed boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.content_items(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  format text,
  publish_at timestamptz,
  estimated_minutes integer default 15,
  preferred_location text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.calendar_events enable row level security;
alter table public.content_items enable row level security;

create policy "profiles_self_select" on public.profiles
for select using (auth.uid() = id);

create policy "clients_self_select" on public.clients
for select using (auth.uid() = user_id);

create policy "clients_self_update" on public.clients
for update using (auth.uid() = user_id);

create policy "calendar_self_all" on public.calendar_events
for all using (
  exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.user_id=auth.uid())
)
with check (
  exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.user_id=auth.uid())
);

create policy "content_self_select" on public.content_items
for select using (
  exists(select 1 from public.clients c where c.id=content_items.client_id and c.user_id=auth.uid())
);
