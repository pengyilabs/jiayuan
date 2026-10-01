/**
 * Genera supabase/seed.sql (catálogo) y supabase/seed.demo.sql (datos de demostración)
 * a partir de las semillas tipadas de src/data/seed. Una sola fuente de verdad para SQL y
 * para el repositorio en memoria.
 *
 *   npm run db:seed:generate   escribe los archivos
 *   npm run db:seed:check      falla si los archivos SQL no coinciden con las semillas (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { organizationSettingsSeed } from '../src/data/seed/organization';
import { listingMediaSeed, listingsSeed } from '../src/data/seed/listings';
import {
  platformsSeed,
  postTypeGroupPlatformsSeed,
  postTypeGroupsSeed,
  postTypesSeed,
} from '../src/data/seed/platforms';
import { postMediaSeed, postsSeed } from '../src/data/seed/posts';
import { templatesSeed } from '../src/data/seed/templates';
import { templateVariantsSeed } from '../src/data/seed/template-variants';
import { ADMIN_ID, DEMO_PASSWORD, demoUsersSeed } from '../src/data/seed/users';

type Row = Record<string, unknown>;

const quote = (s: string): string => `'${s.replaceAll("'", "''")}'`;

function literal(value: unknown, column: string): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return quote(value);
  if (Array.isArray(value)) {
    return value.length === 0
      ? `'{}'::text[]`
      : `array[${value.map(v => literal(v, column)).join(', ')}]::text[]`;
  }
  return `${quote(JSON.stringify(value))}::jsonb`;
}

function insert(table: string, rows: readonly Row[], conflict = ''): string {
  if (rows.length === 0) return '';
  // Unión de columnas de todas las filas; las ausentes usan el valor por defecto.
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const override =
    columns.includes('id') && IDENTITY_ALWAYS.has(table) ? ' overriding system value' : '';
  const values = rows
    .map(row => `  (${columns.map(c => (c in row ? literal(row[c], c) : 'default')).join(', ')})`)
    .join(',\n');
  return `insert into public.${table} (${columns.join(', ')})${override} values\n${values}${conflict};\n`;
}

const ON_CONFLICT = '\non conflict do nothing';

// Tablas cuyo id es `generated always as identity`.
const IDENTITY_ALWAYS = new Set(['listings', 'templates', 'posts']);

const resetSequence = (table: string): string =>
  `do $$ begin perform setval(pg_get_serial_sequence('public.${table}', 'id'), (select coalesce(max(id), 1) from public.${table})); end $$;\n`;

function catalogSql(): string {
  const { name, timezone, undo_window_seconds, deleted_retention_days } = organizationSettingsSeed;
  return [
    '-- GENERADO por scripts/generate-seed.ts — no editar a mano (npm run db:seed:generate).',
    '-- Catálogo: plataformas, formatos, templates y configuración (re-ejecutable: ignora duplicados).',
    '',
    `update public.organization_settings set name = ${quote(name ?? '')}, timezone = ${quote(timezone ?? '')},`,
    `  undo_window_seconds = ${String(undo_window_seconds)}, deleted_retention_days = ${String(deleted_retention_days)};`,
    '',
    insert('platforms', platformsSeed, ON_CONFLICT),
    insert('post_types', postTypesSeed, ON_CONFLICT),
    insert('post_type_groups', postTypeGroupsSeed, ON_CONFLICT),
    insert('post_type_group_platforms', postTypeGroupPlatformsSeed, ON_CONFLICT),
    insert('templates', templatesSeed, ON_CONFLICT),
    resetSequence('templates'),
    insert('template_variants', templateVariantsSeed, ON_CONFLICT),
  ].join('\n');
}

function demoSql(): string {
  const users = demoUsersSeed
    .map(u => {
      const meta = JSON.stringify({
        username: u.username,
        full_name: u.fullName,
        locale: u.locale,
      });
      return `  (${quote(u.id)}, ${quote(u.email)}, ${quote(meta)}::jsonb)`;
    })
    .join(',\n');
  const identities = demoUsersSeed
    .map(
      u =>
        `  (gen_random_uuid(), ${quote(u.id)}, ${quote(JSON.stringify({ sub: u.id, email: u.email }))}::jsonb, 'email', ${quote(u.id)}, now(), now(), now())`,
    )
    .join(',\n');
  const admins = demoUsersSeed.filter(u => u.role === 'admin').map(u => quote(u.id));

  return [
    '-- GENERADO por scripts/generate-seed.ts — no editar a mano (npm run db:seed:generate).',
    '-- Datos de DEMOSTRACIÓN: usuarios, propiedades y posts. Solo desarrollo local.',
    `-- Contraseña de todos los usuarios demo: ${DEMO_PASSWORD}`,
    '',
    'insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,',
    '  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,',
    '  confirmation_token, recovery_token, email_change_token_new, email_change)',
    'select',
    "  '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email,",
    `  extensions.crypt(${quote(DEMO_PASSWORD)}, extensions.gen_salt('bf')), now(),`,
    `  '{"provider":"email","providers":["email"]}'::jsonb, v.meta, now(), now(), '', '', '', ''`,
    `from (values\n${users}\n) as v (id, email, meta);`,
    '',
    'insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values',
    `${identities};`,
    '',
    '-- En desarrollo local el administrador demo no tiene TOTP: se desactiva la exigencia de MFA.',
    '-- (En staging/producción el valor por defecto es true y NO debe cambiarse.)',
    'update public.organization_settings set require_admin_mfa = false;',
    '',
    '-- El trigger on_auth_user_created crea los perfiles como "employee"; se eleva al administrador demo.',
    `update public.profiles set role = 'admin' where id in (${admins.join(', ')});`,
    '',
    insert('listings', listingsSeed),
    resetSequence('listings'),
    insert('listing_media', listingMediaSeed),
    insert('posts', postsSeed),
    resetSequence('posts'),
    insert('post_media', postMediaSeed),
    `-- Administrador demo: ${ADMIN_ID}`,
    '',
  ].join('\n');
}

const files: Record<string, string> = {
  'supabase/seed.sql': catalogSql(),
  'supabase/seed.demo.sql': demoSql(),
};

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
let stale = false;

for (const [file, content] of Object.entries(files)) {
  const path = root + file;
  if (check) {
    const current = readFileSync(path, 'utf8');
    if (current !== content) {
      console.error(`✗ ${file} está desactualizado. Ejecuta: npm run db:seed:generate`);
      stale = true;
    }
  } else {
    writeFileSync(path, content);
    console.log(`✓ ${file}`);
  }
}
process.exit(stale ? 1 : 0);
