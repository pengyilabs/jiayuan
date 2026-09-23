/** Carrusel de imágenes dentro de las tarjetas del feed (botones, puntos y swipe táctil). */
import { registerActions } from '../../app/actions';
import { qsa, targetElement } from '../../core/dom';

const SWIPE_THRESHOLD_PX = 40;

function goTo(strip: HTMLElement, requested: number): void {
  const track = strip.querySelector<HTMLElement>('.feed-carousel-track');
  const total = strip.querySelectorAll('.feed-carousel-img').length;
  if (!track || total === 0) return;
  const index = (requested + total) % total;
  strip.dataset.index = String(index);
  track.style.transform = `translateX(-${String(index * 100)}%)`;
  qsa('.feed-carousel-dot', strip).forEach((dot, i) => dot.classList.toggle('active', i === index));
}

const currentIndex = (strip: HTMLElement): number => Number(strip.dataset.index ?? 0);

export function initFeedCarousel(): void {
  registerActions({
    'feed-carousel:step': el => {
      const strip = el.closest<HTMLElement>('.feed-carousel-strip');
      if (strip) goTo(strip, currentIndex(strip) + Number(el.dataset.dir));
    },
    'feed-carousel:goto': el => {
      const strip = el.closest<HTMLElement>('.feed-carousel-strip');
      if (strip) goTo(strip, Number(el.dataset.index));
    },
  });

  let startX = 0;
  document.addEventListener(
    'touchstart',
    event => {
      if (targetElement(event)?.closest('.feed-carousel-track')) {
        startX = event.touches[0]?.clientX ?? 0;
      }
    },
    { passive: true },
  );
  document.addEventListener(
    'touchend',
    event => {
      const strip = targetElement(event)?.closest<HTMLElement>('.feed-carousel-strip');
      const endX = event.changedTouches[0]?.clientX;
      if (!strip || endX === undefined) return;
      const diff = startX - endX;
      if (Math.abs(diff) > SWIPE_THRESHOLD_PX)
        goTo(strip, currentIndex(strip) + (diff > 0 ? 1 : -1));
    },
    { passive: true },
  );
}
