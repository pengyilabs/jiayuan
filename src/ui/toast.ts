/**
 * Avisos superiores no bloqueantes (sustituyen a `alert()`), con temporizador visible,
 * pausa al pasar el cursor o el foco, botón "Deshacer" opcional y cola (como mucho
 * `MAX_VISIBLE` a la vez; el resto espera su turno).
 */
import { t } from '../i18n';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastOptions {
  kind?: ToastKind;
  durationMs?: number;
  /** Si se indica, se muestra un botón "Deshacer" que la ejecuta (una sola vez). */
  undo?: () => void | Promise<void>;
  undoLabel?: string;
}

const DEFAULT_DURATION_MS = 4000;
const LEAVE_MS = 200;
const MAX_VISIBLE = 3;

interface Queued {
  message: string;
  options: ToastOptions;
}

const queue: Queued[] = [];
let visibleCount = 0;
let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement {
  if (region) return region;
  region = document.createElement('div');
  region.className = 'toast-region';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-label', t('toast_region_label'));
  document.body.append(region);
  return region;
}

function drain(): void {
  while (visibleCount < MAX_VISIBLE && queue.length > 0) {
    const next = queue.shift();
    if (next) render(next.message, next.options);
  }
}

function render(message: string, options: ToastOptions): void {
  visibleCount += 1;
  const root = ensureRegion();
  const kind = options.kind ?? 'info';
  const duration = options.durationMs ?? DEFAULT_DURATION_MS;

  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}`;
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.tabIndex = -1;

  const bar = document.createElement('div');
  bar.className = 'toast-bar';
  bar.style.animationDuration = `${String(duration)}ms`;

  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'toast-actions';

  let undoUsed = false;
  if (options.undo) {
    const undo = options.undo;
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo';
    undoBtn.textContent = options.undoLabel ?? t('toast_undo');
    undoBtn.addEventListener('click', () => {
      if (undoUsed) return;
      undoUsed = true;
      dismiss();
      void undo();
    });
    actions.append(undoBtn);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', t('toast_close'));
  close.textContent = '×';
  close.addEventListener('click', () => {
    dismiss();
  });
  actions.append(close);

  toast.append(bar, text, actions);
  root.append(toast);

  let remaining = duration;
  let startedAt = performance.now();
  let timer = window.setTimeout(dismiss, duration);
  let dismissed = false;

  function pause(): void {
    if (dismissed) return;
    window.clearTimeout(timer);
    remaining -= performance.now() - startedAt;
    bar.style.animationPlayState = 'paused';
  }
  function resume(): void {
    if (dismissed) return;
    startedAt = performance.now();
    timer = window.setTimeout(dismiss, Math.max(remaining, 0));
    bar.style.animationPlayState = 'running';
  }
  function dismiss(): void {
    if (dismissed) return;
    dismissed = true;
    window.clearTimeout(timer);
    toast.removeEventListener('mouseenter', pause);
    toast.removeEventListener('mouseleave', resume);
    toast.removeEventListener('focusin', pause);
    toast.removeEventListener('focusout', resume);
    toast.classList.add('is-leaving');
    window.setTimeout(() => {
      toast.remove();
      visibleCount -= 1;
      drain();
    }, LEAVE_MS);
  }

  toast.addEventListener('mouseenter', pause);
  toast.addEventListener('mouseleave', resume);
  toast.addEventListener('focusin', pause);
  toast.addEventListener('focusout', resume);
}

export function showToast(message: string, options: ToastOptions = {}): void {
  queue.push({ message, options });
  drain();
}

/** Alias histórico (F0–F2 lo usaban como aviso simple). */
export const showNotice = (message: string): void => {
  showToast(message);
};
