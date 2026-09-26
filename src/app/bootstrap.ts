import { loadSnapshot } from '../data/snapshot';
import { initApprovals } from '../features/approvals';
import { runAuthGate } from '../features/auth/gate';
import { startIdleTimer } from '../features/auth/idle';
import { applyRoleToDocument, canAccess } from '../features/auth/roles';
import { initUserMenu, signOutAndReload } from '../features/auth/user-menu';
import { initHome } from '../features/home';
import { initListings } from '../features/listings';
import { initNotifications } from '../features/notifications';
import { initPosts } from '../features/posts';
import { initSettings } from '../features/settings';
import { initTeam } from '../features/team';
import { initTemplates } from '../features/templates';
import { applyStaticI18n, t } from '../i18n';
import type { Lang } from '../types/models';
import { renderBootError } from '../ui/boot-error';
import { initFilters } from '../ui/filters';
import { initImageFallbacks } from '../ui/image-fallback';
import { initLangSwitch } from '../ui/lang-switch';
import { initModals } from '../ui/modal';
import { showNotice } from '../ui/toast';
import { initSidebar } from '../ui/sidebar';
import { initActionDelegation } from './actions';
import { initNavigation } from './navigation';
import { addRouteGuard, initRouter } from './router';
import { auth, demoHint, repos, setTimeZone } from './services';
import { mountShell } from './shell';
import { getState, setState, store } from './state';

/** Idioma inicial: el del navegador si la aplicación lo soporta. */
function detectLanguage(): Lang {
  const preferred = navigator.language.slice(0, 2).toLowerCase();
  return (['zh', 'en', 'fr', 'es'] as const).find(l => l === preferred) ?? 'en';
}

export async function bootstrap(root: HTMLElement): Promise<void> {
  setState({ lang: detectLanguage() });
  document.documentElement.lang = getState().lang;

  // 1 · Puerta de acceso: login, invitación, restablecimiento y MFA.
  let profile;
  try {
    profile = await runAuthGate(root, { auth, repos, demoHint });
  } catch (error) {
    renderBootError(root, error);
    return;
  }

  // 2 · Datos visibles para el usuario (RLS decide qué ve).
  root.setAttribute('aria-busy', 'true');
  try {
    setState({ ...(await loadSnapshot(repos, setTimeZone)), lang: profile.locale });
  } catch (error) {
    renderBootError(root, error);
    return;
  } finally {
    root.removeAttribute('aria-busy');
  }

  // 3 · Aplicación.
  mountShell(root);
  applyRoleToDocument(profile.role);
  initActionDelegation();
  initModals();
  initSidebar();
  initFilters();
  initImageFallbacks();

  // Idioma: los textos estáticos se traducen antes que los renders dinámicos de cada feature.
  const syncLanguage = (): void => {
    document.documentElement.lang = getState().lang;
    applyStaticI18n();
  };
  syncLanguage();
  let persistedLang = getState().lang;
  store.watch(
    s => s.lang,
    () => {
      syncLanguage();
      // La preferencia de idioma se guarda en el perfil (sin bloquear la interfaz).
      const { lang } = getState();
      if (lang !== persistedLang) {
        persistedLang = lang;
        void repos.profiles.updateSelf({ locale: lang }).catch(() => undefined);
      }
    },
  );

  initLangSwitch();
  initNavigation();

  initHome();
  initListings();
  initPosts();
  initNotifications();
  initTemplates();
  initApprovals();
  initSettings();
  initTeam();

  const signOut = (reason?: 'idle'): Promise<void> =>
    signOutAndReload(() => auth.signOut(), reason);
  initUserMenu(signOut);
  // Sesión revocada o caducada fuera de la interfaz → de vuelta al login.
  auth.onSignedOut(() => {
    window.location.assign(import.meta.env.BASE_URL);
  });
  startIdleTimer(() => {
    void signOut('idle');
  });

  // El router impide abrir páginas que el rol no permite (la seguridad real está en RLS).
  addRouteGuard(to => {
    if (canAccess(profile.role, to)) return true;
    showNotice(t('err_auth_forbidden_page', t('error_forbidden')));
    return 'dashboard';
  });
  initRouter();
}
