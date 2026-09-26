-- ============================================================================
-- F1 · RPC: único camino para cambiar el estado de un post o el rol de un usuario
-- Todas son SECURITY DEFINER con search_path fijo y validan explícitamente quién llama.
-- ============================================================================

-- Helper interno: carga y bloquea un post.
create function public._post_for_update(p_post_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.posts;
begin
  select * into v from public.posts where id = p_post_id for update;
  if not found then
    raise exception 'Post % no encontrado', p_post_id using errcode = 'P0002';
  end if;
  return v;
end;
$$;

create function public._require_member()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_member() then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
end;
$$;

create function public._require_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede realizar esta acción' using errcode = '42501';
  end if;
end;
$$;

create function public._notify(p_user_id uuid, p_type text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, payload) values (p_user_id, p_type, p_payload);
$$;

-- ── Autor ───────────────────────────────────────────────────────────────────
create function public.submit_post(p_post_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_member();
  v := public._post_for_update(p_post_id);
  if v.author_id <> auth.uid() then
    raise exception 'Solo el autor puede solicitar la aprobación' using errcode = '42501';
  end if;
  if v.deleted_at is not null or v.status <> 'draft' then
    raise exception 'Solo un borrador puede enviarse a aprobación' using errcode = '23514';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  update public.posts set status = 'pending', rejection_reason = null
   where id = v.id returning * into v;

  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'submitted', 'draft', 'pending', jsonb_build_object('previous', prev));

  perform public._notify(p.id, 'post_pending', jsonb_build_object('post_id', v.id, 'title', v.title))
     from public.profiles p where p.role = 'admin' and p.active;
  return v;
end;
$$;

create function public.withdraw_post(p_post_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_member();
  v := public._post_for_update(p_post_id);
  if v.author_id <> auth.uid() then
    raise exception 'Solo el autor puede retirar la solicitud' using errcode = '42501';
  end if;
  if v.deleted_at is not null or v.status <> 'pending' then
    raise exception 'Solo un post pendiente puede retirarse' using errcode = '23514';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  update public.posts set status = 'draft' where id = v.id returning * into v;
  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'withdrawn', 'pending', 'draft', jsonb_build_object('previous', prev));
  return v;
end;
$$;

create function public.reopen_post(p_post_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_member();
  v := public._post_for_update(p_post_id);
  if v.author_id <> auth.uid() then
    raise exception 'Solo el autor puede reabrir un post rechazado' using errcode = '42501';
  end if;
  if v.deleted_at is not null or v.status <> 'rejected' then
    raise exception 'Solo un post rechazado puede reabrirse' using errcode = '23514';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  -- El motivo del rechazo se conserva hasta que el post se vuelva a enviar.
  update public.posts set status = 'draft' where id = v.id returning * into v;
  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'reopened', 'rejected', 'draft', jsonb_build_object('previous', prev));
  return v;
end;
$$;

-- ── Administrador ───────────────────────────────────────────────────────────
create function public.approve_post(p_post_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_admin();
  v := public._post_for_update(p_post_id);
  if v.deleted_at is not null or v.status <> 'pending' then
    raise exception 'Solo un post pendiente puede aprobarse' using errcode = '23514';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  update public.posts
     set status = 'approved', approved_by = auth.uid(), approved_at = now(), rejection_reason = null
   where id = v.id returning * into v;

  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'approved', 'pending', 'approved', jsonb_build_object('previous', prev));
  perform public._notify(v.author_id, 'post_approved', jsonb_build_object('post_id', v.id, 'title', v.title));
  return v;
end;
$$;

create function public.reject_post(p_post_id bigint, p_reason text)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_admin();
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'El motivo del rechazo es obligatorio' using errcode = '22023';
  end if;
  v := public._post_for_update(p_post_id);
  if v.deleted_at is not null or v.status <> 'pending' then
    raise exception 'Solo un post pendiente puede rechazarse' using errcode = '23514';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  update public.posts set status = 'rejected', rejection_reason = btrim(p_reason)
   where id = v.id returning * into v;

  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'rejected', 'pending', 'rejected', jsonb_build_object('previous', prev));
  perform public._notify(v.author_id, 'post_rejected',
    jsonb_build_object('post_id', v.id, 'title', v.title, 'reason', v.rejection_reason));
  return v;
end;
$$;

-- Publicación manual (hasta que F9 automatice el envío a cada red).
create function public.mark_published(p_post_id bigint, p_external_url text default null)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_admin();
  v := public._post_for_update(p_post_id);
  if v.deleted_at is not null or v.status <> 'approved' then
    raise exception 'Solo un post aprobado puede marcarse como publicado' using errcode = '23514';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  update public.posts
     set status = 'published', published_at = now(), external_url = nullif(btrim(p_external_url), '')
   where id = v.id returning * into v;

  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'published', 'approved', 'published', jsonb_build_object('previous', prev));
  perform public._notify(v.author_id, 'post_published', jsonb_build_object('post_id', v.id, 'title', v.title));
  return v;
end;
$$;

-- ── Borrado lógico ──────────────────────────────────────────────────────────
create function public.soft_delete_post(p_post_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_member();
  v := public._post_for_update(p_post_id);
  if v.deleted_at is not null then
    raise exception 'El post ya está eliminado' using errcode = '23514';
  end if;
  if public.is_admin() then
    if v.status = 'publishing' then
      raise exception 'No se puede eliminar un post que se está publicando' using errcode = '23514';
    end if;
  elsif v.author_id <> auth.uid() or v.status not in ('draft', 'rejected') then
    raise exception 'Solo puedes eliminar tus borradores o posts rechazados' using errcode = '42501';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  update public.posts set deleted_at = now() where id = v.id returning * into v;
  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'deleted', v.status, v.status, jsonb_build_object('previous', prev));
  return v;
end;
$$;

create function public.restore_post(p_post_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v    public.posts;
  prev jsonb;
begin
  perform public._require_member();
  v := public._post_for_update(p_post_id);
  if v.author_id <> auth.uid() and not public.is_admin() then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  if v.deleted_at is null then
    raise exception 'El post no está eliminado' using errcode = '23514';
  end if;

  prev := public.post_undo_snapshot(to_jsonb(v));
  update public.posts set deleted_at = null where id = v.id returning * into v;
  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, detail)
  values (v.id, auth.uid(), 'restored', v.status, v.status, jsonb_build_object('previous', prev));
  return v;
end;
$$;

-- ── Deshacer ────────────────────────────────────────────────────────────────
-- Revierte la ÚLTIMA acción de un post dentro de la ventana configurada
-- (organization_settings.undo_window_seconds). Solo la revierte quien la hizo o un admin.
create function public.undo_action(p_audit_id bigint)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  a      public.audit_log;
  v      public.posts;
  win    integer;
  prev   jsonb;
begin
  perform public._require_member();

  select * into a from public.audit_log where id = p_audit_id for update;
  if not found or a.post_id is null then
    raise exception 'Acción no encontrada' using errcode = 'P0002';
  end if;
  if a.action in ('created', 'edited', 'undo') or a.undone_at is not null or not (a.detail ? 'previous') then
    raise exception 'Esta acción no se puede deshacer' using errcode = '23514';
  end if;
  if a.actor_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Solo quien realizó la acción (o un administrador) puede deshacerla' using errcode = '42501';
  end if;

  select undo_window_seconds into win from public.organization_settings;
  if now() > a.at + make_interval(secs => win) then
    raise exception 'La ventana para deshacer ha expirado' using errcode = '55000';
  end if;
  if exists (select 1 from public.audit_log l where l.post_id = a.post_id and l.id > a.id) then
    raise exception 'Solo se puede deshacer la última acción del post' using errcode = '55000';
  end if;

  v := public._post_for_update(a.post_id);
  prev := a.detail -> 'previous';

  update public.posts
     set status           = (prev ->> 'status')::public.post_status,
         approved_by      = (prev ->> 'approved_by')::uuid,
         approved_at      = (prev ->> 'approved_at')::timestamptz,
         rejection_reason = prev ->> 'rejection_reason',
         published_at     = (prev ->> 'published_at')::timestamptz,
         external_url     = prev ->> 'external_url',
         deleted_at       = (prev ->> 'deleted_at')::timestamptz
   where id = v.id returning * into v;

  update public.audit_log set undone_at = now() where id = a.id;
  insert into public.audit_log (post_id, actor_id, action, from_status, to_status, undoes)
  values (v.id, auth.uid(), 'undo', a.to_status, a.from_status, a.id);
  return v;
end;
$$;

-- ── Usuarios ────────────────────────────────────────────────────────────────
create function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.profiles;
begin
  perform public._require_admin();
  update public.profiles set role = p_role where id = p_user_id returning * into r;
  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;
  return r;
end;
$$;

create function public.set_user_active(p_user_id uuid, p_active boolean)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.profiles;
begin
  perform public._require_admin();
  update public.profiles set active = p_active where id = p_user_id returning * into r;
  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;
  return r;
end;
$$;

-- ── Purga de posts eliminados (la programa pg_cron, ver 0700) ───────────────
create function public.purge_deleted_posts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.posts p
   using public.organization_settings s
   where p.deleted_at is not null
     and p.deleted_at < now() - make_interval(days => s.deleted_retention_days);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Permisos de ejecución: nada para anon; RPC públicas solo para authenticated ──
revoke all on function
  public._post_for_update(bigint), public._require_member(), public._require_admin(),
  public._notify(uuid, text, jsonb), public.purge_deleted_posts(),
  public.posts_audit_created(), public.posts_audit_edited(), public.handle_new_user(),
  public.profiles_guard_last_admin(), public.post_undo_snapshot(jsonb),
  public.submit_post(bigint), public.withdraw_post(bigint), public.reopen_post(bigint),
  public.approve_post(bigint), public.reject_post(bigint, text), public.mark_published(bigint, text),
  public.soft_delete_post(bigint), public.restore_post(bigint), public.undo_action(bigint),
  public.set_user_role(uuid, public.user_role), public.set_user_active(uuid, boolean)
from public, anon, authenticated;

grant execute on function
  public.submit_post(bigint), public.withdraw_post(bigint), public.reopen_post(bigint),
  public.approve_post(bigint), public.reject_post(bigint, text), public.mark_published(bigint, text),
  public.soft_delete_post(bigint), public.restore_post(bigint), public.undo_action(bigint),
  public.set_user_role(uuid, public.user_role), public.set_user_active(uuid, boolean)
to authenticated, service_role;

grant execute on function public.purge_deleted_posts() to service_role;
