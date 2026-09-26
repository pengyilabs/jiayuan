/** Renderizado del formulario de post: opciones de selects, filas por plataforma y contador. */
import { getState } from '../../app/state';
import { getById, qsa } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { CONTENT_LIMIT } from '../../data/content-limits';
import type { MediaFile, MediaIssue } from '../../data/media-validation';
import { t } from '../../i18n';
import { listingTitle } from '../listings/listing-format';
import { findPlatform, platformDisplayName, postTypeName } from '../platforms/platform-format';
import type { PlatformId, PostLang } from '../../types/models';

export interface RowState {
  platformId: PlatformId;
  postTypeId: string | null;
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
  files: [],
  previewUrls: [],
  existingImages: [],
});

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

export function renderTemplateOptions(selectedId: number | null): void {
  const select = getById<HTMLSelectElement>('post-template');
  if (!select) return;
  const { templates } = getState();
  setHtml(
    select,
    html`<option value="" data-i18n="form_no_template">${t('form_no_template')}</option>
      ${templates.map(
        tpl =>
          html`<option value="${tpl.id}" ${tpl.id === selectedId ? 'selected' : ''}>
            ${t(tpl.nameKey, tpl.nameKey)}
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

export function renderPlatformRows(rows: readonly RowState[]): void {
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
        </div>`;
      }),
    ),
  );
}

export function renderCharCount(
  text: string,
  lang: PostLang,
  platformIds: readonly PlatformId[],
): void {
  const box = getById('post-char-count');
  if (!box) return;
  if (platformIds.length === 0) {
    box.textContent = '';
    return;
  }
  const length = [...text].length;
  const parts = platformIds.map(id => {
    const limit = CONTENT_LIMIT[id];
    return `${id}: ${String(length)}/${String(limit)}`;
  });
  box.textContent = parts.join(' · ');
  box.style.color = platformIds.some(id => [...text].length > CONTENT_LIMIT[id])
    ? 'var(--danger)'
    : 'var(--muted)';
  void lang; // reservado para límites que en el futuro dependan del idioma del contenido
}

/** Botón "elegir archivo" de una fila: abre su `<input type="file">` oculto. */
export function openFilePicker(platformId: PlatformId): void {
  qsa<HTMLInputElement>(`#post-file-${CSS.escape(platformId)}`).forEach(input => {
    input.click();
  });
}
