/** Carrusel de las tarjetas del grid de listings (autoavance al pasar el cursor). */
import { registerActions } from '../../app/actions';
import { getState } from '../../app/state';
import { qsa, targetElement } from '../../core/dom';

const AUTO_ADVANCE_MS = 3000;
const timers = new Map<string, number>();

function slides(card: Element): { items: HTMLElement[]; dots: HTMLElement[] } {
  return {
    items: qsa('.card-carousel img, .card-carousel video', card),
    dots: qsa('.carousel-dot', card),
  };
}

function showSlide(card: Element, resolveIndex: (current: number, count: number) => number): void {
  const { items, dots } = slides(card);
  if (!items.length) return;
  const current = items.findIndex(item => item.classList.contains('active'));
  items[current]?.classList.remove('active');
  dots[current]?.classList.remove('active');
  const next = resolveIndex(current, items.length);
  items[next]?.classList.add('active');
  dots[next]?.classList.add('active');
}

export function slideCard(card: Element, direction: number): void {
  showSlide(card, (current, count) => (current + direction + count) % count);
}

export function goToCardSlide(card: Element, index: number): void {
  showSlide(card, () => index);
}

function startCarousel(card: HTMLElement): void {
  const id = card.dataset.listingId ?? '';
  window.clearInterval(timers.get(id));
  const listing = getState().listings.find(l => String(l.id) === id);
  if (!listing || listing.photos.length < 2) return;

  timers.set(
    id,
    window.setInterval(() => {
      slideCard(card, 1);
    }, AUTO_ADVANCE_MS),
  );
  // Reproduce el vídeo activo mientras el cursor está encima.
  card
    .querySelector<HTMLVideoElement>('video.active')
    ?.play()
    .catch(() => undefined);
}

function stopCarousel(card: HTMLElement): void {
  const id = card.dataset.listingId ?? '';
  window.clearInterval(timers.get(id));
  timers.delete(id);
  card.querySelectorAll('video').forEach(video => {
    video.pause();
    video.currentTime = 0;
  });
}

export function initCardCarousel(): void {
  registerActions({
    'card:slide': el => {
      const card = el.closest('.card');
      if (card) slideCard(card, Number(el.dataset.dir));
    },
    'card:goto': el => {
      const card = el.closest('.card');
      if (card) goToCardSlide(card, Number(el.dataset.index));
    },
  });

  // mouseenter/mouseleave no burbujean: se escuchan en fase de captura.
  const hoverCard = (event: Event, handler: (card: HTMLElement) => void): void => {
    const target = targetElement(event);
    if (target instanceof HTMLElement && target.matches('[data-hover-carousel]')) handler(target);
  };
  document.addEventListener(
    'mouseenter',
    e => {
      hoverCard(e, startCarousel);
    },
    true,
  );
  document.addEventListener(
    'mouseleave',
    e => {
      hoverCard(e, stopCarousel);
    },
    true,
  );
}
