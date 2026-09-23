/**
 * Repositorio en memoria: permite desarrollar sin backend y ejecutar tests rápidos.
 * Aplica las mismas reglas que la base de datos (visibilidad por rol, máquina de estados,
 * auditoría y "deshacer"); el test de contrato (tests/contract) garantiza que no diverjan.
 */
import { listingMediaSeed, listingsSeed } from '../seed/listings';
import { organizationSettingsSeed } from '../seed/organization';
import {
  platformsSeed,
  postTypeGroupPlatformsSeed,
  postTypeGroupsSeed,
  postTypesSeed,
} from '../seed/platforms';
import { postMediaSeed, postsSeed } from '../seed/posts';
import { templatesSeed } from '../seed/templates';
import { ADMIN_ID } from '../seed/users';
import { createMemoryDirectory } from '../memory-directory';
import type { MemoryDirectory } from '../memory-directory';
import type { Json } from '../../types/database';
import type { Tables } from '../../types/db';
import type {
  AuditEntry,
  NotificationType,
  Post,
  PostStatus,
  Profile,
  UserRole,
} from '../../types/models';
import {
  listingPatchToUpdate,
  postDraftToInsert,
  postDraftToUpdate,
  toListing,
  toNotification,
  toPlatform,
  toPost,
  toPostTypeGroups,
  toProfile,
  toSettings,
  toTemplate,
} from '../mappers';
import {
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
} from '../../../supabase/functions/_shared/validation.ts';
import { RepositoryError } from './types';
import type { Repositories } from './types';

export interface MemoryOptions {
  /** Usuario "autenticado" (fijo o evaluado en cada operación). Por defecto, el administrador demo. */
  currentUserId?: string | (() => string);
  timeZone?: () => string;
  now?: () => Date;
  /** Directorio de usuarios compartido con el servicio de autenticación en memoria. */
  directory?: MemoryDirectory;
}

type PostRow = Tables<'posts'>;
type AuditRow = {
  id: number;
  postId: number;
  actorId: string;
  action: string;
  fromStatus: PostStatus | null;
  toStatus: PostStatus | null;
  previous: Partial<PostRow> | null;
  at: string;
  undone: boolean;
};

const EPOCH = '2026-08-01T00:00:00.000Z';

const VALID_TRANSITIONS = new Set([
  'draft>pending',
  'pending>draft',
  'pending>approved',
  'pending>rejected',
  'rejected>draft',
  'rejected>pending',
  'draft>rejected',
  'approved>pending',
  'approved>publishing',
  'approved>published',
  'publishing>published',
  'publishing>failed',
  'failed>publishing',
  'failed>approved',
  'published>approved',
]);

const PREVIOUS_KEYS = [
  'status',
  'approved_by',
  'approved_at',
  'rejection_reason',
  'published_at',
  'external_url',
  'deleted_at',
] as const;

export function createMemoryRepositories(options: MemoryOptions = {}): Repositories {
  const actor = options.currentUserId ?? ADMIN_ID;
  const currentUserId = (): string => (typeof actor === 'function' ? actor() : actor);
  const now = options.now ?? (() => new Date());
  const timeZone =
    options.timeZone ?? (() => organizationSettingsSeed.timezone ?? 'America/Toronto');

  // ── Estado (copias de las semillas, hidratadas con los valores por defecto de la base) ──
  const directory = options.directory ?? createMemoryDirectory();
  const profiles = directory.profiles;

  const listings: Tables<'listings'>[] = structuredClone(listingsSeed).map(seed => ({
    centris_id: null,
    description: {},
    currency: 'CAD',
    beds: 0,
    baths: 0,
    area_sqft: null,
    status: 'for_sale',
    amenities: [],
    created_by: null,
    created_at: EPOCH,
    updated_at: EPOCH,
    deleted_at: null,
    ...seed,
  }));

  const settings: Tables<'organization_settings'> = {
    id: true,
    name: 'HOME DIRECT',
    timezone: 'America/Toronto',
    undo_window_seconds: 8,
    deleted_retention_days: 30,
    require_admin_mfa: false, // el modo demo no tiene TOTP
    updated_at: EPOCH,
    ...structuredClone(organizationSettingsSeed),
  };

  const posts: PostRow[] = structuredClone(postsSeed).map(seed => ({
    post_type_id: null,
    template_id: null,
    format: 'single',
    lang: 'zh',
    body: '',
    hashtags: '',
    price: null,
    beds: null,
    baths: null,
    status: 'draft',
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    published_at: null,
    external_url: null,
    deleted_at: null,
    created_at: EPOCH,
    updated_at: EPOCH,
    ...seed,
  })) as PostRow[];

  const postMedia: Tables<'post_media'>[] = structuredClone(postMediaSeed).map((seed, i) => ({
    id: i + 1,
    kind: 'image',
    position: 0,
    ...seed,
  }));
  let nextMediaId = postMedia.length + 1;

  const notifications: Tables<'notifications'>[] = [];
  let nextNotificationId = 1;
  const notify = (
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): void => {
    notifications.push({
      id: nextNotificationId++,
      user_id: userId,
      type,
      payload: payload as unknown as NonNullable<Json>,
      read_at: null,
      created_at: now().toISOString(),
    });
  };
  const listingMedia: Pick<Tables<'listing_media'>, 'listing_id' | 'path' | 'kind' | 'position'>[] =
    listingMediaSeed.map(m => ({
      listing_id: m.listing_id,
      path: m.path,
      kind: m.kind ?? 'image',
      position: m.position ?? 0,
    }));

  const audit: AuditRow[] = [];
  let nextPostId = Math.max(0, ...posts.map(p => p.id)) + 1;
  let nextAuditId = 1;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const me = (): Tables<'profiles'> => {
    const row = profiles.find(p => p.id === currentUserId());
    if (!row?.active) throw new RepositoryError('forbidden', 'Acceso denegado');
    return row;
  };
  const isAdmin = (): boolean => me().role === 'admin';
  const requireAdmin = (): void => {
    if (!isAdmin())
      throw new RepositoryError('forbidden', 'Solo un administrador puede realizar esta acción');
  };

  const canSee = (row: PostRow): boolean => isAdmin() || row.author_id === me().id;

  const findPost = (id: number): PostRow => {
    const row = posts.find(p => p.id === id);
    if (!row) throw new RepositoryError('not_found', `Post ${String(id)} no encontrado`);
    return row;
  };

  const domainPost = (row: PostRow): Post =>
    toPost(row, {
      media: postMedia.filter(m => m.post_id === row.id),
      authorName: profiles.find(p => p.id === row.author_id)?.full_name ?? '',
      timeZone: timeZone(),
    });

  const record = (
    row: PostRow,
    action: string,
    from: PostStatus | null,
    to: PostStatus | null,
    previous: Partial<PostRow> | null,
  ): void => {
    audit.push({
      id: nextAuditId++,
      postId: row.id,
      actorId: me().id,
      action,
      fromStatus: from,
      toStatus: to,
      previous,
      at: now().toISOString(),
      undone: false,
    });
  };

  const snapshot = (row: PostRow): Partial<PostRow> => {
    const previous: Record<string, unknown> = {};
    for (const key of PREVIOUS_KEYS) previous[key] = row[key];
    return previous;
  };

  const setStatus = (row: PostRow, next: PostStatus): void => {
    if (!VALID_TRANSITIONS.has(`${row.status}>${next}`)) {
      throw new RepositoryError(
        'invalid_state',
        `Transición de estado no permitida: ${row.status} -> ${next}`,
      );
    }
    row.status = next;
    row.updated_at = now().toISOString();
  };

  /** Ejecuta una acción de estado registrando su auditoría. */
  const transition = (
    id: number,
    action: string,
    guard: (row: PostRow) => void,
    to: PostStatus | null,
    apply: (row: PostRow) => void,
  ): Post => {
    const row = findPost(id);
    guard(row);
    const previous = snapshot(row);
    const from = row.status;
    if (to) setStatus(row, to);
    apply(row);
    record(row, action, from, to ?? from, previous);
    return domainPost(row);
  };

  const requireAuthor = (row: PostRow, message: string): void => {
    if (row.author_id !== me().id) throw new RepositoryError('forbidden', message);
  };
  const requireState = (row: PostRow, status: PostStatus, message: string): void => {
    if (row.deleted_at !== null || row.status !== status)
      throw new RepositoryError('invalid_state', message);
  };

  // ── Repositorios ───────────────────────────────────────────────────────────
  return asAsync({
    listings: {
      list() {
        me();
        return Promise.resolve(
          listings
            .filter(l => l.deleted_at === null)
            .map(l =>
              toListing(
                l,
                listingMedia.filter(m => m.listing_id === l.id),
              ),
            ),
        );
      },
      update(id, patch) {
        requireAdmin();
        const row = listings.find(l => l.id === id);
        if (!row) return Promise.reject(new RepositoryError('not_found', 'Listing no encontrado'));
        Object.assign(row, listingPatchToUpdate(patch), { updated_at: now().toISOString() });
        return Promise.resolve(
          toListing(
            row,
            listingMedia.filter(m => m.listing_id === id),
          ),
        );
      },
    },

    posts: {
      list() {
        return Promise.resolve(
          posts.filter(p => p.deleted_at === null && canSee(p)).map(domainPost),
        );
      },
      create(draft) {
        const row: PostRow = {
          id: nextPostId++,
          post_type_id: null,
          template_id: null,
          format: 'single',
          lang: 'zh',
          body: '',
          hashtags: '',
          price: null,
          beds: null,
          baths: null,
          status: 'draft',
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
          published_at: null,
          external_url: null,
          deleted_at: null,
          created_at: now().toISOString(),
          updated_at: now().toISOString(),
          ...postDraftToInsert(draft, me().id),
        } as PostRow;
        posts.push(row);
        record(row, 'created', null, 'draft', null);
        return Promise.resolve(domainPost(row));
      },
      update(id, draft) {
        const row = findPost(id);
        const editable =
          isAdmin() ||
          (row.author_id === me().id &&
            row.deleted_at === null &&
            ['draft', 'rejected'].includes(row.status));
        if (!canSee(row) || !editable)
          throw new RepositoryError('forbidden', 'No puedes editar este post');
        Object.assign(row, postDraftToUpdate(draft), { updated_at: now().toISOString() });
        return Promise.resolve(domainPost(row));
      },

      submit: id =>
        run(() => {
          const post = transition(
            id,
            'submitted',
            row => {
              requireAuthor(row, 'Solo el autor puede solicitar la aprobación');
              requireState(row, 'draft', 'Solo un borrador puede enviarse a aprobación');
            },
            'pending',
            row => {
              row.rejection_reason = null;
            },
          );
          for (const admin of profiles.filter(p => p.role === 'admin' && p.active)) {
            notify(admin.id, 'post_pending', { post_id: post.id, title: post.title });
          }
          return post;
        }),
      withdraw: id =>
        run(() =>
          transition(
            id,
            'withdrawn',
            row => {
              requireAuthor(row, 'Solo el autor puede retirar la solicitud');
              requireState(row, 'pending', 'Solo un post pendiente puede retirarse');
            },
            'draft',
            () => undefined,
          ),
        ),
      reopen: id =>
        run(() =>
          transition(
            id,
            'reopened',
            row => {
              requireAuthor(row, 'Solo el autor puede reabrir un post rechazado');
              requireState(row, 'rejected', 'Solo un post rechazado puede reabrirse');
            },
            'draft',
            () => undefined,
          ),
        ),
      approve: id =>
        run(() => {
          const post = transition(
            id,
            'approved',
            row => {
              requireAdmin();
              requireState(row, 'pending', 'Solo un post pendiente puede aprobarse');
            },
            'approved',
            row => {
              row.approved_by = me().id;
              row.approved_at = now().toISOString();
              row.rejection_reason = null;
            },
          );
          notify(post.authorId, 'post_approved', { post_id: post.id, title: post.title });
          return post;
        }),
      reject: (id, reason) =>
        run(() => {
          requireAdmin();
          if (reason.trim() === '')
            throw new RepositoryError('invalid_input', 'El motivo del rechazo es obligatorio');
          const post = transition(
            id,
            'rejected',
            row => {
              requireState(row, 'pending', 'Solo un post pendiente puede rechazarse');
            },
            'rejected',
            row => {
              row.rejection_reason = reason.trim();
            },
          );
          notify(post.authorId, 'post_rejected', {
            post_id: post.id,
            title: post.title,
            reason: post.rejectionReason,
          });
          return post;
        }),
      markPublished: (id, externalUrl) =>
        run(() => {
          const post = transition(
            id,
            'published',
            row => {
              requireAdmin();
              requireState(row, 'approved', 'Solo un post aprobado puede marcarse como publicado');
            },
            'published',
            row => {
              row.published_at = now().toISOString();
              row.external_url = externalUrl?.trim() ? externalUrl.trim() : null;
            },
          );
          notify(post.authorId, 'post_published', { post_id: post.id, title: post.title });
          return post;
        }),
      softDelete: id =>
        run(() =>
          transition(
            id,
            'deleted',
            row => {
              me();
              if (row.deleted_at !== null)
                throw new RepositoryError('invalid_state', 'El post ya está eliminado');
              if (isAdmin()) {
                if (row.status === 'publishing')
                  throw new RepositoryError('invalid_state', 'El post se está publicando');
              } else if (row.author_id !== me().id || !['draft', 'rejected'].includes(row.status)) {
                throw new RepositoryError(
                  'forbidden',
                  'Solo puedes eliminar tus borradores o posts rechazados',
                );
              }
            },
            null,
            row => {
              row.deleted_at = now().toISOString();
            },
          ),
        ),
      restore: id =>
        run(() =>
          transition(
            id,
            'restored',
            row => {
              me();
              if (row.author_id !== me().id && !isAdmin())
                throw new RepositoryError('forbidden', 'Acceso denegado');
              if (row.deleted_at === null)
                throw new RepositoryError('invalid_state', 'El post no está eliminado');
            },
            null,
            row => {
              row.deleted_at = null;
            },
          ),
        ),

      latestAudit(postId): Promise<AuditEntry | null> {
        const last = audit.filter(a => a.postId === postId).at(-1);
        const row = posts.find(p => p.id === postId);
        if (!last || !row || !canSee(row)) return Promise.resolve(null);
        return Promise.resolve({
          id: last.id,
          postId,
          action: last.action,
          at: last.at,
          undone: last.undone,
        });
      },
      undo: auditId =>
        run(() => {
          me();
          const entry = audit.find(a => a.id === auditId);
          if (!entry) throw new RepositoryError('not_found', 'Acción no encontrada');
          if (
            ['created', 'edited', 'undo'].includes(entry.action) ||
            entry.undone ||
            !entry.previous
          ) {
            throw new RepositoryError('invalid_state', 'Esta acción no se puede deshacer');
          }
          if (entry.actorId !== me().id && !isAdmin()) {
            throw new RepositoryError(
              'forbidden',
              'Solo quien realizó la acción (o un administrador) puede deshacerla',
            );
          }
          if (
            now().getTime() >
            new Date(entry.at).getTime() + settings.undo_window_seconds * 1000
          ) {
            throw new RepositoryError('undo_unavailable', 'La ventana para deshacer ha expirado');
          }
          if (audit.some(a => a.postId === entry.postId && a.id > entry.id)) {
            throw new RepositoryError(
              'undo_unavailable',
              'Solo se puede deshacer la última acción del post',
            );
          }
          const row = findPost(entry.postId);
          const restored = entry.previous;
          if (restored.status && restored.status !== row.status) setStatus(row, restored.status);
          Object.assign(row, restored, { updated_at: now().toISOString() });
          entry.undone = true;
          record(row, 'undo', entry.toStatus, entry.fromStatus, null);
          return domainPost(row);
        }),

      setMedia(postId, files) {
        return run(() => {
          const row = findPost(postId);
          const editable =
            isAdmin() ||
            (row.author_id === me().id &&
              row.deleted_at === null &&
              ['draft', 'rejected'].includes(row.status));
          if (!canSee(row) || !editable) {
            throw new RepositoryError('forbidden', 'No puedes modificar los archivos de este post');
          }

          // Sustituye todo el contenido: revoca las URL de objeto anteriores (no son persistentes)
          // y sustituye las filas de `postMedia` de este post por las nuevas.
          for (const media of postMedia) {
            if (media.post_id === postId && media.path.startsWith('blob:')) {
              URL.revokeObjectURL(media.path);
            }
          }
          const others = postMedia.filter(m => m.post_id !== postId);
          postMedia.length = 0;
          postMedia.push(...others);
          files.forEach((f, i) => {
            postMedia.push({
              id: nextMediaId++,
              post_id: postId,
              path: URL.createObjectURL(f.file),
              kind: f.kind,
              position: i,
            });
          });

          row.updated_at = now().toISOString();
          return domainPost(row);
        });
      },
    },

    notifications: {
      list() {
        const id = me().id;
        return Promise.resolve(
          notifications
            .filter(n => n.user_id === id)
            .slice()
            .reverse()
            .map(toNotification),
        );
      },
      markRead(id) {
        const row = notifications.find(n => n.id === id && n.user_id === me().id);
        if (row) row.read_at = now().toISOString();
        return Promise.resolve();
      },
      markAllRead() {
        const id = me().id;
        notifications.forEach(n => {
          if (n.user_id === id) n.read_at = now().toISOString();
        });
        return Promise.resolve();
      },
    },

    catalog: {
      platforms() {
        me();
        return Promise.resolve(
          platformsSeed.map(row =>
            toPlatform(
              {
                note: null,
                description: {},
                connected: false,
                account_label: '',
                publish_mode: 'manual',
                sort_order: 0,
                ...row,
              },
              postTypesSeed.map(t => ({
                aspect_ratios: null,
                max_chars: null,
                max_media: null,
                max_duration_seconds: null,
                sort_order: 0,
                ratio_label: '',
                ...t,
              })),
            ),
          ),
        );
      },
      postTypeGroups() {
        me();
        return Promise.resolve(
          toPostTypeGroups(
            postTypeGroupsSeed.map(g => ({ description: {}, sort_order: 0, ...g })),
            postTypeGroupPlatformsSeed,
          ),
        );
      },
      templates() {
        me();
        return Promise.resolve(
          templatesSeed.map(t => toTemplate({ description: {}, platform_tags: [], ...t })),
        );
      },
      settings() {
        me();
        return Promise.resolve(toSettings(settings));
      },
    },

    profiles: {
      current(): Promise<Profile | null> {
        const row = profiles.find(p => p.id === currentUserId());
        return Promise.resolve(row ? toProfile(row) : null);
      },
      list() {
        // Igual que RLS: el empleado solo ve su propio perfil; el administrador, todos.
        const visible = profiles.filter(p => isAdmin() || p.id === me().id);
        return Promise.resolve(visible.map(toProfile));
      },
      updateSelf(patch) {
        const row = profiles.find(p => p.id === me().id);
        if (!row) throw new RepositoryError('forbidden', 'Acceso denegado');
        if (patch.fullName !== undefined) row.full_name = patch.fullName;
        if (patch.locale !== undefined) row.locale = patch.locale;
        return Promise.resolve(toProfile(row));
      },
      setRole(userId, role: UserRole) {
        requireAdmin();
        const row = profiles.find(p => p.id === userId);
        if (!row) return Promise.reject(new RepositoryError('not_found', 'Usuario no encontrado'));
        guardLastAdmin(row, role, row.active);
        row.role = role;
        return Promise.resolve(toProfile(row));
      },
      setActive(userId, active) {
        requireAdmin();
        const row = profiles.find(p => p.id === userId);
        if (!row) return Promise.reject(new RepositoryError('not_found', 'Usuario no encontrado'));
        guardLastAdmin(row, row.role, active);
        row.active = active;
        return Promise.resolve(toProfile(row));
      },
      invite(input) {
        requireAdmin();
        const username = normalizeUsername(input.username);
        const email = normalizeEmail(input.email);
        if (!isValidEmail(email))
          throw new RepositoryError(
            'invalid_input',
            'Correo no válido',
            undefined,
            'invalid_email',
          );
        if (!isValidUsername(username))
          throw new RepositoryError(
            'invalid_input',
            'Usuario no válido',
            undefined,
            'invalid_username',
          );
        if (input.fullName.trim() === '')
          throw new RepositoryError('invalid_input', 'Nombre obligatorio');
        if (profiles.some(p => p.username.toLowerCase() === username)) {
          throw new RepositoryError(
            'invalid_input',
            'El usuario ya existe',
            undefined,
            'username_taken',
          );
        }
        if (profiles.some(p => p.email?.toLowerCase() === email)) {
          throw new RepositoryError(
            'invalid_input',
            'El correo ya existe',
            undefined,
            'email_taken',
          );
        }
        const row: Tables<'profiles'> = {
          id: crypto.randomUUID(),
          username,
          full_name: input.fullName.trim(),
          email,
          role: input.role,
          locale: input.locale,
          avatar_url: null,
          active: true,
          invited_at: now().toISOString(),
          confirmed_at: null,
          last_sign_in_at: null,
          created_at: now().toISOString(),
          updated_at: now().toISOString(),
        };
        profiles.push(row);
        return Promise.resolve({ profile: toProfile(row), devLink: issueInvite(row.id) });
      },
      resendInvite(userId) {
        requireAdmin();
        const row = profiles.find(p => p.id === userId);
        if (!row) throw new RepositoryError('not_found', 'Usuario no encontrado');
        if (row.confirmed_at !== null) {
          throw new RepositoryError(
            'invalid_state',
            'La invitación ya fue aceptada',
            undefined,
            'already_accepted',
          );
        }
        return Promise.resolve({ devLink: issueInvite(row.id) });
      },
    },
  });

  /** Genera (y sustituye) el token de invitación de un usuario; el enlace solo existe en modo demo. */
  function issueInvite(userId: string): string {
    for (const [token, id] of directory.invites) if (id === userId) directory.invites.delete(token);
    const token = crypto.randomUUID();
    directory.invites.set(token, userId);
    return `/accept-invite?invite=${token}`;
  }

  function guardLastAdmin(row: Tables<'profiles'>, role: UserRole, active: boolean): void {
    const otherAdmin = profiles.some(p => p.id !== row.id && p.role === 'admin' && p.active);
    if (row.role === 'admin' && row.active && (role !== 'admin' || !active) && !otherAdmin) {
      throw new RepositoryError(
        'invalid_state',
        'No se puede degradar ni desactivar al último administrador',
      );
    }
  }
}

/**
 * Garantiza que ninguna operación lance de forma síncrona: como la red, siempre devuelve una
 * promesa (resuelta o rechazada).
 */
function asAsync(repos: Repositories): Repositories {
  const wrap = <T extends object>(group: T): T => {
    const wrapped: Record<string, unknown> = {};
    for (const [key, fn] of Object.entries(group)) {
      wrapped[key] = (...args: unknown[]): Promise<unknown> => {
        try {
          return Promise.resolve((fn as (...a: unknown[]) => unknown)(...args));
        } catch (error) {
          return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
    }
    return wrapped as T;
  };
  return {
    listings: wrap(repos.listings),
    posts: wrap(repos.posts),
    catalog: wrap(repos.catalog),
    profiles: wrap(repos.profiles),
    notifications: wrap(repos.notifications),
  };
}

/** Convierte una operación síncrona (que puede lanzar) en una promesa, como haría la red. */
function run<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}
