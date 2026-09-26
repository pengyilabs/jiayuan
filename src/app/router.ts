/** Router con History API. Las rutas mapean 1:1 a las páginas de la aplicación. */
import type { PageId } from '../types/models';
import { getState, setState } from './state';

export const ROUTES: Readonly<Record<PageId, string>> = {
  dashboard: '/',
  listings: '/listings',
  templates: '/templates',
  approvals: '/approvals',
  settings: '/settings',
};

/** Devuelve `true` para permitir, o una página alternativa (p. ej. `/login` en F2). */
export type RouteGuard = (to: PageId, from: PageId) => true | PageId;

const guards: RouteGuard[] = [];

export function addRouteGuard(guard: RouteGuard): void {
  guards.push(guard);
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function pathFor(page: PageId): string {
  return base + ROUTES[page];
}

export function pageFromPath(pathname: string): PageId {
  const path = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path;
  const match = (Object.keys(ROUTES) as PageId[]).find(page => ROUTES[page] === normalized);
  return match ?? 'dashboard';
}

function resolve(target: PageId): PageId {
  const from = getState().page;
  for (const guard of guards) {
    const result = guard(target, from);
    if (result !== true) return result;
  }
  return target;
}

export function navigate(target: PageId): void {
  const page = resolve(target);
  if (page === getState().page) return;
  history.pushState({ page }, '', pathFor(page));
  setState({ page });
}

export function initRouter(): void {
  const initial = resolve(pageFromPath(location.pathname));
  history.replaceState({ page: initial }, '', pathFor(initial));
  setState({ page: initial });

  window.addEventListener('popstate', () => {
    setState({ page: resolve(pageFromPath(location.pathname)) });
  });
}
