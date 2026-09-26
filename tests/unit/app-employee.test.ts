/** El mismo arranque con un empleado: solo ve lo suyo y no puede abrir páginas de administración. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { navigate } from '../../src/app/router';
import { auth, repos } from '../../src/app/services';
import { getState } from '../../src/app/state';
import { DEMO_PASSWORD, LIMING_ID } from '../../src/data/seed/users';
import { getDictionary } from '../../src/i18n';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};

beforeAll(async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('liming', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('sesión de empleado', () => {
  it('marca el documento con el rol y muestra su nombre en el sidebar', () => {
    expect(document.body.dataset.role).toBe('employee');
    expect($('#user-name').textContent).toBe('李明');
    expect($('#user-role').textContent).toBe(getDictionary('en').role_agent);
    expect($('#user-avatar').textContent).toBe('李');
  });

  it('solo carga y muestra los posts propios', () => {
    const posts = getState().posts;
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every(p => p.authorId === LIMING_ID)).toBe(true);
    expect(document.querySelectorAll('.feed-card')).toHaveLength(posts.length);
  });

  it('los elementos de administración están marcados para ocultarse', () => {
    expect(document.querySelectorAll('[data-role-only="admin"]').length).toBeGreaterThan(0);
    expect(
      $('.nav-item[data-page="approvals"]').closest('[data-role-only="admin"]'),
    ).not.toBeNull();
  });

  it('el router redirige las páginas de administración al inicio', () => {
    navigate('listings');
    expect(getState().page).toBe('listings');
    navigate('approvals');
    expect(getState().page).toBe('dashboard'); // redirigido al inicio
    navigate('settings');
    expect(getState().page).toBe('dashboard');
    expect(document.querySelector('.toast-message')?.textContent).toContain("don't have access");
  });
});
