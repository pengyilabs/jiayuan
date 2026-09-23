/** Implementación de los repositorios sobre Supabase (PostgREST + RPC), protegida por RLS. */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { Tables, TablesUpdate } from '../../types/db';
import type { AuditEntry, Post, Profile, UserRole } from '../../types/models';
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
import { invokeFunction } from '../functions';
import { RepositoryError } from './types';
import type { RepositoryErrorKind, Repositories } from './types';

export type Client = SupabaseClient<Database>;

const ERROR_KINDS: Readonly<Record<string, RepositoryErrorKind>> = {
  '42501': 'forbidden',
  PGRST301: 'forbidden',
  P0002: 'not_found',
  PGRST116: 'not_found',
  '23514': 'invalid_state',
  '22023': 'invalid_input',
  '23503': 'invalid_input',
  '23505': 'invalid_input',
  '55000': 'undo_unavailable',
};

export function toRepositoryError(error: PostgrestError): RepositoryError {
  return new RepositoryError(ERROR_KINDS[error.code] ?? 'unknown', error.message, error);
}

/**
 * Un UPDATE que RLS filtra devuelve 0 filas: desde el cliente es indistinguible de "no existe",
 * así que se informa como `forbidden` (no revela si el registro existe).
 */
async function unwrapUpdate<T>(
  query: PromiseLike<{ data: T; error: PostgrestError | null }>,
): Promise<NonNullable<T>> {
  try {
    return unwrap(await query);
  } catch (error) {
    if (error instanceof RepositoryError && error.kind === 'not_found') {
      throw new RepositoryError(
        'forbidden',
        'No tienes permiso para modificar este registro',
        error,
      );
    }
    throw error;
  }
}

/** Desenvuelve una respuesta de Supabase o lanza `RepositoryError`. */
function unwrap<T>(result: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (result.error) throw toRepositoryError(result.error);
  if (result.data === null || result.data === undefined) {
    throw new RepositoryError('not_found', 'Sin resultados');
  }
  return result.data;
}

const FUNCTION_ERROR_KINDS: Readonly<Record<string, RepositoryErrorKind>> = {
  invalid_request: 'invalid_input',
  invalid_username: 'invalid_input',
  invalid_email: 'invalid_input',
  username_taken: 'invalid_input',
  email_taken: 'invalid_input',
  already_accepted: 'invalid_state',
  not_found: 'not_found',
  forbidden: 'forbidden',
  unauthenticated: 'forbidden',
};

/** Traduce el error de una Edge Function (`{ error: { code } }`) a `RepositoryError`. */
async function toFunctionError(error: unknown): Promise<RepositoryError> {
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: { code?: string } };
      const code = body.error?.code;
      if (code)
        return new RepositoryError(FUNCTION_ERROR_KINDS[code] ?? 'unknown', code, error, code);
    } catch {
      // cuerpo no JSON: se informa como error desconocido
    }
  }
  return new RepositoryError('unknown', 'Error al invocar la función', error);
}

const POST_SELECT =
  '*, author:profiles!posts_author_id_fkey(full_name), post_media(path, kind, position)';

export interface SupabaseOptions {
  /** Zona horaria de la organización, para calcular el día de publicación de cada post. */
  timeZone: () => string;
  /** Id del usuario autenticado. Por defecto se lee de la sesión de Supabase Auth. */
  userId?: () => Promise<string | null>;
}

export function createSupabaseRepositories(client: Client, options: SupabaseOptions): Repositories {
  const currentUserId =
    options.userId ??
    (async (): Promise<string | null> => {
      const { data } = await client.auth.getSession();
      return data.session?.user.id ?? null;
    });

  /** URLs firmadas (7 días) para los archivos subidos a Storage; las rutas de la demo (que no
   *  son objetos reales del bucket) simplemente no se resuelven y se devuelven tal cual. */
  const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
  const signMediaPaths = async (paths: readonly string[]): Promise<Map<string, string>> => {
    const map = new Map<string, string>();
    if (paths.length === 0) return map;
    const { data } = await client.storage
      .from('post-media')
      .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS);
    for (const entry of data ?? []) {
      if (entry.signedUrl && !entry.error && entry.path) map.set(entry.path, entry.signedUrl);
    }
    return map;
  };

  const mapPost = async (
    row: Tables<'posts'> & {
      author: { full_name: string } | null;
      post_media: Pick<Tables<'post_media'>, 'path' | 'kind' | 'position'>[];
    },
  ): Promise<Post> => {
    const signed = await signMediaPaths(row.post_media.map(m => m.path));
    const media = row.post_media.map(m => ({ ...m, path: signed.get(m.path) ?? m.path }));
    return toPost(row, {
      media,
      authorName: row.author?.full_name ?? '',
      timeZone: options.timeZone(),
    });
  };

  const fetchPost = async (id: number): Promise<Post> =>
    mapPost(unwrap(await client.from('posts').select(POST_SELECT).eq('id', id).single()));

  const rpcPost = async (
    call: PromiseLike<{ data: Tables<'posts'> | null; error: PostgrestError | null }>,
  ): Promise<Post> => {
    const row = unwrap(await call);
    return fetchPost(row.id);
  };

  return {
    listings: {
      async list() {
        const rows = unwrap(
          await client
            .from('listings')
            .select('*, listing_media(path, kind, position)')
            .is('deleted_at', null)
            .order('id'),
        );
        return rows.map(row => toListing(row, row.listing_media));
      },
      async update(id, patch) {
        await unwrapUpdate(
          client
            .from('listings')
            .update(listingPatchToUpdate(patch))
            .eq('id', id)
            .select('id')
            .single(),
        );
        const row = unwrap(
          await client
            .from('listings')
            .select('*, listing_media(path, kind, position)')
            .eq('id', id)
            .single(),
        );
        return toListing(row, row.listing_media);
      },
    },

    posts: {
      async list() {
        const rows = unwrap(
          await client.from('posts').select(POST_SELECT).is('deleted_at', null).order('id'),
        );
        return Promise.all(rows.map(mapPost));
      },
      async create(draft) {
        const userId = await currentUserId();
        if (!userId) throw new RepositoryError('forbidden', 'No hay sesión iniciada');
        const row = unwrap(
          await client.from('posts').insert(postDraftToInsert(draft, userId)).select('id').single(),
        );
        return fetchPost(row.id);
      },
      async update(id, draft) {
        await unwrapUpdate(
          client.from('posts').update(postDraftToUpdate(draft)).eq('id', id).select('id').single(),
        );
        return fetchPost(id);
      },
      submit: id => rpcPost(client.rpc('submit_post', { p_post_id: id })),
      withdraw: id => rpcPost(client.rpc('withdraw_post', { p_post_id: id })),
      reopen: id => rpcPost(client.rpc('reopen_post', { p_post_id: id })),
      approve: id => rpcPost(client.rpc('approve_post', { p_post_id: id })),
      reject: (id, reason) =>
        rpcPost(client.rpc('reject_post', { p_post_id: id, p_reason: reason })),
      markPublished: (id, externalUrl) =>
        rpcPost(
          client.rpc('mark_published', {
            p_post_id: id,
            ...(externalUrl ? { p_external_url: externalUrl } : {}),
          }),
        ),
      softDelete: id => rpcPost(client.rpc('soft_delete_post', { p_post_id: id })),
      restore: id => rpcPost(client.rpc('restore_post', { p_post_id: id })),
      undo: audit => rpcPost(client.rpc('undo_action', { p_audit_id: audit })),

      async latestAudit(postId): Promise<AuditEntry | null> {
        const { data, error } = await client
          .from('audit_log')
          .select('id, post_id, action, at, undone_at')
          .eq('post_id', postId)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw toRepositoryError(error);
        if (!data?.post_id) return null;
        return {
          id: data.id,
          postId: data.post_id,
          action: data.action,
          at: data.at,
          undone: data.undone_at !== null,
        };
      },

      async setMedia(postId, files) {
        // La carpeta de Storage es la del AUTOR del post (no la de quien sube el archivo): así
        // el autor siempre puede ver sus propios archivos, aunque los suba un administrador.
        const post = unwrap(
          await client.from('posts').select('author_id').eq('id', postId).single(),
        );

        const existing = unwrap(
          await client.from('post_media').select('path').eq('post_id', postId),
        );
        if (existing.length > 0) {
          await client.storage.from('post-media').remove(existing.map(m => m.path));
        }
        unwrap(await client.from('post_media').delete().eq('post_id', postId).select('id'));

        let position = 0;
        for (const { file, kind } of files) {
          const path = `${post.author_id}/${String(postId)}/${String(position)}-${file.name}`;
          const { error: uploadError } = await client.storage
            .from('post-media')
            .upload(path, file, { contentType: file.type, upsert: true });
          if (uploadError) throw new RepositoryError('unknown', uploadError.message, uploadError);
          const inserted = await client
            .from('post_media')
            .insert({ post_id: postId, path, kind, position });
          if (inserted.error) throw toRepositoryError(inserted.error);
          position += 1;
        }

        return fetchPost(postId);
      },
    },

    notifications: {
      async list() {
        const rows = unwrap(
          await client.from('notifications').select('*').order('created_at', { ascending: false }),
        );
        return rows.map(toNotification);
      },
      async markRead(id) {
        const { error } = await client
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw toRepositoryError(error);
      },
      async markAllRead() {
        const { error } = await client
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .is('read_at', null);
        if (error) throw toRepositoryError(error);
      },
    },

    catalog: {
      async platforms() {
        const [platforms, types] = await Promise.all([
          client.from('platforms').select('*').order('sort_order'),
          client.from('post_types').select('*'),
        ]);
        const typeRows = unwrap(types);
        return unwrap(platforms).map(row => toPlatform(row, typeRows));
      },
      async postTypeGroups() {
        const [groups, links] = await Promise.all([
          client.from('post_type_groups').select('*'),
          client.from('post_type_group_platforms').select('group_id, platform_id'),
        ]);
        return toPostTypeGroups(unwrap(groups), unwrap(links));
      },
      async templates() {
        return unwrap(await client.from('templates').select('*').order('id')).map(toTemplate);
      },
      async settings() {
        return toSettings(unwrap(await client.from('organization_settings').select('*').single()));
      },
    },

    profiles: {
      async current(): Promise<Profile | null> {
        const userId = await currentUserId();
        if (!userId) return null;
        const { data: row, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw toRepositoryError(error);
        return row ? toProfile(row) : null;
      },
      async list() {
        return unwrap(await client.from('profiles').select('*').order('created_at')).map(toProfile);
      },
      async updateSelf(patch) {
        const userId = await currentUserId();
        if (!userId) throw new RepositoryError('forbidden', 'No hay sesión iniciada');
        const update: TablesUpdate<'profiles'> = {};
        if (patch.fullName !== undefined) update.full_name = patch.fullName;
        if (patch.locale !== undefined) update.locale = patch.locale;
        return toProfile(
          unwrap(
            await client.from('profiles').update(update).eq('id', userId).select('*').single(),
          ),
        );
      },
      async setRole(userId, role: UserRole) {
        return toProfile(
          unwrap(await client.rpc('set_user_role', { p_user_id: userId, p_role: role })),
        );
      },
      async setActive(userId, active) {
        const profile = toProfile(
          unwrap(await client.rpc('set_user_active', { p_user_id: userId, p_active: active })),
        );
        // La base de datos ya bloquea el acceso (RLS). Además se bloquea/desbloquea al usuario en
        // Auth para que no pueda renovar sesiones; si la función no responde, no se deshace lo anterior.
        const { error } = await invokeFunction(client, 'sync-user-access', { userId });
        if (error) console.warn('No se pudo sincronizar el acceso en Auth:', error);
        return profile;
      },
      async invite(input) {
        const { data, error } = await invokeFunction<{ user: { id: string } }>(
          client,
          'invite-user',
          input,
        );
        if (error) throw await toFunctionError(error);
        if (!data) throw new RepositoryError('unknown', 'Respuesta vacía de invite-user');
        const row = unwrap(
          await client.from('profiles').select('*').eq('id', data.user.id).single(),
        );
        return { profile: toProfile(row) };
      },
      async resendInvite(userId) {
        const { error } = await invokeFunction(client, 'invite-user', { action: 'resend', userId });
        if (error) throw await toFunctionError(error);
        return {};
      },
    },
  };
}
