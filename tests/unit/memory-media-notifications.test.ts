// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepositories } from '../../src/data/repositories/memory';
import { ADMIN_ID, LIMING_ID, WANGFANG_ID } from '../../src/data/seed/users';
import type { Repositories } from '../../src/data/repositories/types';

// jsdom no implementa `URL.createObjectURL` para los `File`/`Blob` del entorno de test
// (funciona en cualquier navegador real); se sustituye por una versión mínima y determinista.
let nextBlobId = 0;
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: () => `blob:test-${String(nextBlobId++)}`,
  revokeObjectURL: () => undefined,
});

let actor = ADMIN_ID;
const repos: Repositories = createMemoryRepositories({ currentUserId: () => actor });
const as = <T>(userId: string, fn: () => Promise<T>): Promise<T> => {
  actor = userId;
  return fn();
};

const file = (name: string, type: string): File => new File([new Uint8Array(10)], name, { type });

beforeEach(() => {
  actor = ADMIN_ID;
});

describe('setMedia (repositorio en memoria)', () => {
  it('el autor sustituye las imágenes de su propio borrador', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'Prueba',
        scheduledAt: new Date().toISOString(),
      }),
    );
    const updated = await as(LIMING_ID, () =>
      repos.posts.setMedia(draft.id, [
        { file: file('a.jpg', 'image/jpeg'), kind: 'image' },
        { file: file('b.jpg', 'image/jpeg'), kind: 'image' },
      ]),
    );
    expect(updated.images).toHaveLength(2);
    expect(updated.images.every(src => src.startsWith('blob:'))).toBe(true);

    // Sustituye por completo lo anterior.
    const replaced = await as(LIMING_ID, () =>
      repos.posts.setMedia(draft.id, [{ file: file('c.mp4', 'video/mp4'), kind: 'video' }]),
    );
    expect(replaced.images).toHaveLength(0);
    expect(replaced.media).toBe('single'); // el campo `media` no lo cambia setMedia por sí solo
  });

  it('otro empleado no puede tocar los archivos de un post ajeno', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'x',
        scheduledAt: new Date().toISOString(),
      }),
    );
    await expect(
      as(WANGFANG_ID, () =>
        repos.posts.setMedia(draft.id, [{ file: file('a.jpg', 'image/jpeg'), kind: 'image' }]),
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('un administrador sí puede reemplazar los archivos de cualquier post', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'x',
        scheduledAt: new Date().toISOString(),
      }),
    );
    const updated = await as(ADMIN_ID, () =>
      repos.posts.setMedia(draft.id, [{ file: file('a.jpg', 'image/jpeg'), kind: 'image' }]),
    );
    expect(updated.images).toHaveLength(1);
  });

  it('no se pueden tocar los archivos de un post ya enviado a aprobación', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'x',
        scheduledAt: new Date().toISOString(),
      }),
    );
    await as(LIMING_ID, () => repos.posts.submit(draft.id));
    await expect(
      as(LIMING_ID, () =>
        repos.posts.setMedia(draft.id, [{ file: file('a.jpg', 'image/jpeg'), kind: 'image' }]),
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
});

describe('notificaciones (repositorio en memoria)', () => {
  it('solicitar aprobación notifica a todos los administradores activos', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'Notif',
        scheduledAt: new Date().toISOString(),
      }),
    );
    await as(LIMING_ID, () => repos.posts.submit(draft.id));

    const adminNotifs = await as(ADMIN_ID, () => repos.notifications.list());
    expect(adminNotifs[0]).toMatchObject({
      type: 'post_pending',
      postId: draft.id,
      title: 'Notif',
      readAt: null,
    });

    // A quien lo solicitó no le llega una notificación por su propia acción.
    const authorNotifs = await as(LIMING_ID, () => repos.notifications.list());
    expect(authorNotifs.some(n => n.type === 'post_pending' && n.postId === draft.id)).toBe(false);
  });

  it('aprobar y rechazar notifican al autor (el rechazo incluye el motivo)', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'A',
        scheduledAt: new Date().toISOString(),
      }),
    );
    await as(LIMING_ID, () => repos.posts.submit(draft.id));
    await as(ADMIN_ID, () => repos.posts.approve(draft.id));

    let authorNotifs = await as(LIMING_ID, () => repos.notifications.list());
    expect(authorNotifs[0]).toMatchObject({ type: 'post_approved', postId: draft.id });

    const draft2 = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'B',
        scheduledAt: new Date().toISOString(),
      }),
    );
    await as(LIMING_ID, () => repos.posts.submit(draft2.id));
    await as(ADMIN_ID, () => repos.posts.reject(draft2.id, 'Las fotos no cumplen el formato'));

    authorNotifs = await as(LIMING_ID, () => repos.notifications.list());
    expect(authorNotifs[0]).toMatchObject({
      type: 'post_rejected',
      postId: draft2.id,
      reason: 'Las fotos no cumplen el formato',
    });
  });

  it('marcar como publicado notifica al autor', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'Pub',
        scheduledAt: new Date().toISOString(),
      }),
    );
    await as(LIMING_ID, () => repos.posts.submit(draft.id));
    await as(ADMIN_ID, () => repos.posts.approve(draft.id));
    await as(ADMIN_ID, () => repos.posts.markPublished(draft.id, 'https://facebook.com/x'));

    const authorNotifs = await as(LIMING_ID, () => repos.notifications.list());
    expect(authorNotifs[0]).toMatchObject({ type: 'post_published', postId: draft.id });
  });

  it('markRead y markAllRead marcan solo las notificaciones propias', async () => {
    const draft = await as(LIMING_ID, () =>
      repos.posts.create({
        listingId: null,
        platformId: 'facebook',
        title: 'R',
        scheduledAt: new Date().toISOString(),
      }),
    );
    await as(LIMING_ID, () => repos.posts.submit(draft.id));

    const [notif] = await as(ADMIN_ID, () => repos.notifications.list());
    if (!notif) throw new Error('sin notificación');
    expect(notif.readAt).toBeNull();

    await as(ADMIN_ID, () => repos.notifications.markRead(notif.id));
    const afterOne = await as(ADMIN_ID, () => repos.notifications.list());
    expect(afterOne.find(n => n.id === notif.id)?.readAt).not.toBeNull();

    await as(ADMIN_ID, () => repos.notifications.markAllRead());
    const afterAll = await as(ADMIN_ID, () => repos.notifications.list());
    expect(afterAll.every(n => n.readAt !== null)).toBe(true);
  });
});
