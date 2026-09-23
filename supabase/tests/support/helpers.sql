-- ============================================================================
-- Utilidades para los tests de base de datos (pgTAP). Esquema `tests`.
-- Solo entornos de desarrollo/CI: NO forma parte de las migraciones.
-- ============================================================================
create schema if not exists tests;
grant usage on schema tests to public;

-- Crea un usuario de Auth (el trigger crea su perfil) con el rol indicado.
create or replace function tests.create_user(
  p_id uuid, p_username text, p_role public.user_role default 'employee', p_full_name text default null
) returns uuid
language plpgsql
as $$
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (p_id, p_username || '@example.test',
          jsonb_build_object('username', p_username, 'full_name', coalesce(p_full_name, initcap(p_username))));
  if p_role <> 'employee' then
    update public.profiles set role = p_role where id = p_id;
  end if;
  return p_id;
end;
$$;

-- Simula una petición autenticada (equivale a un JWT de Supabase). Por defecto, sesión AAL2.
drop function if exists tests.login_as(uuid);
create or replace function tests.login_as(p_id uuid, p_aal text default 'aal2') returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_id, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.login_as_anon() returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.logout() returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

-- UUIDs fijos legibles para los tests.
create or replace function tests.uid(n integer) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid $$;

-- Ejecuta una sentencia DML con el rol actual y devuelve las filas afectadas.
create or replace function tests.rows_affected(p_sql text) returns integer
language plpgsql
as $$
declare
  n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;
