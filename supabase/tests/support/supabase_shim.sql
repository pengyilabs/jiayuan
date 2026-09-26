-- ============================================================================
-- Emulación mínima de lo que Supabase ya trae (roles, auth, storage).
-- SOLO para ejecutar migraciones y tests en un PostgreSQL "pelado" (scripts/db-test.sh).
-- NO usar en Supabase: allí estos objetos existen de serie.
-- ============================================================================
create schema if not exists extensions;
grant usage on schema extensions to public;
create extension if not exists pgtap with schema extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon          nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role  nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator noinherit login password 'authenticator'; end if;
end
$$;
grant anon, authenticated, service_role to authenticator;

-- ── auth ────────────────────────────────────────────────────────────────────
create schema if not exists auth;
create table auth.users (
  instance_id            uuid,
  id                     uuid primary key default gen_random_uuid(),
  aud                    text,
  role                   text,
  email                  text unique,
  encrypted_password     text,
  email_confirmed_at     timestamptz,
  invited_at             timestamptz,
  last_sign_in_at        timestamptz,
  raw_app_meta_data      jsonb not null default '{}'::jsonb,
  raw_user_meta_data     jsonb not null default '{}'::jsonb,
  banned_until           timestamptz,
  confirmation_token     text,
  recovery_token         text,
  email_change_token_new text,
  email_change           text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create table auth.identities (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  identity_data   jsonb not null,
  provider        text not null,
  provider_id     text not null,
  last_sign_in_at timestamptz,
  created_at      timestamptz,
  updated_at      timestamptz
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- ── storage ─────────────────────────────────────────────────────────────────
create schema if not exists storage;
create table storage.buckets (
  id                 text primary key,
  name               text not null unique,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text,
  owner     uuid,
  metadata  jsonb,
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;

create function storage.foldername(name text) returns text[] language plpgsql as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
grant select on storage.objects to anon;
grant select on storage.buckets to anon, authenticated, service_role;

-- ── privilegios por defecto de Supabase en el esquema public ────────────────
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
