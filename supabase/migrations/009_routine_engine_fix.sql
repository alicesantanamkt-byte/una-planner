alter table public.clients
  add column if not exists work_start_time time default '08:00',
  add column if not exists work_end_time time default '18:00',
  add column if not exists active_weekdays integer[] default array[1,2,3,4,5];
