/** Panel de notificaciones del topbar (F4). */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState } from '../../src/app/state';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('liming', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const draft = await repos.posts.create({
    listingId: null,
    platformId: 'facebook',
    title: 'Genera una notificación',
    scheduledAt: new Date('2026-12-01T10:00:00Z').toISOString(),
  });
  await repos.posts.submit(draft.id);

  // El destinatario de "post_pending" es el administrador: se recarga como zhuyan para que su
  // snapshot inicial (cargado en el arranque) ya incluya esa notificación.
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('panel de notificaciones', () => {
  it('el punto de aviso está visible cuando hay notificaciones sin leer', () => {
    expect(getState().notifications.length).toBeGreaterThan(0);
    expect($('.dash-header .notif-dot').hidden).toBe(false);
  });

  it('se abre y cierra al hacer clic fuera; lista lo pendiente de aprobar', async () => {
    $('.dash-header .notif-btn').click();
    await vi.waitFor(() => {
      expect($('.dash-header .notif-dropdown').classList.contains('open')).toBe(true);
    });
    expect($('.dash-header .notif-list').textContent).toContain('New post pending approval:');
    expect($('.dash-header .notif-list').textContent).toContain('Genera una notificación');

    document.body.click();
    await vi.waitFor(() => {
      expect($('.dash-header .notif-dropdown').classList.contains('open')).toBe(false);
    });
  });

  it('marcar una notificación como leída la distingue y actualiza el punto si no quedan más', async () => {
    $('.dash-header .notif-btn').click();
    const before = getState().notifications.filter(n => n.readAt === null).length;
    expect(before).toBeGreaterThan(0);

    $<HTMLButtonElement>('.notif-item.unread').click();
    await vi.waitFor(() => {
      expect(getState().notifications.filter(n => n.readAt === null).length).toBe(before - 1);
    });

    if (before === 1) {
      await vi.waitFor(() => {
        expect($('.dash-header .notif-dot').hidden).toBe(true);
      });
    }
  });

  it('marcar todas como leídas vacía el contador', async () => {
    $('[data-action="notif:mark-all-read"]').click();
    await vi.waitFor(() => {
      expect(getState().notifications.every(n => n.readAt !== null)).toBe(true);
    });
    expect($('.dash-header .notif-dot').hidden).toBe(true);
  });
});
