/** Prueba de integración: arranca la aplicación completa en jsdom. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { getState, setState } from '../../src/app/state';
import { DEMO_PASSWORD } from '../../src/data/seed/users';
import { postsSeed } from '../../src/data/seed/posts';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};
const $$ = (selector: string): HTMLElement[] => Array.from(document.querySelectorAll(selector));

beforeAll(async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  document.body.innerHTML = '<div id="root"></div>';
  const { bootstrap } = await import('../../src/app/bootstrap');
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' }); // el idioma inicial es el del perfil
  await bootstrap($('#root'));
});

describe('arranque', () => {
  it('monta las 5 páginas y activa Home', () => {
    expect($$('.page')).toHaveLength(5);
    expect($('#page-dashboard').classList.contains('active')).toBe(true);
    expect(document.documentElement.lang).toBe('en');
  });

  it('renderiza feed, listings, templates y aprobaciones desde los datos', () => {
    expect($$('.feed-card')).toHaveLength(postsSeed.length);
    expect($$('.listings-table tbody tr')).toHaveLength(6);
    expect($$('.template-card')).toHaveLength(12);
    expect($$('.approval-card')).toHaveLength(5);
    expect($('#approval-badge').textContent).toBe('5');
  });
});

describe('interacción', () => {
  it('el filtro por plataforma reduce el feed', () => {
    $('.feed-filter[data-platform="facebook"]').click();
    const expected = postsSeed.filter(p => p.platform_id === 'facebook').length;
    expect($$('.feed-card')).toHaveLength(expected);
    expect($('.feed-filter[data-platform="facebook"]').classList.contains('active')).toBe(true);
    $('.feed-filter[data-platform="all"]').click();
    expect($$('.feed-card')).toHaveLength(postsSeed.length);
  });

  it('la vista de lista funciona (fallaba en la versión original)', () => {
    $('.feed-view-toggle .view-toggle-btn[data-view="list"]').click();
    expect($$('.feed-list-post')).toHaveLength(postsSeed.length);
    expect($('#social-feed').style.display).toBe('none');
    $('.feed-view-toggle .view-toggle-btn[data-view="grid"]').click();
    expect($('#feed-list-view').style.display).toBe('none');
  });

  it('aprobar exige confirmación reforzada y ofrece deshacer', async () => {
    const approveBtn = $<HTMLButtonElement>('.approval-actions .btn-primary');
    const postId = Number(approveBtn.dataset.id);
    approveBtn.click();

    const confirmBtn = await vi.waitFor(() =>
      $<HTMLButtonElement>('.dialog-overlay.open [data-dialog="confirm"]'),
    );
    expect(confirmBtn.disabled).toBe(true); // acción permanente: armado, no clicable de inmediato
    await vi.waitFor(
      () => {
        expect(confirmBtn.disabled).toBe(false);
      },
      { timeout: 2000 },
    );
    confirmBtn.click();

    await vi.waitFor(() => {
      expect($$('.approval-card')).toHaveLength(4);
    });
    expect($('#approval-badge').textContent).toBe('4');
    expect(getState().posts.find(p => p.id === postId)?.status).toBe('approved');

    const toast = await vi.waitFor(() => $('.toast-success'));
    expect(toast.textContent).toContain('Approved');
    expect(toast.querySelector('.toast-undo')).not.toBeNull();
  });

  it('rechazar exige motivo, refuerza la confirmación y el Deshacer lo revierte', async () => {
    const rejectBtn = $<HTMLButtonElement>('.approval-actions .btn-danger');
    const postId = Number(rejectBtn.dataset.id);
    rejectBtn.click();

    expect($('#modal-reject').classList.contains('open')).toBe(true);
    const confirmBtn = $<HTMLButtonElement>('#reject-confirm');
    expect(confirmBtn.disabled).toBe(true);
    await vi.waitFor(
      () => {
        expect(confirmBtn.disabled).toBe(false);
      },
      { timeout: 2000 },
    );

    confirmBtn.click(); // sin motivo todavía
    await vi.waitFor(() => {
      expect($('#reject-error').hidden).toBe(false);
    });
    expect($('#modal-reject').classList.contains('open')).toBe(true);

    $<HTMLTextAreaElement>('#reject-reason').value = 'No cumple la política de fotos';
    confirmBtn.click();

    await vi.waitFor(() => {
      expect($('#modal-reject').classList.contains('open')).toBe(false);
    });
    expect(getState().posts.find(p => p.id === postId)?.status).toBe('rejected');

    const toast = await vi.waitFor(() => {
      const toasts = $$('.toast-success');
      const last = toasts.at(-1);
      if (!last) throw new Error('sin aviso de éxito');
      return last;
    });
    expect(toast.textContent).toContain('Rejected');
    toast.querySelector<HTMLButtonElement>('.toast-undo')?.click();

    await vi.waitFor(() => {
      expect(getState().posts.find(p => p.id === postId)?.status).toBe('pending');
    });
    await vi.waitFor(() => {
      expect($$('.toast').some(el => (el.textContent ?? '').includes('undone'))).toBe(true);
    });
  });

  it('la navegación cambia página, URL y título', () => {
    $('.nav-item[data-page="listings"]').click();
    expect($('#page-listings').classList.contains('active')).toBe(true);
    expect($('#page-dashboard').classList.contains('active')).toBe(false);
    expect(location.pathname).toBe('/listings');
    expect($('#page-title').textContent).toBe('Listings');
    expect($('.dash-header').style.display).toBe('none');
  });

  it('cambiar de idioma traduce textos estáticos y el título de la página actual', () => {
    $('.lang-option[data-lang="zh"]').click();
    expect(document.documentElement.lang).toBe('zh');
    expect($('#page-title').textContent).toBe('房源管理');
    expect($('#lang-current').textContent).toBe('简体');
    $('.lang-option[data-lang="en"]').click();
    expect($('#page-title').textContent).toBe('Listings');
  });

  it('abre el detalle del listing y guarda cambios sin errores (fallaba en el original)', async () => {
    $('.listings-table tbody tr').click();
    expect($('#modal-listing-detail').classList.contains('open')).toBe(true);

    $('#modal-listing-detail [data-action="listing:edit"]').click();
    $<HTMLInputElement>('#edit-price-1').value = '$999,000';
    $('#modal-listing-detail [data-action="listing:save"]').click();

    await vi.waitFor(() => {
      expect(getState().listings.find(l => l.id === 1)?.price).toBe(999000);
    });
    expect($('#modal-listing-detail .detail-info-price').textContent).toBe('$999,000');
    expect($('.listings-table tbody tr .listing-price').textContent).toBe('$999,000');

    $('#modal-listing-detail [data-action="modal:close"]').click();
    expect($('#modal-listing-detail').classList.contains('open')).toBe(false);
  });

  it('cerrar el modal haciendo clic en el fondo', () => {
    $('.listings-table tbody tr').click();
    $('#modal-listing-detail').click();
    expect($('#modal-listing-detail').classList.contains('open')).toBe(false);
  });
});

describe('seguridad', () => {
  it('escapa datos con HTML (sin XSS)', () => {
    const payload = '<img src=x class="pwn"><b>x</b>';
    setState(state => ({
      listings: state.listings.map(l =>
        l.id === 1 ? { ...l, title: { ...l.title, en: payload } } : l,
      ),
    }));
    expect(document.querySelector('.pwn')).toBeNull();
    expect($('.listings-table tbody tr .listing-title').textContent).toBe(payload);
  });
});
