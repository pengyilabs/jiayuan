import { registerActions, registerChangeActions } from '../../app/actions';
import { store } from '../../app/state';
import { closeModal, openModal } from '../../ui/modal';
import { previewTemplate, renderTemplatePreview } from './template-preview';
import { renderTemplates } from './templates-view';

export function initTemplates(): void {
  registerActions({
    'template:preview': el => {
      previewTemplate(Number(el.dataset.id));
    },
    'template:use': () => {
      closeModal('modal-template-preview');
      openModal('modal-post');
    },
  });
  registerChangeActions({
    'template:refresh-preview': () => {
      renderTemplatePreview();
    },
  });

  store.watch(s => s.lang, renderTemplates);
  store.watch(s => s.templates, renderTemplates);
  renderTemplates();
}
