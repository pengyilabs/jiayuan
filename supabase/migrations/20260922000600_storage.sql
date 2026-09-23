-- ============================================================================
-- F1 · Storage: buckets y políticas
--
--   post-media     (privado)  ruta: <author_id>/<post_id>/<archivo>
--                  El autor accede a su carpeta; el admin a todas.
--   listing-media  (público)  lectura abierta (URL pública); escritura solo admin.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-media',    'post-media',    false, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('listing-media', 'listing-media', true,  52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── post-media ──────────────────────────────────────────────────────────────
create policy post_media_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'post-media'
    and (public.is_admin() or ((storage.foldername(name))[1] = auth.uid()::text and public.is_member()))
  );

create policy post_media_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (public.is_admin() or ((storage.foldername(name))[1] = auth.uid()::text and public.is_member()))
  );

create policy post_media_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and (public.is_admin() or ((storage.foldername(name))[1] = auth.uid()::text and public.is_member()))
  );

create policy post_media_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (public.is_admin() or ((storage.foldername(name))[1] = auth.uid()::text and public.is_member()))
  );

-- ── listing-media ───────────────────────────────────────────────────────────
create policy listing_media_objects_select on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'listing-media');

create policy listing_media_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-media' and public.is_admin());

create policy listing_media_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-media' and public.is_admin());

create policy listing_media_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-media' and public.is_admin());
