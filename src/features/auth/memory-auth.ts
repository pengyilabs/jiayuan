/**
 * Autenticación del modo demo (sin servidor). Comprueba usuario y contraseña contra el
 * directorio en memoria e imita las reglas del servidor: bloqueo por intentos, cuentas
 * desactivadas, invitaciones por enlace y contraseña mínima. No es segura: solo para demo.
 */
import type { MemoryDirectory } from '../../data/memory-directory';
import { passwordIssues } from '../../../supabase/functions/_shared/validation';
import { AuthError } from './auth-service';
import type { AuthInit, AuthService } from './auth-service';

const SESSION_KEY = 'proppulse.demo.session';
const MAX_FAILURES = 5;

export function createMemoryAuth(
  directory: MemoryDirectory,
  storage: Storage = sessionStorage,
): AuthService {
  let userId: string | null = storage.getItem(SESSION_KEY);
  let pendingInviteUserId: string | null = null;
  const failures = new Map<string, number>();
  const listeners = new Set<() => void>();

  const setSession = (id: string | null): void => {
    userId = id;
    if (id) storage.setItem(SESSION_KEY, id);
    else storage.removeItem(SESSION_KEY);
  };

  const findByIdentifier = (
    identifier: string,
  ): (typeof directory.profiles)[number] | undefined => {
    const key = identifier.trim().toLowerCase();
    return directory.profiles.find(
      p => p.username.toLowerCase() === key || p.email?.toLowerCase() === key,
    );
  };

  return {
    init(): Promise<AuthInit> {
      const token = new URLSearchParams(location.search).get('invite');
      if (location.pathname.endsWith('/accept-invite')) {
        const invited = token ? directory.invites.get(token) : undefined;
        if (!invited) return Promise.resolve({ signedIn: false, flow: 'invite', linkError: true });
        pendingInviteUserId = invited;
        return Promise.resolve({ signedIn: true, flow: 'invite', linkError: false });
      }
      const valid = userId !== null && directory.profiles.some(p => p.id === userId && p.active);
      if (!valid) setSession(null);
      return Promise.resolve({ signedIn: valid, flow: null, linkError: false });
    },

    currentUserId: () => pendingInviteUserId ?? userId,

    signIn(username, password) {
      const key = username.trim().toLowerCase();
      if ((failures.get(key) ?? 0) >= MAX_FAILURES)
        return Promise.reject(new AuthError('too_many_attempts'));

      const profile = findByIdentifier(username);
      const valid =
        profile !== undefined &&
        directory.passwords.get(profile.id) === password &&
        profile.confirmed_at !== null;
      if (!valid) {
        failures.set(key, (failures.get(key) ?? 0) + 1);
        return Promise.reject(new AuthError('invalid_credentials'));
      }
      if (!profile.active) return Promise.reject(new AuthError('account_disabled'));

      failures.delete(key);
      profile.last_sign_in_at = new Date().toISOString();
      setSession(profile.id);
      return Promise.resolve();
    },

    signOut() {
      setSession(null);
      pendingInviteUserId = null;
      listeners.forEach(cb => {
        cb();
      });
      return Promise.resolve();
    },

    setPassword(password) {
      const id = pendingInviteUserId ?? userId;
      const profile = directory.profiles.find(p => p.id === id);
      if (!profile) return Promise.reject(new AuthError('unknown'));
      if (passwordIssues(password, profile.username).length > 0)
        return Promise.reject(new AuthError('password_weak'));
      if (directory.passwords.get(profile.id) === password)
        return Promise.reject(new AuthError('password_same'));

      directory.passwords.set(profile.id, password);
      if (pendingInviteUserId) {
        profile.confirmed_at = new Date().toISOString();
        for (const [token, invited] of directory.invites)
          if (invited === profile.id) directory.invites.delete(token);
        pendingInviteUserId = null;
        setSession(profile.id);
      }
      return Promise.resolve();
    },

    requestPasswordReset(identifier) {
      // No hay correo en modo demo; se responde igual exista o no la cuenta.
      console.info('[demo] restablecimiento solicitado para', identifier.trim());
      return Promise.resolve();
    },

    onSignedOut(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    mfa: {
      // El modo demo no exige TOTP (organization_settings.require_admin_mfa = false).
      assurance: () => Promise.resolve({ current: 'aal2', next: 'aal2' }),
      verifiedFactorId: () => Promise.resolve(null),
      enroll: () => Promise.reject(new AuthError('unknown')),
      verify: () => Promise.reject(new AuthError('unknown')),
    },
  };
}
