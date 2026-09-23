/** Galería del modal de detalle de un listing (autoavance + miniaturas). */
import { registerActions } from '../../app/actions';
import { getById, qsa } from '../../core/dom';

const AUTO_ADVANCE_MS = 5000;
const timers = new Map<number, number>();

export function clearGalleryTimer(id: number): void {
  window.clearInterval(timers.get(id));
  timers.delete(id);
}

export function clearAllGalleryTimers(): void {
  timers.forEach(timer => {
    window.clearInterval(timer);
  });
  timers.clear();
}

function showSlide(id: number, resolveIndex: (current: number, count: number) => number): void {
  const gallery = getById(`detail-gallery-${String(id)}`);
  if (!gallery) return;
  const items = qsa<HTMLImageElement | HTMLVideoElement>(':scope > img, :scope > video', gallery);
  const thumbs = qsa('.gallery-thumb', getById(`detail-thumbs-${String(id)}`) ?? gallery);
  const current = items.findIndex(item => item.classList.contains('active'));
  const next = resolveIndex(current, items.length);

  items.forEach(item => item.classList.remove('active'));
  thumbs.forEach(thumb => {
    thumb.classList.remove('active');
    thumb.style.borderColor = 'transparent';
    thumb.style.opacity = '0.7';
  });
  items[next]?.classList.add('active');
  const activeThumb = thumbs[next];
  if (activeThumb) {
    activeThumb.classList.add('active');
    activeThumb.style.borderColor = '#fff';
    activeThumb.style.opacity = '1';
  }

  items.forEach(item => {
    if (item instanceof HTMLVideoElement) {
      item.pause();
      item.currentTime = 0;
    }
  });
  const shown = items[next];
  if (shown instanceof HTMLVideoElement) shown.play().catch(() => undefined);
}

export function slideGallery(id: number, direction: number): void {
  showSlide(id, (current, count) => (current + direction + count) % count);
}

export function startGalleryAutoplay(id: number, count: number): void {
  clearGalleryTimer(id);
  if (count > 1) {
    timers.set(
      id,
      window.setInterval(() => {
        slideGallery(id, 1);
      }, AUTO_ADVANCE_MS),
    );
  }
}

export function initDetailGallery(): void {
  registerActions({
    'gallery:goto': el => {
      showSlide(Number(el.dataset.id), () => Number(el.dataset.index));
    },
  });
}
