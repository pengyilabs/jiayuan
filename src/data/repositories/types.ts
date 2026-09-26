/**
 * Contratos de acceso a datos. Los features dependen de estas interfaces, nunca de Supabase.
 * Implementaciones: `supabase.ts` (producción) y `memory.ts` (desarrollo sin backend y tests).
 */
import type { MediaFile } from '../media-validation';
import type {
  AuditEntry,
  Lang,
  Listing,
  ListingPatch,
  Notification,
  OrganizationSettings,
  Platform,
  Post,
  PostDraft,
  PostTypeGroups,
  InviteInput,
  Profile,
  Template,
  UserRole,
} from '../../types/models';

export type RepositoryErrorKind =
  'forbidden' | 'not_found' | 'invalid_state' | 'invalid_input' | 'undo_unavailable' | 'unknown';

export class RepositoryError extends Error {
  constructor(
    readonly kind: RepositoryErrorKind,
    message: string,
    cause?: unknown,
    /** Código de negocio opcional (p. ej. `username_taken`) para mostrar un mensaje concreto. */
    readonly code?: string,
  ) {
    super(message, { cause });
    this.name = 'RepositoryError';
  }
}

export interface ListingsRepository {
  list(): Promise<Listing[]>;
  update(id: number, patch: ListingPatch): Promise<Listing>;
}

/**
 * Posts. Los cambios de estado son operaciones nombradas (equivalen a las RPC de la base de
 * datos): el cliente nunca escribe `status` directamente.
 */
export interface PostsRepository {
  /** Posts visibles para el usuario actual (empleado: los suyos; admin: todos), sin borrados. */
  list(): Promise<Post[]>;
  create(draft: PostDraft): Promise<Post>;
  update(id: number, draft: Partial<PostDraft>): Promise<Post>;

  submit(id: number): Promise<Post>;
  withdraw(id: number): Promise<Post>;
  reopen(id: number): Promise<Post>;
  approve(id: number): Promise<Post>;
  reject(id: number, reason: string): Promise<Post>;
  markPublished(id: number, externalUrl?: string): Promise<Post>;
  softDelete(id: number): Promise<Post>;
  restore(id: number): Promise<Post>;

  /** Última acción registrada del post (la única que se puede deshacer). */
  latestAudit(postId: number): Promise<AuditEntry | null>;
  undo(auditId: number): Promise<Post>;

  /**
   * Sustituye todo el contenido multimedia del post por `files` (borra el anterior). Solo el
   * autor, con el post en `draft`/`rejected`, o un administrador.
   */
  setMedia(postId: number, files: readonly MediaFile[]): Promise<Post>;
}

export interface NotificationsRepository {
  /** Notificaciones del usuario autenticado, más recientes primero. */
  list(): Promise<Notification[]>;
  markRead(id: number): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface CatalogRepository {
  platforms(): Promise<Platform[]>;
  postTypeGroups(): Promise<PostTypeGroups>;
  templates(): Promise<Template[]>;
  settings(): Promise<OrganizationSettings>;
}

export interface ProfilesRepository {
  /** Perfil del usuario autenticado, o `null` si no hay sesión. */
  current(): Promise<Profile | null>;
  list(): Promise<Profile[]>;
  /** Actualiza el propio perfil (nombre, idioma). */
  updateSelf(patch: { fullName?: string; locale?: Lang }): Promise<Profile>;
  setRole(userId: string, role: UserRole): Promise<Profile>;
  setActive(userId: string, active: boolean): Promise<Profile>;
  /** Envía una invitación por correo (Edge Function `invite-user`). */
  invite(input: InviteInput): Promise<InviteOutcome>;
  resendInvite(userId: string): Promise<{ devLink?: string }>;
}

export interface InviteOutcome {
  profile: Profile;
  /** Solo en el modo demo (no envía correos): enlace para aceptar la invitación. */
  devLink?: string;
}

export interface Repositories {
  listings: ListingsRepository;
  posts: PostsRepository;
  catalog: CatalogRepository;
  profiles: ProfilesRepository;
  notifications: NotificationsRepository;
}
