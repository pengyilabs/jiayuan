/** Sincronización de los filtros de Home con la URL (F6). */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState, setState } from '../../src/app/state';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

beforeEach(() => {
  history.replaceState(null, '', location.pathname); // limpia la query entre pruebas
  setState({
    feedFilter: 'all',
    feedStatusFilter: 'all',
    feedDateRange: { from: null, to: null },
    feedView: 'grid',
  });
});

describe('filtros de Home en la URL', () => {
  it('cambiar un filtro actualiza la query string sin añadir historial', async () => {
    const entriesBefore = history.length;
    setState({ feedFilter: 'facebook' });
    await vi.waitFor(() => {
      expect(new URLSearchParams(location.search).get('platform')).toBe('facebook');
    });
    expect(history.length).toBe(entriesBefore); // replaceState, no pushState

    setState({
      feedStatusFilter: 'pending',
      feedDateRange: { from: '2026-08-01', to: '2026-08-31' },
    });
    await vi.waitFor(() => {
      const params = new URLSearchParams(location.search);
      expect(params.get('status')).toBe('pending');
      expect(params.get('from')).toBe('2026-08-01');
      expect(params.get('to')).toBe('2026-08-31');
    });
  });

  it('los valores por defecto no aparecen en la URL', async () => {
    setState({ feedFilter: 'facebook' });
    await vi.waitFor(() => {
      expect(location.search).toContain('platform=facebook');
    });
    setState({ feedFilter: 'all' });
    await vi.waitFor(() => {
      expect(location.search).not.toContain('platform=');
    });
  });

  it('restoreFiltersFromUrl reconstruye el estado desde la query string', async () => {
    history.replaceState(
      null,
      '',
      `${location.pathname}?platform=instagram&status=approved&from=2026-08-05&view=list`,
    );
    const { restoreFiltersFromUrl } = await import('../../src/features/home/filters-url');
    restoreFiltersFromUrl();

    expect(getState().feedFilter).toBe('instagram');
    expect(getState().feedStatusFilter).toBe('approved');
    expect(getState().feedDateRange).toEqual({ from: '2026-08-05', to: null });
    expect(getState().feedView).toBe('list');
  });

  it('ignora valores inválidos o desconocidos en la URL', async () => {
    history.replaceState(
      null,
      '',
      `${location.pathname}?platform=not-a-real-platform&status=bogus&from=not-a-date&view=weird`,
    );
    const { restoreFiltersFromUrl } = await import('../../src/features/home/filters-url');
    restoreFiltersFromUrl();

    expect(getState().feedFilter).toBe('all');
    expect(getState().feedStatusFilter).toBe('all');
    expect(getState().feedDateRange).toEqual({ from: null, to: null });
    expect(getState().feedView).toBe('grid');
  });
});
