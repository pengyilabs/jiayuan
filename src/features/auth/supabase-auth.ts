/** Autenticación con Supabase Auth (+ Edge Functions `sign-in` y `request-password-reset`). */
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import type { Client } from '../../data/repositories/supabase';
import { invokeFunction } from '../../data/functions';
import { AuthError } from './auth-service';
import type { AuthErrorCode, AuthInit, AuthService, EntryFlow } from './auth-service';

const FUNCTION_CODES: Readonly<Record<string, AuthErrorCode>> = {
  invalid_credentials: 'invalid_credentials',
  too_many_attempts: 'too_many_attempts',
  account_disabled: 'account_disabled',
};

/** Extrae `{ error: { code } }` de la respuesta HTTP de una Edge Function. */
async function functionErrorCode(error: unknown): Promise<AuthErrorCode> {
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: { code?: string } };
      return FUNCTION_CODES[body.error?.code ?? ''] ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }
  return 'network';
}

function fromSupabase(error: SupabaseAuthError): AuthError {
  const code = (error as { code?: string }).code ?? '';
  if (code === 'weak_password') return new AuthError('password_weak', error);
  if (code === 'same_password') return new AuthError('password_same', error);
  if (code === 'mfa_verification_failed' || code === 'mfa_challenge_expired')
    return new AuthError('code_invalid', error);
  if (error.name === 'AuthRetryableFetchError') return new AuthError('network', error);
  return new AuthError('unknown', error);
}

const flowFromPath = (): EntryFlow => {
  const path = location.pathname.replace(/\/$/, '');
  if (path.endsWith('/accept-invite')) return 'invite';
  if (path.endsWith('/reset-password')) return 'recovery';
  return null;
};

export function createSupabaseAuth(client: Client): AuthService {
  let userId: string | null = null;

  client.auth.onAuthStateChange((_event, session) => {
    userId = session?.user.id ?? null;
  });

  return {
    async init(): Promise<AuthInit> {
      const flow = flowFromPath();
      const hasLinkError =
        /error(_code|_description)?=/.test(location.hash) ||
        /error(_code|_description)?=/.test(location.search);
      // getSession() espera a que supabase-js procese el enlace (#access_token=…) de la URL.
      const { data } = await client.auth.getSession();
      userId = data.session?.user.id ?? null;
      return {
        signedIn: userId !== null,
        flow,
        linkError: flow !== null && (hasLinkError || userId === null),
      };
    },

    currentUserId: () => userId,

    async signIn(username, password) {
      const { data, error } = await invokeFunction<{ access_token: string; refresh_token: string }>(
        client,
        'sign-in',
        { username, password },
      );
      if (error) throw new AuthError(await functionErrorCode(error), error);
      if (!data) throw new AuthError('unknown');
      const { error: sessionError } = await client.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw fromSupabase(sessionError);
    },

    async signOut() {
      // Cierra todas las sesiones del usuario (scope global); si la red falla, se limpia la local.
      const { error } = await client.auth.signOut();
      if (error) await client.auth.signOut({ scope: 'local' });
    },

    async setPassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw fromSupabase(error);
    },

    async requestPasswordReset(identifier) {
      const { error } = await invokeFunction(client, 'request-password-reset', { identifier });
      if (error) {
        const code = await functionErrorCode(error);
        if (code === 'too_many_attempts') throw new AuthError(code, error);
        throw new AuthError(code === 'network' ? 'network' : 'unknown', error);
      }
    },

    onSignedOut(callback) {
      const { data } = client.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') callback();
      });
      return () => {
        data.subscription.unsubscribe();
      };
    },

    mfa: {
      async assurance() {
        const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw fromSupabase(error);
        return {
          current: data.currentLevel === 'aal2' ? 'aal2' : 'aal1',
          next: data.nextLevel === 'aal2' ? 'aal2' : 'aal1',
        };
      },

      async verifiedFactorId() {
        const { data, error } = await client.auth.mfa.listFactors();
        if (error) throw fromSupabase(error);
        return data.totp[0]?.id ?? null; // `totp` solo incluye factores verificados
      },

      async enroll() {
        // Un intento anterior abandonado deja un factor sin verificar que bloquearía el alta.
        const { data: factors } = await client.auth.mfa.listFactors();
        for (const factor of factors?.all ?? []) {
          if (factor.status === 'unverified')
            await client.auth.mfa.unenroll({ factorId: factor.id });
        }
        const { data, error } = await client.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'PropPulse',
        });
        if (error) throw fromSupabase(error);
        return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
      },

      async verify(factorId, code) {
        const challenge = await client.auth.mfa.challenge({ factorId });
        if (challenge.error) throw fromSupabase(challenge.error);
        const { error } = await client.auth.mfa.verify({
          factorId,
          challengeId: challenge.data.id,
          code,
        });
        if (error) throw fromSupabase(error);
      },
    },
  };
}
