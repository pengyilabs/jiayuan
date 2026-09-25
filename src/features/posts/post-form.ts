/** Renderizado del formulario de post: opciones de selects, filas por plataforma y contador. */
import { getState } from '../../app/state';
import { getById, qsa } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { CONTENT_LIMIT } from '../../data/content-limits';
import type { MediaFile, MediaIssue } from '../../data/media-validation';
import { t } from '../../i18n';
import { renderTemplateDesign, templateOutputSize } from '../templates/template-render';
import { listingTitle } from '../listings/listing-format';
import { findPlatform, platformDisplayName, postTypeName } from '../platforms/platform-format';
import type { PlatformId, PostLang, Template } from '../../types/models';

export interface RowState {
  platformId: PlatformId;
  postTypeId: string | null;
  /** Plantilla elegida para esta fila; solo entre las compatibles con su plataforma+tipo. */
  templateId: number | null;
  /** Archivos elegidos en esta sesión; vacío = mantener lo que ya tenía el post (modo edición). */
  files: MediaFile[];
  /** URL de vista previa de `files`, en el mismo orden (se revocan al sustituirlas/cerrar). */
  previewUrls: string[];
  /** Lo que ya está guardado en el post (solo modo edición); se muestra si `files` está vacío. */
  existingImages: readonly string[];
}

export interface FormState {
  mode: 'create' | 'edit';
  postId: number | null;
  rejectionReason: string | null;
  rows: RowState[];
}

export const emptyRow = (platformId: PlatformId): RowState => ({
  platformId,
  postTypeId: findPlatform(getState().platforms, platformId)?.postTypes[0]?.id ?? null,
  templateId: null,
  files: [],
  previewUrls: [],
  existingImages: [],
});

/** Templates cuyo catálogo de variantes cubre esta combinación exacta de plataforma+tipo. */
export function compatibleTemplates(platformId: PlatformId, postTypeId: string | null): Template[] {
  if (!postTypeId) return [];
  return getState().templates.filter(tpl =>
    tpl.variants.some(v => v.platformId === platformId && v.postTypeId === postTypeId),
  );
}

/** Revoca las URL de vista previa de una fila (evita fugas de memoria). */
export function revokeRowPreviews(row: RowState): void {
  row.previewUrls.forEach(url => {
    URL.revokeObjectURL(url);
  });
  row.previewUrls = [];
}

export function renderListingOptions(selectedId: number | null): void {
  const select = getById<HTMLSelectElement>('post-listing');
  if (!select) return;
  const { listings, lang } = getState();
  setHtml(
    select,
    html`<option value="" data-i18n="post_no_listing">${t('post_no_listing')}</option>
      ${listings.map(
        l =>
          html`<option value="${l.id}" ${l.id === selectedId ? 'selected' : ''}>
            ${listingTitle(l, lang)}
          </option>`,
      )}`,
  );
}

export function renderPlatformChecks(checked: ReadonlySet<PlatformId>): void {
  const container = getById('post-platform-checks');
  if (!container) return;
  const { platforms, lang } = getState();
  setHtml(
    container,
    joinHtml(
      platforms.map(
        p =>
          html`<label class="post-platform-check">
            <input
              type="checkbox"
              data-change="post:toggle-platform"
              data-id="${p.id}"
              ${checked.has(p.id) ? 'checked' : ''}
            />
            ${platformDisplayName(p, lang)}
          </label>`,
      ),
    ),
  );
}

function mediaIssueMessage(issue: MediaIssue): string {
  const message = t(`err_media_${issue.code}`);
  return issue.fileName ? message.replace('{file}', issue.fileName) : message;
}

export function renderMediaIssues(platformId: PlatformId, issues: readonly MediaIssue[]): void {
  const box = getById(`post-row-error-${platformId}`);
  if (!box) return;
  box.hidden = issues.length === 0;
  setHtml(box, joinHtml(issues.map(mediaIssueMessage), '; '));
}

function previewThumb(src: string, platformId: PlatformId, index: number): SafeHtml {
  return html`<div class="post-media-thumb">
    <img src="${src}" alt="" />
    <button
      type="button"
      class="post-media-remove"
      data-action="post:remove-file"
      data-id="${platformId}"
      data-index="${index}"
      aria-label="${t('post_remove_file')}"
    >
      &times;
    </button>
  </div>`;
}

function rowMediaPreview(row: RowState): SafeHtml {
  const sources = row.files.length > 0 ? row.previewUrls : row.existingImages;
  return joinHtml(sources.map((src, i) => previewThumb(src, row.platformId, i)));
}

function templateSelect(row: RowState): SafeHtml {
  const compatible = compatibleTemplates(row.platformId, row.postTypeId);
  return html`<select data-change="post:template" data-id="${row.platformId}">
    <option value="" data-i18n="form_no_template">${t('form_no_template')}</option>
    ${compatible.map(
      tpl =>
        html`<option value="${tpl.id}" ${tpl.id === row.templateId ? 'selected' : ''}>
          ${t(tpl.nameKey, tpl.nameKey)}
        </option>`,
    )}
  </select>`;
}

/** Vista previa en vivo: la plantilla elegida con los datos reales del listing, si hay ambos. */
function rowPreview(row: RowState, listingId: number | null): SafeHtml {
  const tpl = row.templateId ? getState().templates.find(t => t.id === row.templateId) : undefined;
  if (!tpl) return html`<p class="form-hint">${t('tpl_no_preview')}</p>`;

  const listing = listingId ? getState().listings.find(l => l.id === listingId) : undefined;
  if (!listing) return html`<p class="form-hint">${t('tpl_preview_needs_listing')}</p>`;

  return renderTemplateDesign(tpl, listing, getState().lang);
}

/** El `aspect-ratio` de `.tpl-preview` se fija tras insertarlo (no es parte del HTML generado). */
function applyPreviewRatios(rows: readonly RowState[]): void {
  for (const row of rows) {
    if (!row.templateId) continue;
    const tpl = getState().templates.find(t => t.id === row.templateId);
    const el = document.querySelector<HTMLElement>(
      `#post-preview-wrap-${CSS.escape(row.platformId)} .tpl-preview`,
    );
    if (!tpl || !el) continue;
    const size = templateOutputSize(tpl, row.platformId, row.postTypeId ?? undefined);
    el.style.aspectRatio = `${String(size.width)} / ${String(size.height)}`;
  }
}

export function renderPlatformRows(rows: readonly RowState[], listingId: number | null): void {
  const container = getById('post-platform-rows');
  if (!container) return;
  const { platforms, lang } = getState();

  setHtml(
    container,
    joinHtml(
      rows.map(row => {
        const platform = findPlatform(platforms, row.platformId);
        const acceptedTypes = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';
        return html`<div class="post-platform-row" data-od-id="post-row-${row.platformId}">
          <div class="post-platform-row-header">
            <strong>${platform ? platformDisplayName(platform, lang) : row.platformId}</strong>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="post_platform_type">${t('post_platform_type')}</label>
              <select data-change="post:type" data-id="${row.platformId}">
                ${(platform?.postTypes ?? []).map(
                  pt =>
                    html`<option value="${pt.id}" ${pt.id === row.postTypeId ? 'selected' : ''}>
                      ${postTypeName(pt, lang)} (${pt.ratio})
                    </option>`,
                )}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="post_platform_media">${t('post_platform_media')}</label>
              <div class="post-media-drop" data-action="post:pick-file" data-id="${row.platformId}">
                <div style="font-size:var(--text-sm)" data-i18n="form_media_hint">
                  ${t('form_media_hint')}
                </div>
                <div style="font-size:var(--text-xs);margin-top:4px" data-i18n="form_media_formats">
                  ${t('form_media_formats')}
                </div>
              </div>
              <input
                type="file"
                id="post-file-${row.platformId}"
                data-change="post:file-change"
                data-id="${row.platformId}"
                accept="${acceptedTypes}"
                multiple
                hidden
              />
              <div class="post-media-previews">${rowMediaPreview(row)}</div>
              <div id="post-row-error-${row.platformId}" class="form-hint" style="color:var(--danger)" hidden></div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="form_select_template">${t('form_select_template')}</label>
              ${templateSelect(row)}
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="tpl_preview">${t('tpl_preview')}</label>
              <div class="post-tpl-preview" id="post-preview-wrap-${row.platformId}">
                ${rowPreview(row, listingId)}
              </div>
              ${
                row.templateId
                  ? html`<button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style="margin-top:var(--space-2)"
                    data-action="post:export-png"
                    data-id="${row.platformId}"
                  >
                    ${t('action_export_png')}
                  </button>`
                  : ''
              }
            </div>
          </div>
        </div>`;
      }),
    ),
  );
  applyPreviewRatios(rows);
}

export function renderCharCount(text: string, lang: PostLang, rows: readonly RowState[]): void {
  const box = getById('post-char-count');
  if (!box) return;
  if (rows.length === 0) {
    box.textContent = '';
    return;
  }
  const length = [...text].length;
  const limitFor = (row: RowState): number => {
    const type = findPlatform(getState().platforms, row.platformId)?.postTypes.find(
      pt => pt.id === row.postTypeId,
    );
    return type?.maxChars ?? CONTENT_LIMIT[row.platformId];
  };
  const parts = rows.map(row => `${row.platformId}: ${String(length)}/${String(limitFor(row))}`);
  box.textContent = parts.join(' · ');
  box.style.color = rows.some(row => length > limitFor(row)) ? 'var(--danger)' : 'var(--muted)';
  void lang; // reservado para límites que en el futuro dependan del idioma del contenido
}

/** Botón "elegir archivo" de una fila: abre su `<input type="file">` oculto. */
export function openFilePicker(platformId: PlatformId): void {
  qsa<HTMLInputElement>(`#post-file-${CSS.escape(platformId)}`).forEach(input => {
    input.click();
  });
}
