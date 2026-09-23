-- ============================================================================
-- F1 · Tipos enumerados y utilidades comunes
-- ============================================================================

create extension if not exists citext with schema extensions;

create type public.user_role          as enum ('employee', 'admin');
create type public.post_status        as enum ('draft', 'pending', 'approved', 'publishing', 'published', 'failed', 'rejected');
create type public.post_format        as enum ('single', 'carousel', 'video');
create type public.content_lang       as enum ('zh', 'en', 'fr', 'bilingual');
create type public.media_kind         as enum ('image', 'video');
create type public.listing_status     as enum ('for_sale', 'sold', 'for_rent', 'rented', 'off');
create type public.property_type      as enum ('apartment', 'villa', 'commercial');
create type public.publish_mode       as enum ('manual', 'api');
create type public.publish_job_status as enum ('queued', 'publishing', 'published', 'failed', 'cancelled');

-- Mantiene updated_at en cada UPDATE.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
