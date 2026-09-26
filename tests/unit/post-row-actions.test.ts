/** Acciones de fila de un post (F4): retirar, marcar publicado, descargar el paquete. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState, setState } from '../../src/app/state';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

const createObjectUrlSpy = vi.fn(() => 'blob:test-package');
URL.createObjectURL = createObjectUrlSpy;
URL.revokeObjectURL = vi.fn();

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};

/** Añade (o sustituye) un post en el estado, como haría la interfaz tras llamar al repositorio. */
function putInState(post: { id: number }): void {
  setState(state => {
    const exists = state.posts.some(p => p.id === post.id);
    const posts = exists
      ? state.posts.map(p => (p.id === post.id ? { ...p, ...post } : p))
      : [...state.posts, post as never];
    return { posts };
  });
}

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('retirar una solicitud pendiente', () => {
  it('vuelve a borrador tras confirmar', async () => {
    await auth.signIn('liming', DEMO_PASSWORD);
    const draft = await repos.posts.create({
      listingId: null,
      platformId: 'facebook',
      title: 'Para retirar',
      scheduledAt: new Date('2026-12-01T10:00:00Z').toISOString(),
    });
    const pending = await repos.posts.submit(draft.id);
    // El autor sigue con sesión iniciada: retirar es una acción del propio autor.
    putInState(pending);

    const button = document.createElement('button');
    button.dataset.action = 'post:withdraw';
    button.dataset.id = String(draft.id);
    document.body.append(button);
    button.click();

    const confirmBtn = await vi.waitFor(() => $('.dialog-overlay.open [data-dialog="confirm"]'));
    confirmBtn.click();

    await vi.waitFor(() => {
      expect(getState().posts.find(p => p.id === draft.id)?.status).toBe('draft');
    });
    const toast = await vi.waitFor(() => document.querySelector('.toast-success'));
    expect(toast?.textContent).toContain('Request withdrawn');
    button.remove();
  });
});

describe('marcar como publicado', () => {
  it('exige confirmación reforzada, guarda la URL y ofrece deshacer', async () => {
    await auth.signIn('zhuyan', DEMO_PASSWORD);
    const draft = await repos.posts.create({
      listingId: null,
      platformId: 'facebook',
      title: 'Lista para publicar',
      scheduledAt: new Date('2026-12-01T10:00:00Z').toISOString(),
    });
    await repos.posts.submit(draft.id);
    const approved = await repos.posts.approve(draft.id);
    putInState(approved);

    const button = document.createElement('button');
    button.dataset.action = 'post:mark-published';
    button.dataset.id = String(draft.id);
    document.body.append(button);
    button.click();

    await vi.waitFor(() => {
      expect($('#modal-mark-published').classList.contains('open')).toBe(true);
    });
    const confirmBtn = $<HTMLButtonElement>('#mark-published-confirm');
    expect(confirmBtn.disabled).toBe(true);
    await vi.waitFor(
      () => {
        expect(confirmBtn.disabled).toBe(false);
      },
      { timeout: 2000 },
    );

    $<HTMLInputElement>('#mark-published-url').value = 'https://facebook.com/post/123';
    confirmBtn.click();

    await vi.waitFor(() => {
      expect($('#modal-mark-published').classList.contains('open')).toBe(false);
    });
    const updated = getState().posts.find(p => p.id === draft.id);
    expect(updated).toMatchObject({
      status: 'published',
      externalUrl: 'https://facebook.com/post/123',
    });

    const toast = await vi.waitFor(() => {
      const found = document.querySelectorAll('.toast-success');
      const last = found[found.length - 1];
      if (!last) throw new Error('sin aviso');
      return last;
    });
    expect(toast.querySelector('.toast-undo')).not.toBeNull();
    button.remove();
  });
});

describe('descargar el paquete de publicación', () => {
  it('genera un enlace de descarga sin lanzar errores', async () => {
    const draft = await repos.posts.create({
      listingId: null,
      platformId: 'facebook',
      title: 'Con paquete',
      scheduledAt: new Date('2026-12-01T10:00:00Z').toISOString(),
    });
    await repos.posts.submit(draft.id);
    const approved = await repos.posts.approve(draft.id);
    putInState(approved);

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const button = document.createElement('button');
    button.dataset.action = 'post:download-package';
    button.dataset.id = String(draft.id);
    document.body.append(button);
    button.click();

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    button.remove();
  });
});
