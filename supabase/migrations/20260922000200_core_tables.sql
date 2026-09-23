-- ============================================================================
-- F1 · Tablas de dominio
-- Convenciones: textos traducibles en jsonb {zh,en,fr,es}; fechas en timestamptz (UTC);
-- borrado lógico con deleted_at; toda tabla tiene RLS (ver migración 0500).
-- ============================================================================

-- ── Usuarios y organización ─────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    extensions.citext not null unique
              check (username::text ~ '^[a-zA-Z0-9._-]{3,32}$'),
  full_name   text not null check (length(btrim(full_name)) > 0),
  role        public.user_role not null default 'employee',
  locale      text not null default 'en' check (locale in ('zh', 'en', 'fr', 'es')),
  avatar_url  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Fila única de configuración de la organización.
create table public.organization_settings (
  id                      boolean primary key default true check (id),
  name                    text not null default 'HOME DIRECT',
  timezone                text not null default 'America/Toronto',
  undo_window_seconds     integer not null default 8   check (undo_window_seconds between 3 and 120),
  deleted_retention_days  integer not null default 30  check (deleted_retention_days between 1 and 365),
  updated_at              timestamptz not null default now()
);
insert into public.organization_settings default values;

create function public.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Zona horaria no válida: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger organization_settings_timezone
  before insert or update of timezone on public.organization_settings
  for each row execute function public.validate_timezone();

-- ── Propiedades ─────────────────────────────────────────────────────────────
create table public.listings (
  id            bigint generated always as identity primary key,
  centris_id    text unique,
  title         jsonb not null check (jsonb_typeof(title) = 'object' and title <> '{}'::jsonb),
  description   jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  address       text not null,
  price         numeric(14, 2) not null check (price >= 0),
  currency      char(3) not null default 'CAD',
  beds          smallint not null default 0 check (beds >= 0),
  baths         smallint not null default 0 check (baths >= 0),
  area_sqft     integer check (area_sqft >= 0),
  property_type public.property_type not null,
  status        public.listing_status not null default 'for_sale',
  amenities     text[] not null default '{}'
                check (amenities <@ array['parking', 'gym', 'pool', 'security', 'terrace', 'storage']),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index listings_status_idx on public.listings (status) where deleted_at is null;

create table public.listing_media (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references public.listings (id) on delete cascade,
  path        text not null,
  kind        public.media_kind not null default 'image',
  position    smallint not null default 0,
  unique (listing_id, position)
);

-- ── Catálogo de plataformas y formatos ──────────────────────────────────────
create table public.platforms (
  id            text primary key check (id ~ '^[a-z_]+$'),
  name          jsonb not null check (jsonb_typeof(name) = 'object'),
  color         text not null,
  description   jsonb not null default '{}'::jsonb,
  note          jsonb,
  publish_mode  public.publish_mode not null default 'manual',
  -- F9 sustituye estas dos columnas por el estado real de public.social_accounts.
  connected     boolean not null default false,
  account_label text not null default '',
  sort_order    smallint not null default 0
);

create table public.post_types (
  platform_id   text not null references public.platforms (id) on delete cascade,
  id            text not null,
  name          jsonb not null check (jsonb_typeof(name) = 'object'),
  format_group  text not null
                check (format_group in ('image', 'carousel', 'video', 'short_video', 'story', 'live', 'article', 'text')),
  ratio_label   text not null default '',
  -- Estructura de restricciones (la puebla F5; hoy solo existe ratio_label).
  aspect_ratios text[],
  max_chars     integer check (max_chars > 0),
  max_media     integer check (max_media > 0),
  max_duration_seconds integer check (max_duration_seconds > 0),
  sort_order    smallint not null default 0,
  primary key (platform_id, id)
);

create table public.post_type_groups (
  id          text primary key
              check (id in ('image', 'carousel', 'video', 'short_video', 'story', 'live', 'article', 'text')),
  name        text not null,
  description jsonb not null default '{}'::jsonb,
  sort_order  smallint not null default 0
);

create table public.post_type_group_platforms (
  group_id    text not null references public.post_type_groups (id) on delete cascade,
  platform_id text not null references public.platforms (id) on delete cascade,
  primary key (group_id, platform_id)
);

-- ── Templates ───────────────────────────────────────────────────────────────
create table public.templates (
  id          bigint generated always as identity primary key,
  name_key    text not null unique,
  layout      text not null
              check (layout in ('hero', 'split', 'gallery', 'magazine', 'story', 'minimal', 'diagonal', 'features')),
  scene       text not null,
  lang_label  text not null,
  color       text not null,
  description jsonb not null default '{}'::jsonb,
  -- Etiquetas visibles; F5 las sustituye por template_variants.
  platform_tags text[] not null default '{}'
);

create table public.template_variants (
  id           bigint generated always as identity primary key,
  template_id  bigint not null references public.templates (id) on delete cascade,
  platform_id  text not null,
  post_type_id text not null,
  width        integer not null check (width > 0),
  height       integer not null check (height > 0),
  slots        jsonb not null default '{}'::jsonb,
  foreign key (platform_id, post_type_id) references public.post_types (platform_id, id) on delete cascade,
  unique (template_id, platform_id, post_type_id)
);

-- ── Posts ───────────────────────────────────────────────────────────────────
create table public.posts (
  id               bigint generated always as identity primary key,
  listing_id       bigint references public.listings (id) on delete set null,
  author_id        uuid not null references public.profiles (id) on delete restrict,
  platform_id      text not null references public.platforms (id),
  post_type_id     text,
  template_id      bigint references public.templates (id) on delete set null,
  format           public.post_format not null default 'single',
  lang             public.content_lang not null default 'zh',
  title            text not null check (length(btrim(title)) > 0),
  body             text not null default '',
  hashtags         text not null default '',
  -- Instantánea de los datos del listing en el momento de crear el post.
  price            numeric(14, 2) check (price >= 0),
  beds             smallint check (beds >= 0),
  baths            smallint check (baths >= 0),
  status           public.post_status not null default 'draft',
  scheduled_at     timestamptz not null,
  approved_by      uuid references public.profiles (id) on delete set null,
  approved_at      timestamptz,
  rejection_reason text,
  published_at     timestamptz,
  external_url     text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (platform_id, post_type_id) references public.post_types (platform_id, id),
  constraint posts_rejected_needs_reason
    check (status <> 'rejected' or length(btrim(coalesce(rejection_reason, ''))) > 0),
  constraint posts_approved_needs_approver
    check (status not in ('approved', 'publishing', 'published', 'failed')
           or (approved_by is not null and approved_at is not null)),
  constraint posts_published_needs_date
    check (status <> 'published' or published_at is not null)
);
create index posts_author_idx        on public.posts (author_id);
create index posts_status_idx        on public.posts (status) where deleted_at is null;
create index posts_scheduled_at_idx  on public.posts (scheduled_at) where deleted_at is null;
create index posts_listing_idx       on public.posts (listing_id);

create table public.post_media (
  id        bigint generated always as identity primary key,
  post_id   bigint not null references public.posts (id) on delete cascade,
  path      text not null,
  kind      public.media_kind not null default 'image',
  position  smallint not null default 0,
  unique (post_id, position)
);

-- ── Auditoría y notificaciones ──────────────────────────────────────────────
create table public.audit_log (
  id          bigint generated always as identity primary key,
  post_id     bigint references public.posts (id) on delete set null,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  from_status public.post_status,
  to_status   public.post_status,
  -- `previous` guarda el estado anterior necesario para deshacer la acción.
  detail      jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now(),
  undone_at   timestamptz,
  undoes      bigint references public.audit_log (id)
);
create index audit_log_post_idx on public.audit_log (post_id, id desc);

create table public.notifications (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  type      text not null,
  payload   jsonb not null default '{}'::jsonb,
  read_at   timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ── Publicación automática (F9): tablas preparadas, sin lógica todavía ──────
create table public.social_accounts (
  id                  bigint generated always as identity primary key,
  platform_id         text not null references public.platforms (id),
  external_account_id text not null,
  display_name        text not null default '',
  status              text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  -- Referencia al secreto en Supabase Vault; el token NUNCA se guarda en claro.
  secret_id           uuid,
  scopes              text[] not null default '{}',
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  unique (platform_id, external_account_id)
);

create table public.publish_jobs (
  id               bigint generated always as identity primary key,
  post_id          bigint not null references public.posts (id) on delete cascade,
  platform_id      text not null references public.platforms (id),
  run_at           timestamptz not null,
  status           public.publish_job_status not null default 'queued',
  attempts         smallint not null default 0,
  next_attempt_at  timestamptz,
  idempotency_key  text not null unique,
  external_post_id text,
  external_url     text,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index publish_jobs_due_idx on public.publish_jobs (run_at) where status = 'queued';

create table public.publish_attempts (
  id        bigint generated always as identity primary key,
  job_id    bigint not null references public.publish_jobs (id) on delete cascade,
  at        timestamptz not null default now(),
  outcome   text not null,
  summary   jsonb not null default '{}'::jsonb
);

-- ── updated_at ──────────────────────────────────────────────────────────────
create trigger profiles_updated_at    before update on public.profiles              for each row execute function public.set_updated_at();
create trigger org_settings_updated_at before update on public.organization_settings for each row execute function public.set_updated_at();
create trigger listings_updated_at    before update on public.listings              for each row execute function public.set_updated_at();
create trigger posts_updated_at       before update on public.posts                 for each row execute function public.set_updated_at();
create trigger publish_jobs_updated_at before update on public.publish_jobs         for each row execute function public.set_updated_at();
