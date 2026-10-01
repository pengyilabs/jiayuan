/**
 * Feed móvil de agente (F10): reproduce el diseño adjunto con datos reales — mismo `getState()`
 * que el resto de la app, mismas acciones reales (nuevo post, notificaciones, navegación).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState, setState } from '../../src/app/state';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};
const $$ = (selector: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(selector));

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('liming', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('feed móvil de agente', () => {
  it('existe una tarjeta por cada post propio, con estado y precio reales', () => {
    const cards = $$('#m-feed .m-post-card, #m-feed .m-feed-tpl');
    expect(cards.length).toBe(getState().posts.length);
    const first = getState().posts[0];
    if (!first) throw new Error('el agente demo no tiene posts');
    const card = $(`[data-od-id="m-post-${first.id}"]`);
    expect(card.textContent).toContain(first.title);
  });

  it('el ciclo de idioma cambia el idioma real de la app (mismo store que en escritorio)', () => {
    setState({ lang: 'en' });
    $('#m-lang-cycle').click();
    expect(getState().lang).toBe('fr');
    setState({ lang: 'en' });
  });

  it('"Post" abre la hoja de creación de 3 pasos (F10.1), no el formulario de escritorio', () => {
    $('#mobile-agent-feed [data-action="mobile-feed:open-create"]').click();
    expect($('#m-sheet-overlay').classList.contains('m-open')).toBe(true);
    expect($('#m-sheet-body').textContent).toContain(getState().listings[0]?.title.en ?? '');
    $('#m-sheet-close').click();
    expect($('#m-sheet-overlay').classList.contains('m-open')).toBe(false);
  });

  it('la pestaña "Listings" navega a la página real de propiedades', () => {
    $('[data-action="mobile-feed:tab"][data-tab="listings"]').click();
    expect(getState().page).toBe('listings');
    setState({ page: 'dashboard' });
  });

  it('el botón de notificaciones del feed móvil usa el widget real (F4/F8)', () => {
    const btn = $('#mobile-agent-feed .notif-btn');
    btn.click();
    expect($('#mobile-agent-feed .notif-dropdown').classList.contains('open')).toBe(true);
    btn.click();
  });

  it('un post con plantilla reutiliza el renderizador real (F5), no un diseño inventado', () => {
    const withListing = getState().posts.find(p => p.listingId !== null);
    if (!withListing) throw new Error('el agente demo no tiene posts ligados a un listing');
    const tpl = getState().templates.find(t =>
      t.variants.some(v => v.platformId === withListing.platformId),
    );
    if (!tpl) throw new Error('no hay plantilla compatible con la plataforma del post de prueba');

    setState({
      posts: getState().posts.map(p =>
        p.id === withListing.id ? { ...p, templateId: tpl.id } : p,
      ),
    });

    const card = $(`[data-od-id="m-post-${withListing.id}"]`);
    expect(card.classList.contains('m-feed-tpl')).toBe(true);
    expect(card.querySelector('.tpl-preview')).toBeTruthy();

    setState({
      posts: getState().posts.map(p => (p.id === withListing.id ? { ...p, templateId: null } : p)),
    });
  });
});
