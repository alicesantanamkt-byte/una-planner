create table if not exists public.suggested_slots(
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  score integer check(score between 0 and 100),
  status text not null default 'suggested' check(status in ('suggested','accepted','rejected','expired','manually_adjusted')),
  reason_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.suggested_slots enable row level security;

create policy "suggestions_client_select" on public.suggested_slots
for select to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=suggested_slots.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "admin_clients_all" on public.clients
for all to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
)
with check (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

create policy "admin_events_all" on public.calendar_events
for all to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
)
with check (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

create policy "admin_content_all" on public.content_items
for all to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
)
with check (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

create policy "admin_suggestions_all" on public.suggested_slots
for all to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
)
with check (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
