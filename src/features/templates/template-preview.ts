/** Modal de vista previa de un template con datos de un listing real. */
import { getState, setState } from '../../app/state';
import { mustGetById } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import { dict, localize } from '../../i18n';
import { openModal } from '../../ui/modal';
import { formatPrice } from '../../data/format';
import { renderTemplateDesign, templateOutputSize } from './template-render';

export function previewTemplate(id: number): void {
  const tpl = getState().templates.find(x => x.id === id);
  if (!tpl) return;
  setState({ previewTemplateId: id });
  const labels = dict();
  mustGetById('tpl-preview-title').textContent = labels[tpl.nameKey] || tpl.nameKey;
  const sel = mustGetById('tpl-listing-select');
  setHtml(
    sel,
    joinHtml(
      getState().listings.map(l => {
        const name = localize(l.title, getState().lang);
        return html`<option value="${l.id}">${name} — ${formatPrice(l.price)}</option>`;
      }),
    ),
  );
  renderTemplatePreview();
  const size = templateOutputSize(tpl);
  setHtml(
    mustGetById('tpl-preview-meta'),
    html` <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">
        ${joinHtml(tpl.platformTags.map(p => html`<span class="badge badge-neutral">${p}</span>`))}
        <span class="badge badge-accent">${tpl.langLabel}</span>
        <span class="badge badge-neutral">${tpl.scene}</span>
      </div>
      <p style="font-size:var(--text-sm);color:var(--muted)">${size.width}×${size.height}px</p>`,
  );
  openModal('modal-template-preview');
}

export function renderTemplatePreview(): void {
  const { previewTemplateId, templates } = getState();
  const tpl = templates.find(x => x.id === previewTemplateId);
  if (!tpl) return;
  const lid = Number(mustGetById<HTMLSelectElement>('tpl-listing-select').value);
  const l = getState().listings.find(x => x.id === lid);
  if (!l) return;

  const size = templateOutputSize(tpl);
  const container = mustGetById('tpl-preview-design');
  setHtml(container, renderTemplateDesign(tpl, l, getState().lang));
  const preview = container.querySelector<HTMLElement>('.tpl-preview');
  if (preview) preview.style.aspectRatio = `${String(size.width)} / ${String(size.height)}`;
}
