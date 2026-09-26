import { beforeEach, describe, expect, it } from 'vitest';
import { addRouteGuard, navigate, pageFromPath, pathFor, ROUTES } from '../../src/app/router';
import { getState, setState } from '../../src/app/state';

describe('router', () => {
  beforeEach(() => {
    setState({ page: 'dashboard' });
    history.replaceState(null, '', '/');
  });

  it('mapea rutas a páginas y viceversa', () => {
    for (const [page, path] of Object.entries(ROUTES)) {
      expect(pageFromPath(path)).toBe(page);
      expect(pathFor(page as keyof typeof ROUTES)).toBe(path);
    }
  });

  it('ignora la barra final y cae en dashboard si la ruta no existe', () => {
    expect(pageFromPath('/listings/')).toBe('listings');
    expect(pageFromPath('/nope')).toBe('dashboard');
  });

  it('navigate actualiza el estado y la URL', () => {
    navigate('templates');
    expect(getState().page).toBe('templates');
    expect(location.pathname).toBe('/templates');
  });

  it('un guard puede redirigir', () => {
    addRouteGuard(to => (to === 'settings' ? 'approvals' : true));
    navigate('settings');
    expect(getState().page).toBe('approvals');
  });
});
