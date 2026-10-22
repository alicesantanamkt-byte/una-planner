alter table public.content_assets
  alter column file_url drop not null;

update storage.buckets
set public = false
where id = 'client-assets';

drop policy if exists "client assets upload" on storage.objects;
drop policy if exists "client assets delete" on storage.objects;

create policy "client assets select" on storage.objects
for select to authenticated
using (
  bucket_id='client-assets'
  and (storage.foldername(name))[1] in (
    select id::text from public.clients where user_id=(select auth.uid())
  )
);

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

create policy "admin_assets_select" on public.content_assets
for select to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

create policy "admin_matches_select" on public.content_asset_matches
for select to authenticated
using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
