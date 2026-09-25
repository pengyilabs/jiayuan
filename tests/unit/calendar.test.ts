/** Calendario de Home (F6): mes/semana/agenda, clic en un día filtra el feed. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState, setState } from '../../src/app/state';
import { todayInTimeZone } from '../../src/core/dates';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};
const $$ = <T extends HTMLElement = HTMLElement>(selector: string): T[] =>
  Array.from(document.querySelectorAll<T>(selector));

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('calendario de Home', () => {
  it('arranca en modo mes con hoy resaltado', () => {
    expect(getState().calendarMode).toBe('month');
    expect($$('.cal-day')).toHaveLength(42);
    expect($$('.cal-day.today')).toHaveLength(1);
  });

  it('el prev/next de mes navega y "Today" vuelve al mes actual', async () => {
    const before = getState().calendarAnchor;
    $('[data-action="calendar:nav"][data-dir="-1"]').click();
    await vi.waitFor(() => {
      expect(getState().calendarAnchor).not.toBe(before);
    });
    $('[data-action="calendar:today"]').click();
    // Se recalcula "hoy" en el momento de comprobar (en vez de reusar `before`): si el reloj
    // del sistema cruza la medianoche entre el arranque del test y esta aserción, `before`
    // quedaría desactualizado y el test fallaría por una razón ajena al propio calendario.
    await vi.waitFor(() => {
      expect(getState().calendarAnchor).toBe(todayInTimeZone(getState().settings.timezone));
    });
  });

  it('clic en un día con contenido lo selecciona y filtra el feed; un segundo clic lo deselecciona', async () => {
    // Los posts de la demo están en agosto de 2026: retrocede un mes desde hoy (septiembre).
    $('[data-action="calendar:nav"][data-dir="-1"]').click();
    await vi.waitFor(() => {
      expect($$('.cal-day.has-posts').length).toBeGreaterThan(0);
    });

    const findDay = (): HTMLElement => {
      const el = $$('.cal-day.has-posts').find(day => day.dataset.date === '2026-08-22');
      if (!el) throw new Error('el día de referencia no tiene posts en la demo');
      return el;
    };
    findDay().click(); // el calendario se re-renderiza entero tras cada clic: hay que reconsultar

    await vi.waitFor(() => {
      expect(getState().feedDateRange).toEqual({ from: '2026-08-22', to: '2026-08-22' });
    });
    expect($('#calendar-clear').hidden).toBe(false);
    expect(getState().posts.filter(p => p.date === '2026-08-22').length).toBeGreaterThan(0);
    await vi.waitFor(() => {
      expect($$('#feed-day-rows .day-section')).toHaveLength(1);
    });
    expect($('#feed-day-rows .day-section').dataset.date).toBe('2026-08-22');

    findDay().click(); // deselecciona
    await vi.waitFor(() => {
      expect(getState().feedDateRange).toEqual({ from: null, to: null });
    });
    expect(findDay().classList.contains('selected')).toBe(false);
  });

  it('el botón "Clear date" también limpia el filtro', async () => {
    setState({ feedDateRange: { from: '2026-08-01', to: '2026-08-31' } });
    await vi.waitFor(() => {
      expect($('#calendar-clear').hidden).toBe(false);
    });
    $('#calendar-clear').click();
    await vi.waitFor(() => {
      expect(getState().feedDateRange).toEqual({ from: null, to: null });
    });
  });

  it('cambia entre mes, semana y agenda', async () => {
    $('[data-action="calendar:mode"][data-mode="week"]').click();
    await vi.waitFor(() => {
      expect($('#calendar-body .cal-week-list')).toBeTruthy();
    });
    expect($$('.cal-week-row-item')).toHaveLength(7);

    $('[data-action="calendar:mode"][data-mode="agenda"]').click();
    await vi.waitFor(() => {
      expect(getState().calendarMode).toBe('agenda');
    });

    $('[data-action="calendar:mode"][data-mode="month"]').click();
    await vi.waitFor(() => {
      expect($$('.cal-month-grid .cal-day')).toHaveLength(42);
    });
  });

  it('el filtro de estado solo aparece para administradores', async () => {
    expect($('#feed-status-filters').hidden).toBe(false);

    const admin = getState().currentUser;
    if (!admin) throw new Error('sin usuario actual');
    setState({ currentUser: { ...admin, role: 'employee' } });
    await vi.waitFor(() => {
      expect($('#feed-status-filters').hidden).toBe(true);
    });

    setState({ currentUser: admin }); // deja el estado como lo encontró para no afectar otros tests
  });
});
