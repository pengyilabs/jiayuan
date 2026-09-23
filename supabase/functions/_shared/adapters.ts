/**
 * Implementación de los puertos con supabase-js. Es la única parte que habla con Supabase.
 * Variables (las tres primeras las inyecta Supabase en las Edge Functions):
 *   SUPABASE_URL · SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
 *   SITE_URL         URL pública de la aplicación (enlaces de invitación / restablecimiento)
 *   ALLOWED_ORIGINS  orígenes CORS autorizados, separados por comas (por defecto, SITE_URL)
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthDeps, DirectoryRecord, Locale, Role } from './ports.ts';

type Env = Readonly<Record<string, string | undefined>>;

const required = (env: Env, name: string): string => {
  const value = env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
};

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

interface ProfileRow {
  id: string;
  email: string | null;
  username: string;
  full_name: string;
  locale: string;
  role: Role;
  active: boolean;
  confirmed_at: string | null;
}

const SELECT = 'id, email, username, full_name, locale, role, active, confirmed_at';

const toRecord = (row: ProfileRow): DirectoryRecord => ({
  id: row.id,
  email: row.email ?? '',
  username: row.username,
  fullName: row.full_name,
  locale: (['zh', 'en', 'fr', 'es'].includes(row.locale) ? row.locale : 'en') as Locale,
  role: row.role,
  active: row.active,
  confirmed: row.confirmed_at !== null,
});

export function createDeps(env: Env): AuthDeps {
  const url = required(env, 'SUPABASE_URL');
  const anonKey = required(env, 'SUPABASE_ANON_KEY');
  const siteUrl = required(env, 'SITE_URL');
  const service: SupabaseClient = createClient(
    url,
    required(env, 'SUPABASE_SERVICE_ROLE_KEY'),
    clientOptions,
  );
  const anonymous = (): SupabaseClient => createClient(url, anonKey, clientOptions);

  const find = async (
    column: 'username' | 'email' | 'id',
    value: string,
  ): Promise<DirectoryRecord | null> => {
    const { data, error } = await service
      .from('profiles')
      .select(SELECT)
      .eq(column, value)
      .maybeSingle();
    if (error) throw new Error(`profiles: ${error.message}`);
    return data ? toRecord(data as ProfileRow) : null;
  };

  return {
    directory: {
      findByUsername: username => find('username', username),
      findByEmail: email => find('email', email),
      findById: id => find('id', id),
      async signInAllowed(key, ip) {
        const { data, error } = await service.rpc('sign_in_allowed', { p_key: key, p_ip: ip });
        if (error) throw new Error(`sign_in_allowed: ${error.message}`);
        return data === true;
      },
      async recordAttempt(key, ip, success) {
        const { error } = await service.rpc('record_sign_in_attempt', {
          p_key: key,
          p_ip: ip,
          p_success: success,
        });
        if (error) throw new Error(`record_sign_in_attempt: ${error.message}`);
      },
    },

    auth: {
      async passwordSignIn(email, password) {
        const { data, error } = await anonymous().auth.signInWithPassword({ email, password });
        if (error) {
          const code = (error as { code?: string }).code;
          if (code === 'user_banned') return { ok: false, reason: 'banned' };
          if (code === 'email_not_confirmed') return { ok: false, reason: 'unconfirmed' };
          if (code === 'invalid_credentials') return { ok: false, reason: 'invalid_credentials' };
          return { ok: false, reason: 'error' };
        }
        const s = data.session;
        return {
          ok: true,
          tokens: {
            access_token: s.access_token,
            refresh_token: s.refresh_token,
            expires_in: s.expires_in,
            expires_at: s.expires_at,
            token_type: s.token_type,
          },
        };
      },
      async revokeSession(accessToken) {
        await service.auth.admin.signOut(accessToken).catch(() => undefined);
      },
      async invite(email, metadata, redirectTo) {
        const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
          data: metadata,
          redirectTo,
        });
        if (error || !data.user) {
          const code = (error as { code?: string } | null)?.code;
          return { ok: false, reason: code === 'email_exists' ? 'email_exists' : 'error' };
        }
        return { ok: true, userId: data.user.id };
      },
      async deleteUser(userId) {
        await service.auth.admin.deleteUser(userId).catch(() => undefined);
      },
      async setBanned(userId, banned) {
        const { error } = await service.auth.admin.updateUserById(userId, {
          ban_duration: banned ? '876000h' : 'none',
        });
        if (error) throw new Error(`updateUserById: ${error.message}`);
      },
      async sendRecovery(email, redirectTo) {
        const { error } = await anonymous().auth.resetPasswordForEmail(email, { redirectTo });
        if (error) console.error('resetPasswordForEmail:', error.message);
      },
    },

    caller: {
      async isAdmin(jwt) {
        const { data, error } = await withJwt(url, anonKey, jwt).rpc('is_admin');
        return !error && data === true;
      },
      async setRole(jwt, userId, role) {
        const { error } = await withJwt(url, anonKey, jwt).rpc('set_user_role', {
          p_user_id: userId,
          p_role: role,
        });
        return !error;
      },
    },

    config: {
      siteUrl,
      allowedOrigins: (env.ALLOWED_ORIGINS ?? siteUrl)
        .split(',')
        .map(origin => origin.trim().replace(/\/$/, ''))
        .filter(Boolean),
    },
  };
}

/** Cliente que actúa con el JWT de quien llama (RLS y MFA aplican). */
function withJwt(url: string, anonKey: string, jwt: string): SupabaseClient {
  return createClient(url, anonKey, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}
