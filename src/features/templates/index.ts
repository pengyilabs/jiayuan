import { registerActions, registerChangeActions } from '../../app/actions';
import { getState, store } from '../../app/state';
import { openCreateWithTemplate } from '../posts';
import { closeModal } from '../../ui/modal';
import { previewTemplate, renderTemplatePreview } from './template-preview';
import { renderTemplates, syncTemplateFilters } from './templates-view';

export function initTemplates(): void {
  registerActions({
    'template:preview': el => {
      previewTemplate(Number(el.dataset.id));
    },
    'template:use': el => {
      const id = el.dataset.id ? Number(el.dataset.id) : getState().previewTemplateId;
      if (id === null) return;
      closeModal('modal-template-preview');
      openCreateWithTemplate(id);
    },
    'template:filter-platform': el => {
      syncTemplateFilters({ platform: el.dataset.platform ?? 'all' });
    },
  });
  registerChangeActions({
    'template:refresh-preview': () => {
      renderTemplatePreview();
    },
    'template:filter-lang': el => {
      syncTemplateFilters({ lang: (el as HTMLSelectElement).value });
    },
    'template:filter-scene': el => {
      syncTemplateFilters({ scene: (el as HTMLSelectElement).value });
    },
  });

  store.watch(s => s.lang, renderTemplates);
  store.watch(s => s.templates, renderTemplates);
  store.watch(s => s.listings, renderTemplates);
  renderTemplates();
}
