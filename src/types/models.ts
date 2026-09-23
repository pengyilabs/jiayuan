/** Modelos de dominio de la aplicación (independientes de la forma de las tablas de Supabase). */

export type Lang = 'zh' | 'en' | 'fr' | 'es';

/** Texto traducible; los idiomas ausentes se resuelven con `localize()` (idioma → en → zh). */
export type LocalizedText = Partial<Record<Lang, string>>;

export type PageId = 'dashboard' | 'listings' | 'templates' | 'approvals' | 'settings';

export type PlatformId =
  | 'facebook'
  | 'instagram'
  | 'wechat_official'
  | 'wechat_channels'
  | 'xiaohongshu'
  | 'douyin'
  | 'tiktok'
  | 'youtube'
  | 'twitter';

export type UserRole = 'employee' | 'admin';

/** `invited`: invitación enviada y aún no aceptada; `disabled`: acceso revocado por un administrador. */
export type ProfileStatus = 'active' | 'invited' | 'disabled';

export interface Profile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  locale: Lang;
  active: boolean;
  status: ProfileStatus;
  lastSignInAt: string | null;
}

export interface InviteInput {
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  locale: Lang;
}

export interface OrganizationSettings {
  name: string;
  /** Zona horaria IANA con la que se muestran las fechas de publicación. */
  timezone: string;
  undoWindowSeconds: number;
  deletedRetentionDays: number;
  /** Los administradores deben verificar un código TOTP para actuar como tales. */
  requireAdminMfa: boolean;
}

// ── Posts ───────────────────────────────────────────────────────────────────
export type PostStatus =
  'draft' | 'pending' | 'approved' | 'publishing' | 'published' | 'failed' | 'rejected';
export type PostMedia = 'single' | 'carousel' | 'video';
/** Idioma del contenido del post (etiqueta visible, no confundir con `Lang` de la interfaz). */
export type PostLang = '中文' | 'English' | '双语' | 'Français';

export interface Post {
  id: number;
  listingId: number | null;
  authorId: string;
  authorName: string;
  title: string;
  platformId: PlatformId;
  postTypeId: string | null;
  templateId: number | null;
  lang: PostLang;
  status: PostStatus;
  /** Instante de publicación (ISO 8601, UTC). */
  scheduledAt: string;
  /** Día de publicación `YYYY-MM-DD` en la zona horaria de la organización. */
  date: string;
  media: PostMedia;
  images: string[];
  description: string;
  hashtags: string;
  /** Precio formateado, o `—` si el post no está ligado a una propiedad. */
  price: string;
  beds: number;
  baths: number;
  rejectionReason: string | null;
  externalUrl: string | null;
  /** Borrado lógico. */
  deleted: boolean;
}

/** Datos editables de un post (los estados cambian solo con las acciones del repositorio). */
export interface PostDraft {
  listingId: number | null;
  platformId: PlatformId;
  postTypeId?: string | null;
  templateId?: number | null;
  media?: PostMedia;
  lang?: PostLang;
  title: string;
  description?: string;
  hashtags?: string;
  scheduledAt: string;
}

/** Entrada del registro de auditoría de un post (base de "deshacer"). */
export interface AuditEntry {
  id: number;
  postId: number;
  action: string;
  at: string;
  undone: boolean;
}

// ── Propiedades ─────────────────────────────────────────────────────────────
export type ListingStatus = 'for_sale' | 'sold' | 'for_rent' | 'rented' | 'off';
export type PropertyType = 'apartment' | 'villa' | 'commercial';
export type Amenity = 'parking' | 'gym' | 'pool' | 'security' | 'terrace' | 'storage';

export interface Listing {
  id: number;
  centris: string;
  title: LocalizedText;
  description: LocalizedText;
  address: string;
  price: number;
  currency: string;
  beds: number;
  baths: number;
  areaSqft: number;
  propertyType: PropertyType;
  status: ListingStatus;
  amenities: Amenity[];
  photos: string[];
  video: string | null;
}

/** Campos de un listing que se pueden editar desde la interfaz. */
export interface ListingPatch {
  centris?: string;
  title?: LocalizedText;
  description?: LocalizedText;
  address?: string;
  price?: number;
  propertyType?: PropertyType;
  beds?: number;
  baths?: number;
  areaSqft?: number;
}

// ── Catálogo de plataformas ─────────────────────────────────────────────────
export type PostTypeGroup =
  'image' | 'carousel' | 'video' | 'short_video' | 'story' | 'live' | 'article' | 'text';

export interface PostType {
  id: string;
  name: LocalizedText;
  ratio: string;
  group: PostTypeGroup;
}

export interface Platform {
  id: PlatformId;
  name: LocalizedText;
  color: string;
  description: LocalizedText;
  note?: LocalizedText;
  publishMode: 'manual' | 'api';
  connected: boolean;
  account: string;
  postTypes: PostType[];
}

export interface PostTypeGroupInfo {
  name: string;
  description: LocalizedText;
  platforms: PlatformId[];
}
export type PostTypeGroups = Record<PostTypeGroup, PostTypeGroupInfo>;

// ── Templates ───────────────────────────────────────────────────────────────
export type TemplateLayout =
  'hero' | 'split' | 'gallery' | 'magazine' | 'story' | 'minimal' | 'diagonal' | 'features';

export interface Template {
  id: number;
  nameKey: string;
  layout: TemplateLayout;
  scene: string;
  langLabel: string;
  color: string;
  description: LocalizedText;
  platformTags: string[];
}

// ── Notificaciones ───────────────────────────────────────────────────────────
export type NotificationType =
  'post_pending' | 'post_approved' | 'post_rejected' | 'post_published';

export interface Notification {
  id: number;
  type: NotificationType;
  postId: number | null;
  /** Título del post en el momento de la notificación (puede haber cambiado desde entonces). */
  title: string;
  /** Solo en `post_rejected`. */
  reason: string | null;
  createdAt: string;
  readAt: string | null;
}

// ── Aprobaciones (derivadas de los posts pendientes) ────────────────────────
export interface Approval {
  id: number;
  postId: number;
  title: string;
  author: string;
  listing: LocalizedText | null;
  platformId: PlatformId;
  lang: PostLang;
  date: string;
}
