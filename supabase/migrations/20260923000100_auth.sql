-- ============================================================================
-- F2 · Cuentas: datos de perfil sincronizados con Auth, MFA de administradores
--      y limitación de intentos de inicio de sesión.
-- ============================================================================

-- ── Perfil: correo y estado de la invitación (copiados de auth.users) ───────
alter table public.profiles
  add column email           extensions.citext,
  add column invited_at      timestamptz,
  add column confirmed_at    timestamptz,   -- la persona aceptó la invitación / confirmó su correo
  add column last_sign_in_at timestamptz;

create unique index profiles_email_key on public.profiles (email);

update public.profiles p
   set email = u.email, invited_at = u.invited_at,
       confirmed_at = u.email_confirmed_at, last_sign_in_at = u.last_sign_in_at
  from auth.users u
 where u.id = p.id;

create or replace function public.handle_new_user()
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

  -- El rol NUNCA se toma de los metadatos: todo el mundo nace como empleado.
  insert into public.profiles (id, username, full_name, locale, email, invited_at, confirmed_at)
  values (
    new.id,
    v_candidate,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), v_candidate),
    case when v_locale in ('zh', 'en', 'fr', 'es') then v_locale else 'en' end,
    new.email,
    new.invited_at,
    new.email_confirmed_at
  );
  return new;
end;
$$;

create function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = new.email,
         invited_at = new.invited_at,
         confirmed_at = new.email_confirmed_at,
         last_sign_in_at = new.last_sign_in_at
   where id = new.id
     and (email is distinct from new.email::extensions.citext
          or invited_at is distinct from new.invited_at
          or confirmed_at is distinct from new.email_confirmed_at
          or last_sign_in_at is distinct from new.last_sign_in_at);
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, invited_at, email_confirmed_at, last_sign_in_at on auth.users
  for each row execute function public.handle_auth_user_updated();

revoke all on function public.handle_auth_user_updated() from public, anon, authenticated;

-- ── MFA obligatorio para administradores (TOTP) ─────────────────────────────
-- Con `require_admin_mfa` activo, un administrador solo actúa como tal con una sesión AAL2
-- (contraseña + código TOTP). Con una sesión AAL1 se comporta como un empleado.
-- El ajuste solo se cambia con SQL / service_role (no es editable desde la aplicación).
alter table public.organization_settings
  add column require_admin_mfa boolean not null default true;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.profiles p
           where p.id = auth.uid() and p.role = 'admin' and p.active
         )
     and (
           not coalesce((select s.require_admin_mfa from public.organization_settings s), true)
           or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
         );
$$;

-- ── Limitación de intentos de inicio de sesión (fuerza bruta) ───────────────
create table public.sign_in_attempts (
  id      bigint generated always as identity primary key,
  key     text not null,          -- usuario en minúsculas, o "reset:<identificador>"
  ip      text,
  success boolean not null,
  at      timestamptz not null default now()
);
create index sign_in_attempts_key_idx on public.sign_in_attempts (key, at desc);
create index sign_in_attempts_ip_idx  on public.sign_in_attempts (ip, at desc);

alter table public.sign_in_attempts enable row level security;   -- sin políticas: solo service_role
revoke all on public.sign_in_attempts from anon, authenticated;

-- 5 fallos por usuario y 20 por IP en 15 minutos.
create function public.sign_in_allowed(p_key text, p_ip text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*) from public.sign_in_attempts
           where key = lower(p_key) and not success and at > now() - interval '15 minutes') < 5
     and (p_ip is null
          or (select count(*) from public.sign_in_attempts
               where ip = p_ip and not success and at > now() - interval '15 minutes') < 20);
$$;

create function public.record_sign_in_attempt(p_key text, p_ip text, p_success boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.sign_in_attempts (key, ip, success) values (lower(p_key), p_ip, p_success);
  if p_success then
    delete from public.sign_in_attempts where key = lower(p_key) and not success;
  end if;
end;
$$;

create function public.purge_sign_in_attempts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.sign_in_attempts where at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function
  public.sign_in_allowed(text, text), public.record_sign_in_attempt(text, text, boolean),
  public.purge_sign_in_attempts()
from public, anon, authenticated;
grant execute on function
  public.sign_in_allowed(text, text), public.record_sign_in_attempt(text, text, boolean),
  public.purge_sign_in_attempts()
to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-sign-in-attempts', '23 3 * * *', 'select public.purge_sign_in_attempts()');
  end if;
end
$$;
