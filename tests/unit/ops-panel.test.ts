/** Panel de operaciones del técnico (F11): la única pantalla de ese rol, con datos reales. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { navigate } from '../../src/app/router';
import { auth, repos } from '../../src/app/services';
import { getState } from '../../src/app/state';
import { TECHNICIAN_PASSWORD, technicianSeed } from '../../src/data/seed/users';
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
  await auth.signIn(technicianSeed.username, TECHNICIAN_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('panel de operaciones (técnico)', () => {
  it('el login aterriza directo en /ops, y es la única pantalla accesible', () => {
    expect(getState().page).toBe('ops');
    for (const page of ['dashboard', 'listings', 'templates', 'approvals', 'settings'] as const) {
      navigate(page);
      expect(getState().page).toBe('ops'); // el guard lo devuelve siempre aquí
    }
  });

  it('el sidebar marca el resto del menú para ocultarse y deja visible solo "ops"', () => {
    // El ocultamiento en sí es CSS (`body[data-role='technician'] ...`, ver misc.css) y jsdom no
    // aplica hojas de estilo reales; se comprueba la marca estructural que lo dirige: solo la
    // sección de "ops" no queda marcada `data-role-only` para otro rol.
    expect(document.body.dataset.role).toBe('technician');
    const sections = $$('.sidebar-nav .nav-section');
    const opsSection = sections.find(s => s.querySelector('[data-page="ops"]'));
    expect(opsSection?.dataset.roleOnly).toBe('technician');
    const otherSections = sections.filter(s => s !== opsSection);
    expect(otherSections.length).toBeGreaterThan(0);
    for (const section of otherSections) {
      expect(section.dataset.roleOnly).not.toBe('technician');
    }
  });

  it('la insignia de rol y el aviso de la pantalla dicen "Technician"', () => {
    for (const badge of $$('[data-role-badge]')) {
      expect(badge.classList.contains('role-technician')).toBe(true);
      expect(badge.textContent).toContain(en.role_technician);
    }
    expect($('[data-role-note="ops"]').textContent).toContain(en.note_ops);
  });

  it('la tabla de cuentas lista a todo el equipo, y la fila del técnico no tiene acciones', () => {
    const rows = $$('#ops-accounts-list tr[data-account]');
    expect(rows.length).toBe(getState().team.length);
    const selfRow = rows.find(r => r.textContent?.includes(technicianSeed.username));
    expect(selfRow?.textContent).toContain(en.ops_single_account);
    expect(selfRow?.querySelector('select, button')).toBeNull();
  });

  it('cambia el rol de un agente real y vuelve a dejarlo como estaba', async () => {
    const agent = getState().team.find(m => m.role === 'employee');
    if (!agent) throw new Error('no hay ningún agente en el directorio demo');
    // Cada cambio de estado vuelve a pintar la tabla entera (`setHtml`): el `<select>` de antes
    // queda desconectado del documento y ya no puede disparar eventos reales — se reconsulta.
    const selectFor = (): HTMLSelectElement => {
      const el = document.querySelector<HTMLSelectElement>(`tr[data-account="${agent.id}"] select`);
      if (!el) throw new Error('la fila del agente no tiene selector de rol');
      return el;
    };

    selectFor().value = 'admin';
    selectFor().dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      expect(getState().team.find(m => m.id === agent.id)?.role).toBe('admin');
    });

    selectFor().value = 'employee';
    selectFor().dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      expect(getState().team.find(m => m.id === agent.id)?.role).toBe('employee');
    });
  });

  it('los ajustes de la organización se cargan y se guardan de verdad', async () => {
    $('[data-action="ops:tab"][data-tab="settings"]').click();
    await vi.waitFor(() => {
      expect($('#ops-panel-settings').classList.contains('active')).toBe(true);
    });

    const before = await repos.catalog.settings();
    const undoInput = $<HTMLInputElement>('#ops-undo-window');
    undoInput.value = String(before.undoWindowSeconds === 20 ? 12 : 20);
    $('#ops-settings-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(async () => {
      const after = await repos.catalog.settings();
      expect(after.undoWindowSeconds).toBe(Number(undoInput.value));
    });
  });

  it('el panel de sistema muestra recuentos reales', () => {
    $('[data-action="ops:tab"][data-tab="system"]').click();
    const grid = $('#ops-system-grid').textContent ?? '';
    expect(grid).toContain(String(getState().listings.length));
    expect(grid).toContain(String(getState().posts.length));
    expect(grid).toContain('memory');
  });
});
