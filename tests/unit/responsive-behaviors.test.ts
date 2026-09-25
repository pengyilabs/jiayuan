/** Comportamientos que dependen del tamaño de pantalla (F7): calendario, listado, cajón. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState } from '../../src/app/state';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};

beforeAll(async () => {
  setWidth(1440); // arranca en PC para que el bootstrap no fuerce nada de entrada
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('el calendario se adapta al tamaño', () => {
  it('PC deja el modo mensual por defecto', () => {
    expect(getState().calendarMode).toBe('month');
  });

  it('al pasar a tablet fuerza la vista semanal', async () => {
    setWidth(800);
    await vi.waitFor(() => {
      expect(getState().calendarMode).toBe('week');
    });
  });

  it('al pasar a móvil fuerza la agenda', async () => {
    setWidth(375);
    await vi.waitFor(() => {
      expect(getState().calendarMode).toBe('agenda');
    });
  });

  it('al volver a PC no se fuerza ningún modo (se respeta lo último elegido)', async () => {
    setWidth(1440);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(getState().calendarMode).toBe('agenda'); // sigue en agenda: PC no impone nada
  });
});

describe('el listado de propiedades se adapta al tamaño', () => {
  it('en móvil fuerza la vista de tarjetas', async () => {
    setWidth(375);
    await vi.waitFor(() => {
      expect(getState().listingsView).toBe('grid');
    });
  });
});

describe('el cajón de navegación en móvil', () => {
  it('navegar a otra página lo cierra', () => {
    setWidth(375);
    $('.sidebar')?.classList.remove('collapsed'); // simula el cajón abierto
    $('[data-action="nav:go"][data-page="listings"]').click();
    expect($('.sidebar').classList.contains('collapsed')).toBe(true);
  });
});
