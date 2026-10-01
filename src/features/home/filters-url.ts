/**
 * Sincroniza los filtros de Home con la URL (F6): se pueden compartir o recargar sin perderlos.
 * Usa `history.replaceState` (no `pushState`): cambiar un filtro no debe añadir una entrada al
 * historial, o "atrás" tendría que deshacer cada clic de filtro uno a uno.
 */
import { getState, setState } from '../../app/state';
import type { FeedStatusFilter, FeedView } from '../../app/state';
import type { PlatformId } from '../../types/models';

const VIEWS: readonly FeedView[] = ['grid', 'list'];
const STATUSES: readonly FeedStatusFilter[] = ['all', 'pending', 'approved'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function syncFiltersToUrl(): void {
  const { feedFilter, feedStatusFilter, feedDateRange, feedView } = getState();
  const params = new URLSearchParams(location.search);

  const set = (key: string, value: string | null): void => {
    if (value === null) params.delete(key);
    else params.set(key, value);
  };
  set('platform', feedFilter === 'all' ? null : feedFilter);
  set('status', feedStatusFilter === 'all' ? null : feedStatusFilter);
  set('from', feedDateRange.from);
  set('to', feedDateRange.to);
  set('view', feedView === 'grid' ? null : feedView);

  const query = params.toString();
  const url = location.pathname + (query ? `?${query}` : '');
  history.replaceState(history.state, '', url);
}

/** Lee los filtros de la URL actual al arrancar Home (una sola vez). */
export function restoreFiltersFromUrl(): void {
  const params = new URLSearchParams(location.search);
  const { platforms } = getState();

  const platform = params.get('platform');
  const status = params.get('status');
  const from = params.get('from');
  const to = params.get('to');
  const view = params.get('view');

  setState({
    ...(platform && platforms.some(p => p.id === platform)
      ? { feedFilter: platform as PlatformId }
      : {}),
    ...(status && STATUSES.includes(status as FeedStatusFilter)
      ? { feedStatusFilter: status as FeedStatusFilter }
      : {}),
    ...((from && DATE_RE.test(from)) || (to && DATE_RE.test(to))
      ? {
          feedDateRange: {
            from: from && DATE_RE.test(from) ? from : null,
            to: to && DATE_RE.test(to) ? to : null,
          },
        }
      : {}),
    ...(view && VIEWS.includes(view as FeedView) ? { feedView: view as FeedView } : {}),
  });
}
