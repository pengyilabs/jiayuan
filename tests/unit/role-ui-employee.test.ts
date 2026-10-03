/** Aclaraciones de rol con una sesión de agente (F9). */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { DEMO_PASSWORD } from '../../src/data/seed/users';
import { getDictionary } from '../../src/i18n';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};
const $$ = (selector: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(selector));

const en = getDictionary('en');

beforeAll(async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('liming', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('rol visible y permisos explícitos (agente)', () => {
  it('la insignia indica que la cuenta es de agente', () => {
    for (const badge of $$('[data-role-badge]')) {
      expect(badge.classList.contains('role-employee')).toBe(true);
      expect(badge.textContent).toContain(en.role_agent);
    }
    expect($('#user-role').textContent).toBe(en.role_agent);
  });

  it('en las pantallas compartidas marca el rol de agente como el propio', () => {
    const current = $('[data-role-note="listings"] .role-note-row.current');
    expect(current.textContent).toContain(en.role_agent);
    expect(current.textContent).toContain(en.note_listings_agent);
  });

  it('las acciones que solo puede hacer un administrador quedan marcadas para ocultarse', () => {
    expect(document.body.dataset.role).toBe('employee');
    expect($$('[data-role-only="admin"]').length).toBeGreaterThan(0);
    // Ajustes no se ofrece a un agente, así que no se le explican las cuentas demo.
    expect($('[data-role-note="settings"]').textContent).toContain(en.note_only_admin);
  });
});
