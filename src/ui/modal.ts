import { registerActions } from '../app/actions';
import { getById, targetElement } from '../core/dom';

const closeHooks = new Map<string, () => void>();

export function openModal(id: string): void {
  getById(id)?.classList.add('open');
}

export function closeModal(id: string): void {
  closeHooks.get(id)?.();
  getById(id)?.classList.remove('open');
}

/** Ejecuta `hook` cada vez que se cierra el modal (p. ej. para detener temporizadores). */
export function onModalClose(id: string, hook: () => void): void {
  closeHooks.set(id, hook);
}

export function initModals(): void {
  registerActions({
    'modal:open': el => {
      if (el.dataset.modal) openModal(el.dataset.modal);
    },
    'modal:close': el => {
      if (el.dataset.modal) closeModal(el.dataset.modal);
    },
  });

  // Clic en el fondo (overlay) cierra el modal.
  document.addEventListener('click', event => {
    const target = targetElement(event);
    if (target?.classList.contains('modal-overlay') && target.id) closeModal(target.id);
  });
}
