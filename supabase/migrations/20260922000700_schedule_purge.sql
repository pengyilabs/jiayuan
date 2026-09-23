-- ============================================================================
-- F1 · Programa la purga diaria de posts eliminados (borrado lógico > N días).
-- Solo si pg_cron está disponible (en Supabase se habilita desde Database → Extensions).
-- Nota: los archivos de Storage de los posts purgados se limpian con una Edge Function (F4).
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-deleted-posts', '17 3 * * *', 'select public.purge_deleted_posts()');
  else
    raise notice 'pg_cron no disponible: programa public.purge_deleted_posts() manualmente';
  end if;
end
$$;
