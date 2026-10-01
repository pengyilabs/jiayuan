/** Sincroniza el DOM (página activa, cabecera, título) con la ruta actual. */
import { currentBreakpoint } from './responsive';
import { mustGetById, qs, qsa } from '../core/dom';
import { t } from '../i18n';
import type { PageId } from '../types/models';
import { registerActions } from './actions';
import { navigate } from './router';
import { getState, store } from './state';

function syncPage(page: PageId): void {
  qsa('.page').forEach(p => p.classList.remove('active'));
  qsa('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });
  document.getElementById(`page-${page}`)?.classList.add('active');
  const active = qs(`.nav-item[data-page="${page}"]`);
  active?.classList.add('active');
  active?.setAttribute('aria-current', 'page');

  const dashHeader = qs('.dash-header');
  const pageTopbar = qs('.page-topbar');
  if (dashHeader) dashHeader.style.display = page === 'dashboard' ? '' : 'none';
  if (pageTopbar) pageTopbar.style.display = page === 'dashboard' ? 'none' : '';

  updateTitle();
  mustGetById('content').scrollTop = 0;
}

function updateTitle(): void {
  const title = qs('#page-title');
  if (title) title.textContent = t(`nav_${getState().page}`, getState().page);
}

export function initNavigation(): void {
  registerActions({
    'nav:go': el => {
      navigate(el.dataset.page as PageId);
      // En móvil, el sidebar es un cajón: navegar debe cerrarlo (en tablet/PC es un rail o un
      // panel expandido de forma permanente, así que ahí no se toca).
      if (currentBreakpoint() === 'mobile') qs('.sidebar')?.classList.add('collapsed');
    },
  });
  store.watch(s => s.page, syncPage);
  store.watch(s => s.lang, updateTitle);
  syncPage(getState().page);
}
