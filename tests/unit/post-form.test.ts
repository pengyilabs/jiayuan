/** Prueba de integración del formulario de posts (F4): crear, editar y reenviar un rechazado. */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState, setState } from '../../src/app/state';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

// jsdom no implementa `URL.createObjectURL` para `File`: se sustituye por una versión mínima
// sin reemplazar el propio constructor `URL` (del que sí depende el resto de la aplicación).
let nextBlobId = 0;
URL.createObjectURL = (): string => `blob:test-${String(nextBlobId++)}`;
URL.revokeObjectURL = (): void => undefined;

// jsdom tampoco carga imágenes de verdad (`onload` nunca se dispara): se sustituye `Image` por
// una versión mínima que "carga" al instante con una relación de aspecto cuadrada (1:1), que es
// uno de los ratios permitidos por el tipo usado en estas pruebas.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1080;
  naturalHeight = 1080;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}
vi.stubGlobal('Image', FakeImage);

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};
const $$ = <T extends HTMLElement = HTMLElement>(selector: string): T[] =>
  Array.from(document.querySelectorAll<T>(selector));

/** Simula elegir `files` en un `<input type="file">` y dispara `change`. */
function chooseFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const imageFile = (name = 'a.jpg'): File =>
  new File([new Uint8Array(10)], name, { type: 'image/jpeg' });

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('liming', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

beforeEach(() => {
  // Cierra cualquier modal que quedara abierto entre pruebas.
  $$('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

describe('formulario de posts', () => {
  it('crea un borrador con una plataforma, con su tipo y una imagen', async () => {
    $('[data-action="post:new"]').click();
    expect($('#modal-post').classList.contains('open')).toBe(true);

    $<HTMLInputElement>('#post-title').value = 'Mi primer borrador';
    $<HTMLInputElement>('#post-title').dispatchEvent(new Event('input', { bubbles: true }));

    const facebookCheck = $$<HTMLInputElement>('#post-platform-checks input[type="checkbox"]').find(
      el => el.dataset.id === 'facebook',
    );
    if (!facebookCheck) throw new Error('sin checkbox de Facebook');
    facebookCheck.click();
    facebookCheck.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect($('[data-od-id="post-row-facebook"]')).toBeTruthy();
    });

    // Sin archivo todavía: el tipo por defecto (imagen única) exige exactamente 1.
    $('#post-save-draft').click();
    await vi.waitFor(() => {
      expect($('#post-row-error-facebook').hidden).toBe(false);
    });

    chooseFiles($<HTMLInputElement>('#post-file-facebook'), [imageFile()]);
    await vi.waitFor(() => {
      expect($$('.post-media-thumb')).toHaveLength(1);
    });

    $<HTMLInputElement>('#post-schedule').value = '2026-12-01T10:00';
    $('#post-save-draft').click();

    await vi.waitFor(() => {
      expect($('#modal-post').classList.contains('open')).toBe(false);
    });
    const toast = await vi.waitFor(() => $$('.toast-success').at(-1));
    if (!toast) throw new Error('sin aviso');
    expect(toast.textContent).toContain('Draft saved');

    const created = getState().posts.find(p => p.title === 'Mi primer borrador');
    expect(created).toMatchObject({ status: 'draft', platformId: 'facebook', authorName: '李明' });
    expect(created?.images).toHaveLength(1);
  });

  it('valida que haya al menos una plataforma y un título', () => {
    $('[data-action="post:new"]').click();
    $('#post-submit').click();
    expect($('#post-error').hidden).toBe(false);
    expect($('#post-error').textContent).toContain('platform');
  });
});

describe('editar y reenviar un post rechazado', () => {
  it('el autor edita el motivo señalado y lo reenvía; queda pendiente sin motivo de rechazo', async () => {
    const draft = await repos.posts.create({
      listingId: null,
      platformId: 'facebook',
      postTypeId: 'text',
      title: 'Se rechazará',
      scheduledAt: new Date('2026-11-01T12:00:00Z').toISOString(),
    });
    await repos.posts.submit(draft.id);

    await auth.signIn('zhuyan', DEMO_PASSWORD);
    const rejected = await repos.posts.reject(draft.id, 'Falta la ubicación exacta');
    await auth.signIn('liming', DEMO_PASSWORD);
    // Estos posts se crearon llamando al repositorio directamente (sin pasar por el
    // formulario), así que hay que reflejarlos en el estado igual que lo haría la interfaz.
    setState(state => {
      const exists = state.posts.some(p => p.id === draft.id);
      const posts = exists
        ? state.posts.map(p => (p.id === draft.id ? rejected : p))
        : [...state.posts, rejected];
      return { posts };
    });

    // Simula el botón "Editar" que renderiza la fila del post (features/posts/post-row.ts);
    // aquí se prueba el manejador de la acción, no dónde vive el botón en la página.
    const editButton = document.createElement('button');
    editButton.dataset.action = 'post:edit';
    editButton.dataset.id = String(draft.id);
    document.body.append(editButton);
    editButton.click();

    await vi.waitFor(() => {
      expect($('#modal-post').classList.contains('open')).toBe(true);
    });
    expect($('#post-rejected-hint').hidden).toBe(false);
    expect($('#post-rejected-hint').textContent).toContain('Falta la ubicación exacta');

    $<HTMLInputElement>('#post-title').value = 'Corregido con ubicación';
    $('#post-submit').click();

    await vi.waitFor(() => {
      expect($('#modal-post').classList.contains('open')).toBe(false);
    });
    const updated = getState().posts.find(p => p.id === draft.id);
    expect(updated).toMatchObject({
      status: 'pending',
      rejectionReason: null,
      title: 'Corregido con ubicación',
    });
  });
});
