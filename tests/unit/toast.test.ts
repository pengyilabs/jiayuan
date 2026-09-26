import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '../../src/ui/toast';

const toasts = (): HTMLElement[] => Array.from(document.querySelectorAll('.toast'));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(async () => {
  // Cierra cualquier aviso que quedara abierto para no arrastrar estado entre pruebas
  // (el módulo mantiene una única cola compartida, como en la aplicación real).
  toasts().forEach(toast => {
    toast.querySelector<HTMLButtonElement>('.toast-close')?.click();
  });
  await vi.advanceTimersByTimeAsync(300);
  vi.useRealTimers();
});

describe('showToast', () => {
  it('se muestra con el mensaje y desaparece solo tras la duración', async () => {
    showToast('Guardado', { durationMs: 1000 });
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]?.querySelector('.toast-message')?.textContent).toBe('Guardado');

    await vi.advanceTimersByTimeAsync(999);
    expect(toasts()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1 + 200); // + la transición de salida
    expect(toasts()).toHaveLength(0);
  });

  it('el botón cerrar lo retira antes de tiempo', async () => {
    showToast('Aviso', { durationMs: 5000 });
    toasts()[0]?.querySelector<HTMLButtonElement>('.toast-close')?.click();
    await vi.advanceTimersByTimeAsync(200);
    expect(toasts()).toHaveLength(0);
  });

  it('pasar el cursor pausa el temporizador; al salir, se reanuda', async () => {
    showToast('Pausable', { durationMs: 1000 });
    const toast = toasts()[0];
    if (!toast) throw new Error('sin toast');

    await vi.advanceTimersByTimeAsync(800);
    toast.dispatchEvent(new Event('mouseenter'));
    await vi.advanceTimersByTimeAsync(5000); // mucho más que los 200ms restantes: no debe cerrarse
    expect(toasts()).toHaveLength(1);

    toast.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(199);
    expect(toasts()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1 + 200);
    expect(toasts()).toHaveLength(0);
  });

  it('recibir el foco también pausa (accesible por teclado)', async () => {
    showToast('Con foco', { durationMs: 1000 });
    const toast = toasts()[0];
    toast?.dispatchEvent(new Event('focusin'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(toasts()).toHaveLength(1);
    toast?.dispatchEvent(new Event('focusout'));
    await vi.advanceTimersByTimeAsync(1200);
    expect(toasts()).toHaveLength(0);
  });

  it('Deshacer llama al callback una sola vez y cierra el aviso', async () => {
    const undo = vi.fn();
    showToast('Aprobado', { durationMs: 5000, undo });
    const button = toasts()[0]?.querySelector<HTMLButtonElement>('.toast-undo');
    expect(button).not.toBeNull();

    button?.click();
    button?.click(); // el aviso ya se está cerrando: no debe volver a invocar
    await vi.advanceTimersByTimeAsync(200);
    expect(undo).toHaveBeenCalledOnce();
    expect(toasts()).toHaveLength(0);
  });

  it('sin `undo` no se muestra el botón Deshacer', () => {
    showToast('Simple');
    expect(toasts()[0]?.querySelector('.toast-undo')).toBeNull();
  });

  it('kind determina la clase y el rol ARIA (error usa alert)', () => {
    showToast('Falló', { kind: 'error', durationMs: 100 });
    const toast = toasts().at(-1);
    expect(toast?.className).toContain('toast-error');
    expect(toast?.getAttribute('role')).toBe('alert');
  });

  it('cola: más de 3 avisos simultáneos esperan turno', async () => {
    for (let i = 1; i <= 5; i++) showToast(`Aviso ${String(i)}`, { durationMs: 300 });
    expect(toasts()).toHaveLength(3);
    expect(toasts().map(t => t.querySelector('.toast-message')?.textContent)).toEqual([
      'Aviso 1',
      'Aviso 2',
      'Aviso 3',
    ]);

    await vi.advanceTimersByTimeAsync(300 + 200);
    expect(toasts().map(t => t.querySelector('.toast-message')?.textContent)).toEqual([
      'Aviso 4',
      'Aviso 5',
    ]);
  });
});
