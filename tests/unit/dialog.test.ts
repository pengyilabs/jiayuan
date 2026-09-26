import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { armDangerButton, showDialog } from '../../src/ui/dialog';

const overlay = (): HTMLElement => document.querySelector('.dialog-overlay') as HTMLElement;
const cancelBtn = (): HTMLButtonElement =>
  overlay().querySelector('[data-dialog="cancel"]') as HTMLButtonElement;
const confirmBtn = (): HTMLButtonElement =>
  overlay().querySelector('[data-dialog="confirm"]') as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('showDialog · nivel info', () => {
  it('un solo botón, sin cancelar; Escape también resuelve true', async () => {
    const promise = showDialog({ level: 'info', title: 'Listo', message: 'Todo guardado.' });
    expect(cancelBtn().hidden).toBe(true);
    expect(overlay().classList.contains('open')).toBe(true);

    overlay().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect(promise).resolves.toBe(true);
    expect(overlay().classList.contains('open')).toBe(false);
  });

  it('el botón confirmar resuelve true de inmediato (sin refuerzo)', async () => {
    const promise = showDialog({ level: 'info', title: 'Listo' });
    expect(confirmBtn().disabled).toBe(false);
    confirmBtn().click();
    await expect(promise).resolves.toBe(true);
  });
});

describe('showDialog · nivel confirm', () => {
  it('cancelar resuelve false; confirmar resuelve true; ninguno está armado', async () => {
    let promise = showDialog({ level: 'confirm', title: '¿Retirar?', confirmLabel: 'Retirar' });
    expect(confirmBtn().disabled).toBe(false);
    cancelBtn().click();
    await expect(promise).resolves.toBe(false);

    promise = showDialog({ level: 'confirm', title: '¿Retirar?' });
    confirmBtn().click();
    await expect(promise).resolves.toBe(true);
  });

  it('clic en el fondo cancela', async () => {
    const promise = showDialog({ level: 'confirm', title: 'x' });
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(promise).resolves.toBe(false);
  });

  it('el foco por defecto es Cancelar, nunca Confirmar', () => {
    void showDialog({ level: 'confirm', title: 'x' });
    expect(document.activeElement).toBe(cancelBtn());
  });
});

describe('showDialog · nivel danger (acción permanente)', () => {
  it('el botón de confirmación empieza deshabilitado y se habilita tras el refuerzo', async () => {
    const promise = showDialog({ level: 'danger', title: 'Eliminar', confirmLabel: 'Eliminar' });
    expect(confirmBtn().disabled).toBe(true);
    expect(confirmBtn().className).toContain('btn-danger');

    await vi.advanceTimersByTimeAsync(899);
    expect(confirmBtn().disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(confirmBtn().disabled).toBe(false);

    confirmBtn().click();
    await expect(promise).resolves.toBe(true);
  });

  it('cancelar durante el refuerzo también resuelve false y detiene el temporizador', async () => {
    const promise = showDialog({ level: 'danger', title: 'Eliminar' });
    cancelBtn().click();
    await expect(promise).resolves.toBe(false);
    expect(confirmBtn().classList.contains('is-armed')).toBe(false);
  });
});

describe('showDialog · un único diálogo a la vez', () => {
  it('abrir uno nuevo cancela el anterior', async () => {
    const first = showDialog({ level: 'confirm', title: 'Primero' });
    const second = showDialog({ level: 'info', title: 'Segundo' });
    await expect(first).resolves.toBe(false);
    expect(overlay().querySelector('.dialog-title')?.textContent).toBe('Segundo');
    confirmBtn().click();
    await expect(second).resolves.toBe(true);
  });
});

describe('armDangerButton', () => {
  it('deshabilita el botón y lo habilita tras delayMs; la función devuelta lo desarma antes', async () => {
    const button = document.createElement('button');
    const disarm = armDangerButton(button, 500);
    expect(button.disabled).toBe(true);
    expect(button.classList.contains('is-armed')).toBe(true);

    disarm();
    expect(button.classList.contains('is-armed')).toBe(false);
    await vi.advanceTimersByTimeAsync(600);
    expect(button.disabled).toBe(true); // el desarme detuvo el temporizador: sigue deshabilitado
  });
});
