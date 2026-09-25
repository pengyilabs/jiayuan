/**
 * Galería de templates: usa el mismo renderizador real que la vista previa en vivo del
 * formulario de posts (F5/F8) en vez de una versión duplicada con datos inventados, y filtra
 * de verdad por plataforma, idioma y escena en vez de ser solo decorativa.
 */
import { getState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import { dict, t } from '../../i18n';
import { renderTemplateDesign } from './template-render';
import type { Template } from '../../types/models';

interface TemplateFilters {
  platform: string;
  lang: string;
  scene: string;
}

let filters: TemplateFilters = { platform: 'all', lang: 'all', scene: 'all' };

/** Normaliza valores libres del catálogo (mezclan chino/inglés) a una clave estable para filtrar. */
const SCENE_KEY: Readonly<Record<string, string>> = {
  出售: 'sale',
  Sale: 'sale',
  出租: 'rent',
  Rent: 'rent',
  Brand: 'brand',
  品牌推广: 'brand',
};
const sceneKey = (scene: string): string => SCENE_KEY[scene] ?? scene.toLowerCase();

const LANG_KEY: Readonly<Record<string, string>> = {
  中文: 'zh',
  English: 'en',
  Français: 'fr',
  双语: 'bilingual',
};
const langKey = (label: string): string => LANG_KEY[label] ?? label.toLowerCase();

function matchesFilters(tpl: Template): boolean {
  if (filters.platform !== 'all' && !tpl.platformTags.some(p => p.includes(filters.platform))) {
    return false;
  }
  if (filters.lang !== 'all' && langKey(tpl.langLabel) !== filters.lang) return false;
  if (filters.scene !== 'all' && sceneKey(tpl.scene) !== filters.scene) return false;
  return true;
}

/** Actualiza uno o varios filtros a la vez y vuelve a pintar la galería. */
export function syncTemplateFilters(patch: Partial<TemplateFilters>): void {
  filters = { ...filters, ...patch };
  renderTemplates();
}

function syncFilterControls(): void {
  const grid = getById('template-filters');
  if (!grid) return;
  grid.querySelectorAll<HTMLElement>('[data-action="template:filter-platform"]').forEach(chip => {
    chip.classList.toggle('active', (chip.dataset.platform ?? 'all') === filters.platform);
  });
}

export function renderTemplates(): void {
  const labels = dict();
  const grid = getById('templates-grid');
  if (!grid) return;
  syncFilterControls();

  const { lang, listings } = getState();
  // El listing real (el primero disponible) alimenta la vista previa: mismos datos que se
  // verían en el formulario de posts, no cifras inventadas y fijas en el código.
  const demoListing = listings[0];
  const templates = getState().templates.filter(matchesFilters);

  setHtml(
    grid,
    templates.length === 0
      ? html`<p class="form-hint" style="grid-column:1/-1;padding:var(--space-6)">
          ${t('templates_empty', '没有符合筛选条件的模板。')}
        </p>`
      : joinHtml(
          templates.map(tpl => {
            const name = labels[tpl.nameKey] || tpl.nameKey;
            return html` <div
              class="card template-card"
              data-od-id="template-card-${tpl.id}"
              data-action="template:preview"
              data-id="${tpl.id}"
            >
              ${
                demoListing
                  ? renderTemplateDesign(tpl, demoListing, lang)
                  : html`<div class="tpl-preview"></div>`
              }
              <div class="template-overlay">
                <button class="btn btn-primary btn-sm" data-action="template:use" data-id="${tpl.id}">
                  ${t('btn_use_template', '使用此模板')}
                </button>
              </div>
              <div class="card-body">
                <div class="card-title" style="font-size:var(--text-sm)">${name}</div>
                <div class="template-tags">
                  ${joinHtml(
                    tpl.platformTags.map(p => html`<span class="badge badge-neutral">${p}</span>`),
                  )}
                  <span class="badge badge-accent">${tpl.langLabel}</span>
                  <span class="badge badge-neutral">${tpl.scene}</span>
                </div>
              </div>
            </div>`;
          }),
        ),
  );
}
