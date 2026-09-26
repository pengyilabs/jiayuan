/**
 * Puerta de acceso: decide qué pantalla mostrar hasta que hay un usuario autenticado, con su
 * cuenta activa y —si es administrador— con el segundo factor verificado.
 * Devuelve el perfil cuando la aplicación puede arrancar.
 */
import { passwordIssues } from '../../../supabase/functions/_shared/validation';
import { setState, getState } from '../../app/state';
import type { Repositories } from '../../data/repositories/types';
import { t } from '../../i18n';
import type { Lang, Profile } from '../../types/models';
import { authErrorMessage } from '../../ui/errors';
import { AuthError } from './auth-service';
import type { AuthInit, AuthService, TotpEnrollment } from './auth-service';
import { renderAuthScreen } from './auth-view';
import type { AuthScreen } from './auth-view';

export const SIGN_OUT_REASON_KEY = 'proppulse.signout_reason';

export interface GateDeps {
  auth: AuthService;
  repos: Repositories;
  /** Texto de credenciales de ejemplo (solo modo demo). */
  demoHint: string | null;
}

export function runAuthGate(root: HTMLElement, deps: GateDeps): Promise<Profile> {
  const { auth, repos } = deps;

  return new Promise<Profile>((resolve, reject) => {
    let screen: AuthScreen = { name: 'loading' };
    let flow: AuthInit['flow'] = null;
    let factorId: string | null = null;
    let enrollment: TotpEnrollment | null = null;
    let username = '';

    const render = (next: AuthScreen): void => {
      screen = next;
      renderAuthScreen(root, next, getState().lang, handlers, { demoHint: deps.demoHint });
    };

    const fail = (error: unknown, screenFor: (message: string) => AuthScreen): void => {
      render(screenFor(authErrorMessage(error)));
    };

    /** Decide la pantalla según el estado actual de la sesión. */
    const evaluate = async (): Promise<void> => {
      try {
        const reason = sessionStorage.getItem(SIGN_OUT_REASON_KEY);
        if (!auth.currentUserId()) {
          sessionStorage.removeItem(SIGN_OUT_REASON_KEY);
          render({
            name: 'login',
            ...(reason === 'idle' ? { notice: t('auth_session_expired') } : {}),
          });
          return;
        }
        if (flow) {
          render({ name: 'set-password', flow });
          return;
        }

        const profile = await repos.profiles.current();
        if (!profile || !profile.active) {
          await auth.signOut();
          render({
            name: 'login',
            error: t(profile ? 'err_auth_account_disabled' : 'err_auth_not_a_member'),
          });
          return;
        }
        username = profile.username;

        if (profile.role === 'admin' && (await repos.catalog.settings()).requireAdminMfa) {
          const { current } = await auth.mfa.assurance();
          if (current !== 'aal2') {
            factorId = await auth.mfa.verifiedFactorId();
            if (factorId) {
              render({ name: 'mfa' });
            } else {
              enrollment = await auth.mfa.enroll();
              factorId = enrollment.factorId;
              render({ name: 'enroll', enrollment });
            }
            return;
          }
        }
        resolve(profile);
      } catch (error) {
        fail(error, message => ({ name: 'login', error: message }));
      }
    };

    const handlers = {
      async login(user: string, password: string): Promise<void> {
        if (!user.trim() || !password) {
          render({ name: 'login', error: t('err_auth_required') });
          return;
        }
        try {
          await auth.signIn(user, password);
          sessionStorage.removeItem(SIGN_OUT_REASON_KEY);
          await evaluate();
        } catch (error) {
          fail(error, message => ({ name: 'login', error: message }));
        }
      },

      async forgot(identifier: string): Promise<void> {
        if (!identifier.trim()) {
          render({ name: 'forgot', error: t('err_auth_required') });
          return;
        }
        try {
          await auth.requestPasswordReset(identifier);
          render({ name: 'forgot-sent' });
        } catch (error) {
          fail(error, message => ({ name: 'forgot', error: message }));
        }
      },

      async setPassword(password: string, confirmation: string): Promise<void> {
        const current: AuthScreen = { name: 'set-password', flow: flow ?? 'recovery' };
        if (password !== confirmation) {
          render({ ...current, error: t('err_auth_password_mismatch') });
          return;
        }
        if (passwordIssues(password, username).length > 0) {
          render({ ...current, error: t('err_auth_password_weak') });
          return;
        }
        try {
          await auth.setPassword(password);
          flow = null;
          // Se abandona la URL del enlace (/accept-invite, /reset-password) para no repetirlo al recargar.
          history.replaceState(null, '', import.meta.env.BASE_URL);
          await evaluate();
        } catch (error) {
          fail(error, message => ({ ...current, error: message }));
        }
      },

      async verify(code: string): Promise<void> {
        const retry: AuthScreen = enrollment ? { name: 'enroll', enrollment } : { name: 'mfa' };
        if (!/^\d{6}$/.test(code) || !factorId) {
          render({ ...retry, error: t('err_auth_code_invalid') });
          return;
        }
        try {
          await auth.mfa.verify(factorId, code);
          enrollment = null;
          await evaluate();
        } catch (error) {
          fail(error, message => ({ ...retry, error: message }));
        }
      },

      goto(next: 'login' | 'forgot'): void {
        if (next === 'login') {
          flow = null;
          history.replaceState(null, '', import.meta.env.BASE_URL);
          void evaluate();
        } else {
          render({ name: 'forgot' });
        }
      },

      cancel(): void {
        void auth
          .signOut()
          .catch(() => undefined)
          .finally(() => {
            enrollment = null;
            factorId = null;
            void evaluate();
          });
      },

      changeLanguage(lang: Lang): void {
        setState({ lang });
        render(screen);
      },
    };

    render(screen);
    auth.init().then(
      init => {
        flow = init.flow;
        if (init.linkError) render({ name: 'link-error' });
        else void evaluate();
      },
      (error: unknown) => {
        if (error instanceof AuthError) fail(error, message => ({ name: 'login', error: message }));
        else reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
