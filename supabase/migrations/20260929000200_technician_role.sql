-- ============================================================================
-- F11 · Rol de técnico (2/2): cuenta única, admin-equivalente en todo el
-- sistema (RLS, RPCs y Edge Functions dependen todos de is_admin()), más el
-- panel de operaciones exclusivo suyo. Nunca se crea por seed — ver
-- scripts/create-technician.ts y docs/ROLES.md.
-- ============================================================================

-- ── is_admin() amplía para incluir al técnico ───────────────────────────────
-- Todo lo que ya dependía de is_admin() (políticas RLS, _require_admin() en
-- las RPC, y el RPC is_admin que llaman las Edge Functions) trata al técnico
-- como administrador sin tocar nada más. Se conserva la exigencia de MFA.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.profiles p
           where p.id = auth.uid() and p.role in ('admin', 'technician') and p.active
         )
     and (
           not coalesce((select s.require_admin_mfa from public.organization_settings s), true)
           or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
         );
$$;

-- ── A lo sumo un técnico ─────────────────────────────────────────────────────
create unique index profiles_single_technician_idx
  on public.profiles (role)
  where role = 'technician';

-- ── El técnico no se asigna con set_user_role (solo con el script dedicado) ─
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.profiles;
begin
  perform public._require_admin();
  if p_role = 'technician' then
    raise exception 'El rol de técnico no se asigna por aquí' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and role = 'technician') then
    raise exception 'La cuenta de técnico no se puede modificar' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user_id returning * into r;
  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;
  return r;
end;
$$;
