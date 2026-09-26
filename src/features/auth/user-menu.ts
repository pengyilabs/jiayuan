/** Bloque de usuario del sidebar: nombre, rol y cierre de sesión. */
import { registerActions } from '../../app/actions';
import { getState, store } from '../../app/state';
import { getById } from '../../core/dom';
import { t } from '../../i18n';
import { SIGN_OUT_REASON_KEY } from './gate';

export function renderUserMenu(): void {
  const { currentUser } = getState();
  if (!currentUser) return;
  const avatar = getById('user-avatar');
  const name = getById('user-name');
  const role = getById('user-role');
  if (avatar) avatar.textContent = Array.from(currentUser.fullName)[0] ?? '?';
  if (name) name.textContent = currentUser.fullName;
  if (role) role.textContent = t(currentUser.role === 'admin' ? 'role_admin' : 'role_agent');
  const logout = getById('user-logout');
  if (logout) logout.title = t('auth_logout');
}

export function initUserMenu(signOut: (reason?: 'idle') => Promise<void>): void {
  registerActions({
    'auth:logout': () => {
      void signOut();
    },
  });
  store.watch(s => s.currentUser, renderUserMenu);
  store.watch(s => s.lang, renderUserMenu);
  renderUserMenu();
}

/** Cierra la sesión y recarga: la puerta de acceso muestra el login con el motivo. */
export async function signOutAndReload(
  signOut: () => Promise<void>,
  reason?: 'idle',
): Promise<void> {
  if (reason) sessionStorage.setItem(SIGN_OUT_REASON_KEY, reason);
  try {
    await signOut();
  } finally {
    window.location.assign(import.meta.env.BASE_URL);
  }
}
