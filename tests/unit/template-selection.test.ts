/** Selección de plantilla filtrada por plataforma+tipo, vista previa en vivo y export PNG (F5). */
import { beforeAll, describe, expect, it, vi } from 'vitest';

const toPngMock = vi.fn<(el: HTMLElement, options?: Record<string, unknown>) => Promise<string>>(
  () => Promise.resolve('data:image/png;base64,fake'),
);
vi.mock('html-to-image', () => ({ toPng: toPngMock }));

import { auth, repos } from '../../src/app/services';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};
const $$ = <T extends HTMLElement = HTMLElement>(selector: string): T[] =>
  Array.from(document.querySelectorAll<T>(selector));

const check = (input: HTMLInputElement): void => {
  input.click();
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('liming', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('plantilla filtrada por plataforma+tipo y vista previa en vivo', () => {
  it('solo ofrece templates con una variante para la plataforma y el tipo elegidos', async () => {
    $('[data-action="post:new"]').click();
    $<HTMLSelectElement>('#post-listing').value = '1';
    $('#post-listing').dispatchEvent(new Event('change', { bubbles: true }));

    const facebookCheck = $$<HTMLInputElement>('#post-platform-checks input').find(
      el => el.dataset.id === 'facebook',
    );
    if (!facebookCheck) throw new Error('sin checkbox de Facebook');
    check(facebookCheck);

    await vi.waitFor(() => {
      expect($('[data-od-id="post-row-facebook"]')).toBeTruthy();
    });

    // El tipo por defecto de Facebook es "single": templates 1 y 2 tienen esa variante.
    const templateSelect = $<HTMLSelectElement>(
      '[data-od-id="post-row-facebook"] select[data-change="post:template"]',
    );
    const values = Array.from(templateSelect.options).map(o => o.value);
    expect(values).toEqual(expect.arrayContaining(['1', '2']));
    // Un template sin variante para facebook/single no debe aparecer (p. ej. el 4, solo wechat_official/article).
    expect(values).not.toContain('4');
  });

  it('muestra un aviso hasta elegir listing y template, y luego la vista previa real', async () => {
    // Antes de elegir template: aviso a esperar un template.
    const wrap = $('#post-preview-wrap-facebook');
    expect(wrap.textContent).toContain('Choose a template');

    const templateSelect = $<HTMLSelectElement>(
      '[data-od-id="post-row-facebook"] select[data-change="post:template"]',
    );
    templateSelect.value = '1';
    templateSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect($('#post-preview-wrap-facebook .tpl-preview')).toBeTruthy();
    });
    const preview = $('#post-preview-wrap-facebook .tpl-preview');
    expect(preview.className).toContain('tpl-hero');
    expect(preview.style.aspectRatio.replace(/\s/g, '')).toBe('1080/1080');
    expect(preview.textContent).toContain('$850,000');
  });

  it('cambiar a un tipo incompatible limpia la plantilla elegida', async () => {
    const typeSelect = $<HTMLSelectElement>(
      '[data-od-id="post-row-facebook"] select[data-change="post:type"]',
    );
    typeSelect.value = 'stories'; // ninguno de los templates 1/2 tiene variante para "stories"... salvo el 9
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      const select = $<HTMLSelectElement>(
        '[data-od-id="post-row-facebook"] select[data-change="post:template"]',
      );
      expect(select.value).toBe('');
    });
  });

  it('exportar a PNG llama a toPng con las dimensiones de la variante y descarga el archivo', async () => {
    const typeSelect = $<HTMLSelectElement>(
      '[data-od-id="post-row-facebook"] select[data-change="post:type"]',
    );
    typeSelect.value = 'single';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const templateSelect = $<HTMLSelectElement>(
      '[data-od-id="post-row-facebook"] select[data-change="post:template"]',
    );
    templateSelect.value = '1';
    templateSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect($('#post-preview-wrap-facebook .tpl-preview')).toBeTruthy();
    });

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    toPngMock.mockClear();
    $('[data-action="post:export-png"][data-id="facebook"]').click();

    await vi.waitFor(() => {
      expect(toPngMock).toHaveBeenCalledOnce();
    });
    const [, options] = toPngMock.mock.calls[0] ?? [];
    expect(options).toMatchObject({ width: 1080, height: 1080 });
    expect(clickSpy).toHaveBeenCalledOnce();
    clickSpy.mockRestore();
  });
});
