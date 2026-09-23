-- ============================================================================
-- F1 · Funciones de seguridad, triggers de reglas y auditoría
-- ============================================================================

-- ── Identidad y rol ─────────────────────────────────────────────────────────
-- El rol SIEMPRE se lee de public.profiles (nunca de user_metadata, editable por el usuario).

-- Miembro activo de la organización.
create function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.active
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.active
  );
$$;

revoke all on function public.is_member() from public, anon;
revoke all on function public.is_admin()  from public, anon;
grant execute on function public.is_member() to authenticated, service_role;
grant execute on function public.is_admin()  to authenticated, service_role;

-- ── Alta de usuarios: crea el perfil (siempre con rol employee) ─────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         integer := 0;
  v_locale    text := new.raw_user_meta_data ->> 'locale';
begin
  v_base := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1), ''),
    '[^a-zA-Z0-9._-]', '', 'g'));
  if length(v_base) < 3 then
    v_base := v_base || 'user';
  end if;
  v_base := left(v_base, 28);

  v_candidate := v_base;
  while exists (select 1 from public.profiles where username = v_candidate::extensions.citext) loop
    v_n := v_n + 1;
    v_candidate := v_base || v_n::text;
  end loop;

  insert into public.profiles (id, username, full_name, locale)
  values (
    new.id,
    v_candidate,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), v_candidate),
    case when v_locale in ('zh', 'en', 'fr', 'es') then v_locale else 'en' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Nunca dejar la organización sin administradores ─────────────────────────
create function public.profiles_guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.active)
     and not exists (
       select 1 from public.profiles p where p.role = 'admin' and p.active and p.id <> old.id
     )
  then
    raise exception 'No se puede eliminar, degradar ni desactivar al último administrador'
      using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger profiles_last_admin_update
  before update of role, active on public.profiles
  for each row execute function public.profiles_guard_last_admin();
create trigger profiles_last_admin_delete
  before delete on public.profiles
  for each row execute function public.profiles_guard_last_admin();

-- ── Máquina de estados de los posts ─────────────────────────────────────────
--   draft → pending → approved → publishing → published
--                │        │           └→ failed → publishing | approved
--                └→ rejected → draft
-- Las transiciones inversas (deshacer) están permitidas; QUIÉN puede ejecutar cada una
-- lo deciden las funciones RPC (migración 0400).
create function public.is_valid_post_transition(p_from public.post_status, p_to public.post_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from::text, p_to::text) in (
    ('draft', 'pending'),   ('pending', 'draft'),
    ('pending', 'approved'), ('pending', 'rejected'),
    ('rejected', 'draft'),   ('rejected', 'pending'),   -- rejected→pending solo por deshacer
    ('draft', 'rejected'),                               -- deshacer "reabrir"
    ('approved', 'pending'),                             -- deshacer aprobación
    ('approved', 'publishing'), ('approved', 'published'),
    ('publishing', 'published'), ('publishing', 'failed'),
    ('failed', 'publishing'),    ('failed', 'approved'),
    ('published', 'approved')                            -- deshacer publicación manual
  );
$$;

create function public.posts_enforce_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.author_id is distinct from old.author_id then
    raise exception 'El autor de un post es inmutable' using errcode = '42501';
  end if;
  if new.status is distinct from old.status
     and not public.is_valid_post_transition(old.status, new.status) then
    raise exception 'Transición de estado no permitida: % -> %', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger posts_enforce_rules
  before update on public.posts
  for each row execute function public.posts_enforce_rules();

-- ── Auditoría ───────────────────────────────────────────────────────────────
-- Estado anterior de los campos que modifican las acciones (base de "deshacer").
create function public.post_undo_snapshot(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'status', p -> 'status',
    'approved_by', p -> 'approved_by',
    'approved_at', p -> 'approved_at',
    'rejection_reason', p -> 'rejection_reason',
    'published_at', p -> 'published_at',
    'external_url', p -> 'external_url',
    'deleted_at', p -> 'deleted_at'
  );
$$;

create function public.posts_audit_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (post_id, actor_id, action, to_status)
  values (new.id, auth.uid(), 'created', new.status);
  return new;
end;
$$;

create trigger posts_audit_created
  after insert on public.posts
  for each row execute function public.posts_audit_created();

-- Edición de contenido (los cambios de estado los registra cada RPC).
create function public.posts_audit_edited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old) - array['status', 'approved_by', 'approved_at', 'rejection_reason',
                                        'published_at', 'external_url', 'deleted_at', 'updated_at'];
  v_new jsonb := to_jsonb(new) - array['status', 'approved_by', 'approved_at', 'rejection_reason',
                                        'published_at', 'external_url', 'deleted_at', 'updated_at'];
begin
  if v_old is distinct from v_new then
    insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
    values (new.id, auth.uid(), 'edited', new.status, new.status,
            jsonb_build_object('before', (select jsonb_object_agg(key, value)
                                          from jsonb_each(v_old) where v_new -> key is distinct from value)));
  end if;
  return new;
end;
$$;

create trigger posts_audit_edited
  after update on public.posts
  for each row execute function public.posts_audit_edited();

-- ── Validación de zona horaria en la creación de posts programados ──────────
-- (la zona de la organización se valida en organization_settings; los posts guardan UTC)
