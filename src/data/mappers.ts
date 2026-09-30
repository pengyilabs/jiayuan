/**
 * Conversión entre filas de la base de datos y modelos de dominio.
 * Compartido por el repositorio de Supabase y el de memoria: ambos producen exactamente
 * los mismos objetos.
 */
import { toDateInTimeZone } from '../core/dates';
import type {
  Amenity,
  Lang,
  Listing,
  ListingPatch,
  LocalizedText,
  Notification,
  NotificationType,
  OrganizationSettings,
  Platform,
  PlatformId,
  Post,
  PostDraft,
  PostLang,
  PostType,
  PostTypeGroup,
  PostTypeGroups,
  Profile,
  Template,
} from '../types/models';
import type { Json } from '../types/database';
import type { Tables, TablesInsert, TablesUpdate } from '../types/db';
import { formatPrice } from './format';

const LANGS: readonly Lang[] = ['zh', 'en', 'fr', 'es'];
const AMENITIES: readonly Amenity[] = ['parking', 'gym', 'pool', 'security', 'terrace', 'storage'];

/** Valida un jsonb como texto traducible (ignora claves e idiomas desconocidos). */
export function toLocalized(value: Json | null | undefined): LocalizedText {
  const result: LocalizedText = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const lang of LANGS) {
      const text = value[lang];
      if (typeof text === 'string') result[lang] = text;
    }
  }
  return result;
}

export const POST_LANG_LABEL: Readonly<Record<Tables<'posts'>['lang'], PostLang>> = {
  zh: '中文',
  en: 'English',
  fr: 'Français',
  bilingual: '双语',
};

export const POST_LANG_VALUE: Readonly<Record<PostLang, Tables<'posts'>['lang']>> = {
  中文: 'zh',
  English: 'en',
  Français: 'fr',
  双语: 'bilingual',
};

// ── Lectura ─────────────────────────────────────────────────────────────────
export function toProfile(row: Tables<'profiles'>): Profile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email ?? '',
    role: row.role,
    locale: LANGS.find(l => l === row.locale) ?? 'en',
    active: row.active,
    status: !row.active ? 'disabled' : row.confirmed_at === null ? 'invited' : 'active',
    lastSignInAt: row.last_sign_in_at,
  };
}

export function toSettings(row: Tables<'organization_settings'>): OrganizationSettings {
  return {
    name: row.name,
    timezone: row.timezone,
    undoWindowSeconds: row.undo_window_seconds,
    deletedRetentionDays: row.deleted_retention_days,
    requireAdminMfa: row.require_admin_mfa,
  };
}

type MediaRow = Pick<Tables<'listing_media'>, 'path' | 'kind' | 'position'>;

const byPosition = (a: MediaRow, b: MediaRow): number => a.position - b.position;

export function toListing(row: Tables<'listings'>, media: readonly MediaRow[]): Listing {
  const sorted = [...media].sort(byPosition);
  return {
    id: row.id,
    centris: row.centris_id ?? '',
    title: toLocalized(row.title),
    description: toLocalized(row.description),
    address: row.address,
    price: Number(row.price),
    currency: row.currency.trim(),
    beds: row.beds,
    baths: row.baths,
    areaSqft: row.area_sqft ?? 0,
    propertyType: row.property_type,
    status: row.status,
    amenities: row.amenities.filter((a): a is Amenity => AMENITIES.includes(a as Amenity)),
    photos: sorted.filter(m => m.kind === 'image').map(m => m.path),
    video: sorted.find(m => m.kind === 'video')?.path ?? null,
  };
}

export function toPostType(row: Tables<'post_types'>): PostType {
  return {
    id: row.id,
    name: toLocalized(row.name),
    ratio: row.ratio_label,
    group: row.format_group as PostTypeGroup,
    aspectRatios: row.aspect_ratios ?? [],
    maxChars: row.max_chars,
    maxMedia: row.max_media,
    maxDurationSeconds: row.max_duration_seconds,
  };
}

export function toPlatform(
  row: Tables<'platforms'>,
  types: readonly Tables<'post_types'>[],
): Platform {
  return {
    id: row.id as PlatformId,
    name: toLocalized(row.name),
    color: row.color,
    description: toLocalized(row.description),
    ...(row.note ? { note: toLocalized(row.note) } : {}),
    publishMode: row.publish_mode,
    connected: row.connected,
    account: row.account_label,
    postTypes: types
      .filter(t => t.platform_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toPostType),
  };
}

export function toPostTypeGroups(
  groups: readonly Tables<'post_type_groups'>[],
  links: readonly Pick<Tables<'post_type_group_platforms'>, 'group_id' | 'platform_id'>[],
): PostTypeGroups {
  const result = {} as PostTypeGroups;
  for (const group of [...groups].sort((a, b) => a.sort_order - b.sort_order)) {
    result[group.id as PostTypeGroup] = {
      name: group.name,
      description: toLocalized(group.description),
      platforms: links.filter(l => l.group_id === group.id).map(l => l.platform_id as PlatformId),
    };
  }
  return result;
}

export function toTemplate(
  row: Tables<'templates'>,
  variants: readonly Pick<
    Tables<'template_variants'>,
    'platform_id' | 'post_type_id' | 'width' | 'height'
  >[] = [],
): Template {
  return {
    id: row.id,
    nameKey: row.name_key,
    layout: row.layout as Template['layout'],
    scene: row.scene,
    langLabel: row.lang_label,
    color: row.color,
    description: toLocalized(row.description),
    platformTags: row.platform_tags,
    // `variants` ya debe llegar filtrada a las filas de este template (ver llamadas).
    variants: variants.map(v => ({
      platformId: v.platform_id as PlatformId,
      postTypeId: v.post_type_id,
      width: v.width,
      height: v.height,
    })),
  };
}

export function toPost(
  row: Tables<'posts'>,
  context: {
    media: readonly MediaRow[];
    authorName: string;
    timeZone: string;
  },
): Post {
  return {
    id: row.id,
    listingId: row.listing_id,
    authorId: row.author_id,
    authorName: context.authorName,
    title: row.title,
    platformId: row.platform_id as PlatformId,
    postTypeId: row.post_type_id,
    templateId: row.template_id,
    lang: POST_LANG_LABEL[row.lang],
    status: row.status,
    scheduledAt: row.scheduled_at,
    date: toDateInTimeZone(row.scheduled_at, context.timeZone),
    media: row.format,
    images: [...context.media]
      .filter(m => m.kind === 'image')
      .sort(byPosition)
      .map(m => m.path),
    description: row.body,
    hashtags: row.hashtags,
    price: row.price === null ? '—' : formatPrice(Number(row.price)),
    beds: row.beds ?? 0,
    baths: row.baths ?? 0,
    rejectionReason: row.rejection_reason,
    externalUrl: row.external_url,
    deleted: row.deleted_at !== null,
  };
}

// ── Escritura ───────────────────────────────────────────────────────────────
export function listingPatchToUpdate(patch: ListingPatch): TablesUpdate<'listings'> {
  const update: TablesUpdate<'listings'> = {};
  if (patch.centris !== undefined) update.centris_id = patch.centris;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.price !== undefined) update.price = patch.price;
  if (patch.propertyType !== undefined) update.property_type = patch.propertyType;
  if (patch.beds !== undefined) update.beds = patch.beds;
  if (patch.baths !== undefined) update.baths = patch.baths;
  if (patch.areaSqft !== undefined) update.area_sqft = patch.areaSqft;
  return update;
}

export function postDraftToInsert(draft: PostDraft, authorId: string): TablesInsert<'posts'> {
  return {
    author_id: authorId,
    listing_id: draft.listingId,
    platform_id: draft.platformId,
    post_type_id: draft.postTypeId ?? null,
    template_id: draft.templateId ?? null,
    format: draft.media ?? 'single',
    lang: POST_LANG_VALUE[draft.lang ?? '中文'],
    title: draft.title,
    body: draft.description ?? '',
    hashtags: draft.hashtags ?? '',
    scheduled_at: draft.scheduledAt,
  };
}

/** Columnas que un post permite editar directamente (el resto va por RPC). */
export function postDraftToUpdate(draft: Partial<PostDraft>): TablesUpdate<'posts'> {
  const update: TablesUpdate<'posts'> = {};
  if (draft.listingId !== undefined) update.listing_id = draft.listingId;
  if (draft.platformId !== undefined) update.platform_id = draft.platformId;
  if (draft.postTypeId !== undefined) update.post_type_id = draft.postTypeId;
  if (draft.templateId !== undefined) update.template_id = draft.templateId;
  if (draft.media !== undefined) update.format = draft.media;
  if (draft.lang !== undefined) update.lang = POST_LANG_VALUE[draft.lang];
  if (draft.title !== undefined) update.title = draft.title;
  if (draft.description !== undefined) update.body = draft.description;
  if (draft.hashtags !== undefined) update.hashtags = draft.hashtags;
  if (draft.scheduledAt !== undefined) update.scheduled_at = draft.scheduledAt;
  return update;
}

/** El `payload` es jsonb de forma libre; se leen solo las claves que la app conoce. */
export function toNotification(row: Tables<'notifications'>): Notification {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    type: row.type as NotificationType,
    postId: typeof payload.post_id === 'number' ? payload.post_id : null,
    title: typeof payload.title === 'string' ? payload.title : '',
    reason: typeof payload.reason === 'string' ? payload.reason : null,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}
