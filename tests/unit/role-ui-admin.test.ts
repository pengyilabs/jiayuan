/** Aclaraciones de rol con una sesión de administrador (F9). */
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
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('rol visible y permisos explícitos (administrador)', () => {
  it('cada encabezado muestra la insignia del rol de la cuenta abierta', () => {
    const badges = $$('[data-role-badge]');
    expect(badges.length).toBe(2); // encabezado de Home + topbar
    for (const badge of badges) {
      expect(badge.classList.contains('role-admin')).toBe(true);
      expect(badge.textContent).toContain(en.role_admin);
      expect(badge.getAttribute('aria-label')).toContain(en.role_admin);
    }
    expect($('#user-avatar').title).toContain(en.role_admin);
  });

  it('las pantallas exclusivas de admin lo aclaran y llevan su etiqueta en el menú', () => {
    expect($('[data-role-note="approvals"]').textContent).toContain(en.note_only_admin);
    expect($('[data-role-note="settings"]').textContent).toContain(en.note_only_admin);
    // "Admin" en Aprobaciones/Ajustes; el tercer .nav-tag ("Tech", F11) es del ítem del técnico,
    // que existe en el DOM pero un admin nunca ve (lo oculta el CSS de rol, no el marcado).
    expect($$('.nav-tag').map(el => el.textContent)).toEqual(['Admin', 'Admin', 'Tech']);
  });

  it('las pantallas compartidas detallan qué puede hacer cada rol y marcan el propio', () => {
    for (const page of ['dashboard', 'listings', 'templates']) {
      const note = $(`[data-role-note="${page}"]`);
      expect(note.textContent).toContain(en.role_admin);
      expect(note.textContent).toContain(en.role_agent);
      expect(note.querySelector('.role-note-row.current')?.textContent).toContain(en.role_admin);
    }
    expect($('[data-role-note="dashboard"]').textContent).toContain(en.note_dashboard_agent);
  });

  it('Ajustes recuerda las cuentas demo por defecto y sus roles', () => {
    const text = $('[data-role-note="settings"]').textContent;
    expect(text).toContain('zhuyan');
    expect(text).toContain('liming');
    expect(text).toContain(DEMO_PASSWORD);
  });
});
