/**
 * Diálogos modales de tres niveles (sustituyen a `confirm()`/`alert()` nativos):
 *  · `info`    — informativo, un solo botón (Aceptar).
 *  · `confirm` — acción reversible: Cancelar / Confirmar.
 *  · `danger`  — acción permanente: Cancelar / botón rojo con confirmación reforzada
 *    (permanece deshabilitado un instante para evitar clics accidentales).
 *
 * Un único diálogo compartido: si se abre uno nuevo mientras hay otro visible, el anterior
 * se cierra como si se hubiera cancelado.
 */
import { t } from '../i18n';

export type DialogLevel = 'info' | 'confirm' | 'danger';

export interface DialogOptions {
  level: DialogLevel;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Antes de habilitarse, un botón de acción permanente permanece deshabilitado este tiempo. */
const ARM_DELAY_MS = 900;

let overlay: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let messageEl: HTMLElement | null = null;
let cancelBtn: HTMLButtonElement | null = null;
let confirmBtn: HTMLButtonElement | null = null;
let disarm: (() => void) | null = null;
let settle: ((value: boolean) => void) | null = null;
let lastFocused: HTMLElement | null = null;
let dismissValue = false;

function build(): void {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
      <h3 class="dialog-title" id="dialog-title"></h3>
      <p class="dialog-message" id="dialog-message"></p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" data-dialog="cancel"></button>
        <button type="button" class="btn" data-dialog="confirm"></button>
      </div>
    </div>`;
  document.body.append(overlay);

  titleEl = overlay.querySelector('#dialog-title');
  messageEl = overlay.querySelector('#dialog-message');
  cancelBtn = overlay.querySelector('[data-dialog="cancel"]');
  confirmBtn = overlay.querySelector('[data-dialog="confirm"]');

  overlay.addEventListener('click', event => {
    if (event.target === overlay) resolveWith(dismissValue);
  });
  cancelBtn?.addEventListener('click', () => {
    resolveWith(false);
  });
  confirmBtn?.addEventListener('click', () => {
    resolveWith(true);
  });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      resolveWith(dismissValue);
      return;
    }
    if (event.key !== 'Tab') return;
    // Foco atrapado entre los dos únicos elementos interactivos del diálogo.
    const focusable = [cancelBtn, confirmBtn].filter(
      (el): el is HTMLButtonElement => !!el && !el.hidden,
    );
    if (focusable.length < 2) return;
    const [first, last] = [focusable[0], focusable[focusable.length - 1]];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
}

function resolveWith(value: boolean): void {
  if (!settle) return;
  disarm?.();
  disarm = null;
  const resolve = settle;
  settle = null;
  overlay?.classList.remove('open');
  lastFocused?.focus();
  lastFocused = null;
  resolve(value);
}

/** Deshabilita `button` durante `delayMs` con una barra de progreso visual (fricción deliberada). */
export function armDangerButton(button: HTMLButtonElement, delayMs = ARM_DELAY_MS): () => void {
  button.disabled = true;
  button.classList.add('is-armed');
  button.style.setProperty('--arm-duration', `${String(delayMs)}ms`);
  const timer = window.setTimeout(() => {
    button.disabled = false;
    button.classList.remove('is-armed');
  }, delayMs);
  return () => {
    window.clearTimeout(timer);
    button.classList.remove('is-armed');
  };
}

/** Muestra el diálogo y resuelve `true` (confirmado/aceptado) o `false` (cancelado). */
export function showDialog(options: DialogOptions): Promise<boolean> {
  build();
  if (settle) resolveWith(false); // solo un diálogo a la vez

  return new Promise<boolean>(resolve => {
    settle = resolve;
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (titleEl) titleEl.textContent = options.title;
    if (messageEl) {
      messageEl.textContent = options.message ?? '';
      messageEl.hidden = !options.message;
    }

    const isInfo = options.level === 'info';
    dismissValue = isInfo;
    if (cancelBtn) {
      cancelBtn.hidden = isInfo;
      cancelBtn.textContent = options.cancelLabel ?? t('btn_cancel');
    }
    if (confirmBtn) {
      confirmBtn.className = `btn ${options.level === 'danger' ? 'btn-danger' : 'btn-primary'}`;
      confirmBtn.textContent = options.confirmLabel ?? t(isInfo ? 'dialog_ok' : 'btn_confirm');
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('is-armed');
      disarm = options.level === 'danger' ? armDangerButton(confirmBtn) : null;
    }

    overlay?.classList.add('open');
    // Nunca enfoca por defecto el botón que confirma una acción permanente/irreversible.
    (isInfo ? confirmBtn : cancelBtn)?.focus();
  });
}
