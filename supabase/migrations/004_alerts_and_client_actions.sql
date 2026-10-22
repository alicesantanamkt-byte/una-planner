create table if not exists public.alerts(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  severity text not null default 'info' check(severity in ('info','attention','urgent')),
  type text,
  message text not null,
  resolved boolean default false,
  created_at timestamptz default now()
);

alter table public.alerts enable row level security;

create policy "alerts_client_insert" on public.alerts
for insert to authenticated
with check (
  exists(
    select 1 from public.clients c
    where c.id=alerts.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "alerts_client_select" on public.alerts
for select to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=alerts.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "admin_alerts_all" on public.alerts
for all to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
)
with check (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

drop policy if exists "suggestions_client_select" on public.suggested_slots;

create policy "suggestions_client_select" on public.suggested_slots
for select to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=suggested_slots.client_id
      and c.user_id=(select auth.uid())
  )
);

create policy "suggestions_client_update" on public.suggested_slots
for update to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id=suggested_slots.client_id
      and c.user_id=(select auth.uid())
  )
)
with check (
  exists(
    select 1 from public.clients c
    where c.id=suggested_slots.client_id
      and c.user_id=(select auth.uid())
  )
);
