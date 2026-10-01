/**
 * Hoja de creación de post en 3 pasos (F10.1): reproduce el diseño de referencia (listing →
 * plataformas → plantilla) pero con datos y creación reales. Único cambio deliberado frente a
 * la referencia: el formato (single/carousel/video) se elige ANTES que la plantilla, no
 * después — en la app real una plantilla solo es compatible con una combinación concreta de
 * plataforma+tipo (F5), y el tipo depende del formato; sin ese orden no hay forma de filtrar
 * las plantillas correctamente. El resto (textos, tres pasos, hoja inferior) es igual.
 */
import { getState, setState } from '../../app/state';
import { getById, qsa } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { POST_LANG_LABEL } from '../../data/mappers';
import { t } from '../../i18n';
import { errorMessage } from '../../ui/errors';
import { showToast } from '../../ui/toast';
import { renderTemplateDesign } from '../templates/template-render';
import { bedBathLabel, listingTitle } from '../listings/listing-format';
import { findPlatform, platformDisplayName } from '../platforms/platform-format';
import { formatPrice } from '../../data/format';
import { zonedTimeToUtcIso } from '../../core/dates';
import { repos } from '../../app/services';
import type {
  Lang,
  Listing,
  Platform,
  PlatformId,
  Post,
  PostDraft,
  PostType,
  Template,
} from '../../types/models';
import type { MediaFile } from '../../data/media-validation';

type Format = 'single' | 'carousel' | 'video';
const FORMAT_GROUPS: Readonly<Record<Format, readonly string[]>> = {
  single: ['image'],
  carousel: ['carousel'],
  video: ['video', 'short_video'],
};
const LANG_FOR_POST: Readonly<Record<Lang, keyof typeof POST_LANG_LABEL>> = {
  zh: 'zh',
  en: 'en',
  fr: 'fr',
  es: 'en',
};

interface Wizard {
  step: 0 | 1 | 2;
  listingId: number | null | undefined; // undefined = aún sin elegir (paso 1 no completado)
  platforms: PlatformId[];
  format: Format;
  templateId: number | null;
}

let wizard: Wizard | null = null;

function postTypeForFormat(platform: Platform, format: Format): PostType | undefined {
  return platform.postTypes.find(pt => FORMAT_GROUPS[format].includes(pt.group));
}

/** Formatos que sirven las TRES plataformas elegidas a la vez (una sola elección para todas). */
function availableFormats(platformIds: readonly PlatformId[]): Format[] {
  const platforms = platformIds
    .map(id => findPlatform(getState().platforms, id))
    .filter((p): p is Platform => Boolean(p));
  return (['single', 'carousel', 'video'] as const).filter(fmt =>
    platforms.every(p => postTypeForFormat(p, fmt)),
  );
}

function compatibleTemplates(platformIds: readonly PlatformId[], format: Format): Template[] {
  return getState().templates.filter(tpl =>
    platformIds.some(id => {
      const platform = findPlatform(getState().platforms, id);
      const type = platform && postTypeForFormat(platform, format);
      return type && tpl.variants.some(v => v.platformId === id && v.postTypeId === type.id);
    }),
  );
}

export function openCreateSheet(): void {
  wizard = { step: 0, listingId: undefined, platforms: [], format: 'single', templateId: null };
  getById('m-sheet-overlay')?.classList.add('m-open');
  render();
}

export function closeCreateSheet(): void {
  getById('m-sheet-overlay')?.classList.remove('m-open');
  wizard = null;
}

function progressBar(active: number): SafeHtml {
  return html`<div class="m-create-steps">
    ${[0, 1, 2].map(
      i =>
        html`<div class="m-create-step ${i < active ? 'm-done' : i === active ? 'm-active' : ''}"></div>`,
    )}
  </div>`;
}

// ── Paso 1: listing ──────────────────────────────────────────────────────────
function renderStepListing(w: Wizard): void {
  const body = getById('m-sheet-body');
  const footer = getById('m-sheet-footer');
  if (!body || !footer) return;
  const listings = getState().listings;
  const lang = getState().lang;
  setHtml(
    body,
    html`${progressBar(0)}
      <div class="m-step-label">${t('m_wizard_step_of', 'Step 1 of 3')}</div>
      <div class="m-step-title">${t('m_wizard_step1', 'Select a listing to promote')}</div>
      ${joinHtml(
        listings.map(
          l => html`<button
            type="button"
            class="m-listing-option ${w.listingId === l.id ? 'm-selected' : ''}"
            data-action="mobile-wizard:pick-listing"
            data-id="${l.id}"
          >
            <img class="m-listing-thumb" src="${l.photos[0] ?? ''}" alt="" />
            <div class="m-listing-info">
              <div class="m-listing-name">${listingTitle(l, lang)}</div>
              <div class="m-listing-detail">${bedBathLabel(l)} · ${l.propertyType}</div>
              <div class="m-listing-price">${formatPrice(l.price)}</div>
            </div>
          </button>`,
        ),
      )}
      <button
        type="button"
        class="m-listing-option ${w.listingId === null ? 'm-selected' : ''}"
        data-action="mobile-wizard:pick-listing"
        data-id="none"
      >
        <div
          class="m-listing-thumb"
          style="background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:20px"
        >
          📝
        </div>
        <div class="m-listing-info">
          <div class="m-listing-name">${t('m_wizard_no_listing', 'No listing')}</div>
          <div class="m-listing-detail">${t('m_wizard_no_listing_desc', 'Brand content / market analysis')}</div>
        </div>
      </button>`,
  );
  setHtml(
    footer,
    html`<button class="m-btn m-btn-ghost" data-action="mobile-wizard:cancel">${t('btn_cancel')}</button>
      <button
        class="m-btn m-btn-primary"
        data-action="mobile-wizard:next"
        ${w.listingId === undefined ? 'disabled' : ''}
      >
        ${t('m_wizard_next', 'Next')}
      </button>`,
  );
}

// ── Paso 2: plataformas ──────────────────────────────────────────────────────
function renderStepPlatforms(w: Wizard): void {
  const body = getById('m-sheet-body');
  const footer = getById('m-sheet-footer');
  if (!body || !footer) return;
  const { platforms, lang } = getState();
  setHtml(
    body,
    html`${progressBar(1)}
      <div class="m-step-label">${t('m_wizard_step_of2', 'Step 2 of 3')}</div>
      <div class="m-step-title">
        ${t('m_wizard_step2', 'Post to which platforms?')}${
          w.platforms.length ? html` (${w.platforms.length})` : ''
        }
      </div>
      <div class="m-platform-grid">
        ${joinHtml(
          platforms.map(
            p => html`<button
              type="button"
              class="m-platform-option ${w.platforms.includes(p.id) ? 'm-selected' : ''}"
              data-action="mobile-wizard:toggle-platform"
              data-id="${p.id}"
            >
              <div class="m-platform-icon" style="background:${p.color}">
                ${platformDisplayName(p, lang).slice(0, 1).toUpperCase()}
              </div>
              <div class="m-platform-name">${platformDisplayName(p, lang)}</div>
            </button>`,
          ),
        )}
      </div>`,
  );
  setHtml(
    footer,
    html`<button class="m-btn m-btn-ghost" data-action="mobile-wizard:back">${t('m_wizard_prev', 'Back')}</button>
      <button
        class="m-btn m-btn-primary"
        data-action="mobile-wizard:next"
        ${w.platforms.length === 0 ? 'disabled' : ''}
      >
        ${t('m_wizard_next', 'Next')}
      </button>`,
  );
}

// ── Paso 3: formato + plantilla ──────────────────────────────────────────────
const FORMAT_META: Readonly<Record<Format, { icon: string; nameKey: string; descKey: string }>> = {
  carousel: {
    icon: '🖼',
    nameKey: 'm_wizard_format_carousel',
    descKey: 'm_wizard_format_carousel_desc',
  },
  single: { icon: '🖼️', nameKey: 'm_wizard_format_single', descKey: 'm_wizard_format_single_desc' },
  video: { icon: '🎬', nameKey: 'm_wizard_format_video', descKey: 'm_wizard_format_video_desc' },
};

function renderStepTemplate(w: Wizard): void {
  const formats = availableFormats(w.platforms);
  if (!formats.includes(w.format)) w.format = formats[0] ?? 'single';
  const listing = w.listingId ? getState().listings.find(l => l.id === w.listingId) : undefined;
  const templates = listing ? compatibleTemplates(w.platforms, w.format) : [];

  const formatPicker = html`<div class="m-format-grid">
    ${joinHtml(
      formats.map(
        fmt => html`<button
          type="button"
          class="m-format-option ${w.format === fmt ? 'm-selected' : ''}"
          data-action="mobile-wizard:pick-format"
          data-format="${fmt}"
        >
          <div class="m-format-icon">${FORMAT_META[fmt].icon}</div>
          <div class="m-format-name">${t(FORMAT_META[fmt].nameKey)}</div>
          <div class="m-format-desc">${t(FORMAT_META[fmt].descKey)}</div>
        </button>`,
      ),
    )}
  </div>`;

  const templateGrid = !listing
    ? html`<p class="m-step-label" style="text-transform:none;letter-spacing:normal">
        ${t('m_wizard_needs_listing', 'Templates need a listing — this will post without one.')}
      </p>`
    : html`<div class="m-template-grid">
        ${joinHtml(
          templates.map(tpl => {
            const size = { width: 4, height: 5 }; // proporción de la tarjeta (4:5, fija en la referencia)
            return html`<button
              type="button"
              class="m-tpl-card ${w.templateId === tpl.id ? 'm-selected' : ''}"
              data-action="mobile-wizard:pick-template"
              data-id="${tpl.id}"
            >
              <div class="m-tpl-preview" style="aspect-ratio:${size.width}/${size.height}">
                ${renderTemplateDesign(tpl, listing, getState().lang)}
              </div>
              <div class="m-tpl-label">
                <div class="m-tpl-label-name">${t(tpl.nameKey, tpl.nameKey)}</div>
                <div class="m-tpl-label-desc">${tpl.scene} · ${tpl.langLabel}</div>
              </div>
            </button>`;
          }),
        )}
        <button
          type="button"
          class="m-tpl-card m-blank ${w.templateId === null ? 'm-selected' : ''}"
          data-action="mobile-wizard:pick-template"
          data-id="none"
        >
          <div class="m-tpl-preview" style="aspect-ratio:16/9">
            <div class="m-tpl-blank">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>${t('m_wizard_no_template', 'No template')}</span>
            </div>
          </div>
          <div class="m-tpl-label">
            <div class="m-tpl-label-name">${t('m_wizard_blank', 'Blank')}</div>
            <div class="m-tpl-label-desc">${t('m_wizard_blank_desc', 'Start from scratch')}</div>
          </div>
        </button>
      </div>`;

  const body = getById('m-sheet-body');
  const footer = getById('m-sheet-footer');
  if (!body || !footer) return;
  setHtml(
    body,
    html`${progressBar(2)}
      <div class="m-step-label">${t('m_wizard_step_of3', 'Step 3 of 3')}</div>
      <div class="m-step-title">${t('m_wizard_step3', 'Choose a template')}</div>
      ${formatPicker}${templateGrid}`,
  );
  setHtml(
    footer,
    html`<button class="m-btn m-btn-ghost" data-action="mobile-wizard:back">${t('m_wizard_prev', 'Back')}</button>
      <button class="m-btn m-btn-primary" data-action="mobile-wizard:confirm">
        ${t('m_wizard_confirm', 'Post')}
      </button>`,
  );
}

function render(): void {
  if (!wizard) return;
  const title = getById('m-sheet-title');
  const stepTitles = [
    t('m_wizard_step1', 'Select a listing to promote'),
    t('m_wizard_step2', 'Post to which platforms?'),
    t('m_wizard_step3', 'Choose a template'),
  ];
  if (title) title.textContent = stepTitles[wizard.step] ?? '';
  if (wizard.step === 0) renderStepListing(wizard);
  else if (wizard.step === 1) renderStepPlatforms(wizard);
  else renderStepTemplate(wizard);
}

async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

/** Usa las fotos reales del listing (o su video, si tiene) — la referencia hace lo mismo, sin
 * pedir que la persona suba nada; aquí además pasan de verdad por la subida real (`setMedia`). */
async function buildMediaFiles(listing: Listing, format: Format): Promise<MediaFile[]> {
  if (format === 'video') {
    if (!listing.video) return [];
    return [{ file: await urlToFile(listing.video, 'video.mp4'), kind: 'video' }];
  }
  const urls = format === 'carousel' ? listing.photos.slice(0, 5) : listing.photos.slice(0, 1);
  return Promise.all(
    urls.map(async (url, i) => ({
      file: await urlToFile(url, `photo-${String(i)}.jpg`),
      kind: 'image' as const,
    })),
  );
}

async function confirmCreate(): Promise<void> {
  if (!wizard) return;
  const w = wizard;
  const confirmBtn = document.querySelector<HTMLButtonElement>(
    '#m-sheet-footer [data-action="mobile-wizard:confirm"]',
  );
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const listing = w.listingId ? getState().listings.find(l => l.id === w.listingId) : undefined;
    const lang = POST_LANG_LABEL[LANG_FOR_POST[getState().lang]];
    const title = listing
      ? `${listingTitle(listing, getState().lang)} · ${t('m_wizard_title_suffix', 'Featured Listing')}`
      : t('m_wizard_brand_title', 'HOME DIRECT · Update');
    const description = listing
      ? `${listingTitle(listing, getState().lang)}, ${bedBathLabel(listing)}, ${formatPrice(listing.price)}`
      : t('m_wizard_brand_desc', 'New content coming soon.');
    const scheduledAt = zonedTimeToUtcIso(
      new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      getState().settings.timezone,
    );

    const created: Post[] = [];
    let skipped = 0;
    for (const platformId of w.platforms) {
      const platform = findPlatform(getState().platforms, platformId);
      const postType = platform && postTypeForFormat(platform, w.format);
      if (!platform || !postType) {
        skipped += 1;
        continue;
      }
      const compatTemplateId =
        w.templateId !== null &&
        getState()
          .templates.find(tp => tp.id === w.templateId)
          ?.variants.some(v => v.platformId === platformId && v.postTypeId === postType.id)
          ? w.templateId
          : null;

      const draft: PostDraft = {
        listingId: w.listingId ?? null,
        platformId,
        postTypeId: postType.id,
        templateId: compatTemplateId,
        media: w.format,
        lang,
        title,
        description,
        hashtags: '',
        scheduledAt,
      };
      let post = await repos.posts.create(draft);
      if (listing) {
        const files = await buildMediaFiles(listing, w.format);
        if (files.length > 0) post = await repos.posts.setMedia(post.id, files);
      }
      post = await repos.posts.submit(post.id);
      created.push(post);
    }

    setState(state => ({ posts: [...state.posts, ...created] }));
    closeCreateSheet();
    showToast(`${String(created.length)} ${t('m_wizard_posted', 'posts added to pending queue')}`, {
      kind: 'success',
    });
    if (skipped > 0) {
      showToast(t('m_wizard_skipped', 'Some platforms were skipped: format not supported'), {
        kind: 'error',
      });
    }
    getById('m-feed')?.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showToast(errorMessage(error), { kind: 'error' });
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

export function initMobileCreateSheet(): void {
  const actions: Record<string, (el: HTMLElement) => void | Promise<void>> = {
    'mobile-wizard:cancel': () => {
      closeCreateSheet();
    },
    'mobile-wizard:next': () => {
      if (wizard && wizard.step < 2) {
        wizard.step = (wizard.step + 1) as Wizard['step'];
        render();
      }
    },
    'mobile-wizard:back': () => {
      if (wizard && wizard.step > 0) {
        wizard.step = (wizard.step - 1) as Wizard['step'];
        render();
      }
    },
    'mobile-wizard:pick-listing': el => {
      if (!wizard) return;
      wizard.listingId = el.dataset.id === 'none' ? null : Number(el.dataset.id);
      render();
    },
    'mobile-wizard:toggle-platform': el => {
      if (!wizard) return;
      const id = el.dataset.id as PlatformId;
      wizard.platforms = wizard.platforms.includes(id)
        ? wizard.platforms.filter(p => p !== id)
        : [...wizard.platforms, id];
      render();
    },
    'mobile-wizard:pick-format': el => {
      if (!wizard) return;
      wizard.format = el.dataset.format as Format;
      wizard.templateId = null; // el formato cambia qué plantillas son compatibles
      render();
    },
    'mobile-wizard:pick-template': el => {
      if (!wizard) return;
      wizard.templateId = el.dataset.id === 'none' ? null : Number(el.dataset.id);
      render();
    },
    'mobile-wizard:confirm': () => confirmCreate(),
  };

  document.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-action^="mobile-wizard:"]',
    );
    if (!target) return;
    const handler = actions[target.dataset.action ?? ''];
    if (handler) void handler(target);
  });

  getById('m-sheet-close')?.addEventListener('click', closeCreateSheet);
  getById('m-sheet-overlay')?.addEventListener('click', e => {
    if ((e.target as HTMLElement).id === 'm-sheet-overlay') closeCreateSheet();
  });
  qsa('[data-action="mobile-feed:open-create"]').forEach(btn => {
    btn.addEventListener('click', openCreateSheet);
  });
}
