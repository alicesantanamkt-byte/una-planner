alter table public.clients
  add column if not exists onboarding_completed boolean default false;

drop policy if exists "clients_self_insert" on public.clients;
create policy "clients_self_insert" on public.clients
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "clients_self_select" on public.clients;
create policy "clients_self_select" on public.clients
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "clients_self_update" on public.clients;
create policy "clients_self_update" on public.clients
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "calendar_self_all" on public.calendar_events;

create policy "calendar_self_select" on public.calendar_events
for select to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id = calendar_events.client_id
      and c.user_id = (select auth.uid())
  )
);

create policy "calendar_self_insert" on public.calendar_events
for insert to authenticated
with check (
  exists(
    select 1 from public.clients c
    where c.id = calendar_events.client_id
      and c.user_id = (select auth.uid())
  )
);

create policy "calendar_self_update" on public.calendar_events
for update to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id = calendar_events.client_id
      and c.user_id = (select auth.uid())
  )
)
with check (
  exists(
    select 1 from public.clients c
    where c.id = calendar_events.client_id
      and c.user_id = (select auth.uid())
  )
);

create policy "calendar_self_delete" on public.calendar_events
for delete to authenticated
using (
  exists(
    select 1 from public.clients c
    where c.id = calendar_events.client_id
      and c.user_id = (select auth.uid())
  )
);
