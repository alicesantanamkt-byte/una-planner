alter table public.calendar_connections
  add column if not exists watch_channel_id text,
  add column if not exists watch_resource_id text,
  add column if not exists watch_token text,
  add column if not exists watch_expiration timestamptz,
  add column if not exists auto_sync_enabled boolean not null default true;

create unique index if not exists calendar_connections_watch_channel_unique
  on public.calendar_connections(watch_channel_id)
  where watch_channel_id is not null;
