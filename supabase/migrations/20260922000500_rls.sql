-- ============================================================================
-- F1 · Row Level Security y privilegios
--
-- Modelo:
--   · anon            → sin acceso a nada.
--   · authenticated   → miembros activos. El empleado solo ve SUS posts; el admin ve todo.
--   · service_role    → Edge Functions / scripts (omite RLS).
-- Los cambios de estado de un post solo son posibles vía RPC (migración 0400):
-- a authenticated se le retiran los privilegios de columna sobre status, approved_*, etc.
-- ============================================================================

-- Partimos de cero: retiramos los privilegios por defecto de Supabase y concedemos lo mínimo.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table public.profiles                   enable row level security;
alter table public.organization_settings      enable row level security;
alter table public.listings                   enable row level security;
alter table public.listing_media              enable row level security;
alter table public.platforms                  enable row level security;
alter table public.post_types                 enable row level security;
alter table public.post_type_groups           enable row level security;
alter table public.post_type_group_platforms  enable row level security;
alter table public.templates                  enable row level security;
alter table public.template_variants          enable row level security;
alter table public.posts                      enable row level security;
alter table public.post_media                 enable row level security;
alter table public.audit_log                  enable row level security;
alter table public.notifications              enable row level security;
alter table public.social_accounts            enable row level security;
alter table public.publish_jobs               enable row level security;
alter table public.publish_attempts           enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
-- El rol y el estado activo solo cambian con set_user_role / set_user_active.
grant select on public.profiles to authenticated;
grant update (full_name, locale, avatar_url) on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ── organization_settings ───────────────────────────────────────────────────
grant select on public.organization_settings to authenticated;
grant update (name, timezone, undo_window_seconds, deleted_retention_days)
  on public.organization_settings to authenticated;

create policy org_settings_select on public.organization_settings
  for select to authenticated using (public.is_member());
create policy org_settings_update on public.organization_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── catálogo: lectura para miembros, escritura solo admin ───────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'listings', 'listing_media', 'platforms', 'post_types', 'post_type_groups',
    'post_type_group_platforms', 'templates', 'template_variants'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member())',
                   t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())',
                   t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',
                   t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())',
                   t || '_delete', t);
  end loop;
end
$$;
grant usage, select on all sequences in schema public to authenticated;

-- Los listings eliminados (borrado lógico) solo los ve el administrador.
drop policy listings_select on public.listings;
create policy listings_select on public.listings
  for select to authenticated
  using ((public.is_member() and deleted_at is null) or public.is_admin());

-- ── posts ───────────────────────────────────────────────────────────────────
grant select on public.posts to authenticated;
grant insert (
  listing_id, author_id, platform_id, post_type_id, template_id, format, lang,
  title, body, hashtags, price, beds, baths, scheduled_at
) on public.posts to authenticated;
grant update (
  listing_id, platform_id, post_type_id, template_id, format, lang,
  title, body, hashtags, price, beds, baths, scheduled_at
) on public.posts to authenticated;

create policy posts_select on public.posts
  for select to authenticated
  using ((author_id = auth.uid() and public.is_member()) or public.is_admin());

-- Los posts nuevos siempre nacen como borrador (status no es insertable).
create policy posts_insert on public.posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_member());

-- El autor solo edita mientras el post es borrador o rechazado; el admin, cualquiera.
create policy posts_update on public.posts
  for update to authenticated
  using (
    public.is_admin()
    or (author_id = auth.uid() and public.is_member() and deleted_at is null and status in ('draft', 'rejected'))
  )
  with check (
    public.is_admin()
    or (author_id = auth.uid() and status in ('draft', 'rejected'))
  );

-- ── post_media (hereda la visibilidad y editabilidad del post) ──────────────
grant select, insert, update, delete on public.post_media to authenticated;

create policy post_media_select on public.post_media
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy post_media_write on public.post_media
  for all to authenticated
  using (exists (
    select 1 from public.posts p
    where p.id = post_id
      and (public.is_admin() or (p.author_id = auth.uid() and p.status in ('draft', 'rejected') and p.deleted_at is null))
  ))
  with check (exists (
    select 1 from public.posts p
    where p.id = post_id
      and (public.is_admin() or (p.author_id = auth.uid() and p.status in ('draft', 'rejected') and p.deleted_at is null))
  ));

-- ── audit_log (solo lectura; lo escriben triggers y RPC) ────────────────────
grant select on public.audit_log to authenticated;

create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.posts p where p.id = post_id));

-- ── notifications ───────────────────────────────────────────────────────────
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── F9: solo administradores leen; solo service_role escribe ────────────────
grant select on public.social_accounts, public.publish_jobs, public.publish_attempts to authenticated;

create policy social_accounts_select on public.social_accounts
  for select to authenticated using (public.is_admin());
create policy publish_jobs_select on public.publish_jobs
  for select to authenticated using (public.is_admin());
create policy publish_attempts_select on public.publish_attempts
  for select to authenticated using (public.is_admin());

-- ── Privilegios por defecto para objetos futuros: nada para anon ────────────
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
