import { RepositoryError } from '../data/repositories/types';
import type { RepositoryErrorKind } from '../data/repositories/types';
import { AuthError } from '../features/auth/auth-service';
import { t } from '../i18n';

const KEYS: Readonly<Record<RepositoryErrorKind, string>> = {
  forbidden: 'error_forbidden',
  not_found: 'error_not_found',
  invalid_state: 'error_invalid_state',
  invalid_input: 'error_invalid_input',
  undo_unavailable: 'error_undo_unavailable',
  unknown: 'error_unknown',
};

/** Mensaje traducido para mostrar al usuario cuando falla una operación. */
export function errorMessage(error: unknown): string {
  if (error instanceof AuthError) return authErrorMessage(error);
  if (error instanceof RepositoryError && error.code) {
    const key = `err_team_${error.code}`;
    const message = t(key);
    if (message !== key) return message;
  }
  const kind: RepositoryErrorKind = error instanceof RepositoryError ? error.kind : 'unknown';
  return t(KEYS[kind]);
}

/** Mensaje traducido de un error de autenticación. */
export function authErrorMessage(error: unknown): string {
  const code = error instanceof AuthError ? error.code : 'unknown';
  return t(`err_auth_${code}`, t('err_auth_unknown'));
}
