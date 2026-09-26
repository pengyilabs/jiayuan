/**
 * Manejo declarativo de imágenes rotas / cargadas.
 * `error` y `load` no burbujean, por eso se escuchan en fase de captura.
 */
import { targetElement } from '../core/dom';

type Fallback = (img: HTMLImageElement) => void;

const FALLBACKS: Readonly<Record<string, Fallback>> = {
  feed: img => {
    img.style.background = 'var(--surface-warm)';
    img.alt = '';
  },
  thumb: img => {
    img.style.background = 'var(--surface-warm)';
  },
  card: img => {
    img.style.opacity = '1';
    img.style.background = '#eee';
  },
  gallery: img => {
    img.style.background = '#333';
    img.style.objectFit = 'contain';
  },
};

export function initImageFallbacks(): void {
  document.addEventListener(
    'error',
    event => {
      const target = targetElement(event);
      if (target instanceof HTMLImageElement && target.dataset.fallback) {
        FALLBACKS[target.dataset.fallback]?.(target);
      }
    },
    true,
  );

  document.addEventListener(
    'load',
    event => {
      const target = targetElement(event);
      if (target instanceof HTMLImageElement && target.dataset.loadedClass) {
        target.classList.add(target.dataset.loadedClass);
      }
    },
    true,
  );
}
