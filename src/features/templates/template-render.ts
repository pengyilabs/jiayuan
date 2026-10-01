/**
 * Renderizado puro de los 8 layouts de template con los datos de un listing real, y la
 * relación de aspecto de salida (F5). No toca el DOM ni el estado: lo usan tanto el modal de
 * vista previa (galería de templates) como la vista previa en vivo del formulario de posts.
 */
import { html, joinHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { formatArea, formatPrice } from '../../data/format';
import { localize } from '../../i18n';
import type { Amenity, Lang, Listing, PlatformId, Template } from '../../types/models';

export interface OutputSize {
  width: number;
  height: number;
}

const FALLBACK_SIZE: OutputSize = { width: 1080, height: 1440 }; // 3:4, el valor por defecto histórico

/**
 * Dimensiones de salida del template: las de la variante para `platformId`+`postTypeId` si
 * existe y coincide; si no, las de su primera variante; si no tiene ninguna, 3:4.
 */
export function templateOutputSize(
  tpl: Template,
  platformId?: PlatformId,
  postTypeId?: string | null,
): OutputSize {
  if (platformId && postTypeId) {
    const match = tpl.variants.find(
      v => v.platformId === platformId && v.postTypeId === postTypeId,
    );
    if (match) return { width: match.width, height: match.height };
  }
  const [first] = tpl.variants;
  return first ? { width: first.width, height: first.height } : FALLBACK_SIZE;
}

const AMENITY_ICON: Readonly<Record<Amenity, string>> = {
  parking: '🅿️',
  gym: '🏋️',
  pool: '🏊',
  security: '🔒',
  terrace: '🌿',
  storage: '📦',
};

function amenityLabel(a: Amenity, lang: Lang): string {
  const isZh = lang === 'zh';
  const labels: Record<Amenity, string> = {
    parking: isZh ? '车库' : 'Garage',
    gym: isZh ? '健身房' : 'Gym',
    pool: isZh ? '泳池' : 'Pool',
    security: isZh ? '安保' : 'Security',
    terrace: isZh ? '露台' : 'Terrace',
    storage: isZh ? '储物' : 'Storage',
  };
  return labels[a];
}

/**
 * Dibuja el layout del template con los datos de `listing`, en el idioma `lang`.
 * `overrideImages` son los archivos que la persona ya subió para ESTE post (F8.1): si los hay,
 * sustituyen a las fotos del listing, porque la plantilla debe reflejar el contenido real que
 * se va a publicar, no siempre la foto de ejemplo del listing.
 */
export function renderTemplateDesign(
  tpl: Template,
  listing: Listing,
  lang: Lang,
  overrideImages?: readonly string[],
): SafeHtml {
  const isZh = lang === 'zh';
  const name = localize(listing.title, lang);
  const bedsLabel = isZh ? '卧' : lang === 'fr' ? 'ch' : 'bed';
  const bathsLabel = isZh ? '卫' : lang === 'fr' ? 'sdb' : 'bath';
  const sqftLabel = 'sqft';
  const photos = overrideImages && overrideImages.length > 0 ? overrideImages : listing.photos;
  const img = photos[0];
  const amenities = listing.amenities.slice(0, 3);
  const meta = html`${listing.beds}${bedsLabel} ${listing.baths}${bathsLabel} · ${formatArea(listing.areaSqft)} ${sqftLabel}`;

  switch (tpl.layout) {
    case 'hero':
      return html`<div class="tpl-preview tpl-hero" style="background-image:url('${img}')">
        <div class="tpl-hero-overlay">
          <div class="tpl-hero-price">${formatPrice(listing.price)}</div>
          <div class="tpl-hero-title">${name}</div>
          <div class="tpl-hero-meta">${meta}</div>
        </div>
        <div class="tpl-hero-brand">加园地产 HOME DIRECT</div>
      </div>`;

    case 'split':
      return html`<div class="tpl-preview tpl-split">
        <div class="tpl-split-img" style="background-image:url('${img}')"></div>
        <div class="tpl-split-info">
          <div class="tpl-split-badge">${tpl.scene}</div>
          <div class="tpl-split-price">${formatPrice(listing.price)}</div>
          <div class="tpl-split-title">${name}</div>
          <div class="tpl-split-meta">${meta}</div>
          <div class="tpl-split-features">
            ${joinHtml(amenities.map(a => html`<span>${AMENITY_ICON[a]} ${amenityLabel(a, lang)}</span>`))}
          </div>
          <div class="tpl-split-brand">加园地产 HOME DIRECT</div>
        </div>
      </div>`;

    case 'gallery':
      return html`<div class="tpl-preview tpl-gallery">
        <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
        <div class="tpl-img-slot"><img src="${photos[1] || img}" alt="" /></div>
        <div class="tpl-img-slot"><img src="${photos[2] || img}" alt="" /></div>
        <div class="tpl-img-slot"><img src="${photos[3] || img}" alt="" /></div>
        <div class="tpl-price-badge">${formatPrice(listing.price)}</div>
        <div class="tpl-gallery-meta">${meta} · ${name}</div>
      </div>`;

    case 'magazine':
      return html`<div class="tpl-preview tpl-magazine">
        <div class="tpl-mag-hero">
          <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
          <div class="tpl-mag-overlay">
            <div class="tpl-mag-price">${formatPrice(listing.price)}</div>
            <div class="tpl-mag-title">${name}</div>
          </div>
        </div>
        <div class="tpl-mag-side">
          <div class="tpl-mag-label">${isZh ? '精选房源' : 'Featured Listing'}</div>
          <div class="tpl-mag-heading">
            ${isZh ? '现代都市生活的理想之选' : 'The Ideal Choice for Modern Urban Living'}
          </div>
          <div class="tpl-mag-excerpt">
            ${isZh ? '位于黄金地段，精装修交付。' : 'Prime location with premium finishes.'}
          </div>
          <div class="tpl-mag-features">
            ${joinHtml(amenities.map(a => html`<span class="tpl-mag-feat">${AMENITY_ICON[a]} ${amenityLabel(a, lang)}</span>`))}
          </div>
          <div class="tpl-mag-brand">加园地产 HOME DIRECT</div>
        </div>
      </div>`;

    case 'story':
      return html`<div class="tpl-preview tpl-story">
        <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
        <div class="tpl-story-top">
          <div class="tpl-story-brand">加园地产</div>
          <div class="tpl-story-badge">${isZh ? '新上架' : 'NEW'}</div>
        </div>
        <div class="tpl-story-bottom">
          <div class="tpl-story-price">${formatPrice(listing.price)}</div>
          <div class="tpl-story-name">${name}</div>
          <div class="tpl-story-meta">${meta}</div>
          <div class="tpl-story-cta">${isZh ? '了解详情 →' : 'LEARN MORE →'}</div>
        </div>
        <div class="tpl-story-swipe">▲ ${isZh ? '上滑查看' : 'Swipe up'}</div>
      </div>`;

    case 'minimal':
      return html`<div class="tpl-preview tpl-minimal">
        <div class="tpl-min-accent"></div>
        <div class="tpl-min-img"><div class="tpl-img-slot"><img src="${img}" alt="" /></div></div>
        <div class="tpl-min-info">
          <div class="tpl-min-label">${isZh ? '在售' : 'For Sale'}</div>
          <div class="tpl-min-price">${formatPrice(listing.price)}</div>
          <div class="tpl-min-name">${name}</div>
          <div class="tpl-min-meta">${meta}</div>
          <div class="tpl-min-divider"></div>
          <div class="tpl-min-brand">加园地产 HOME DIRECT</div>
        </div>
      </div>`;

    case 'diagonal':
      return html`<div class="tpl-preview tpl-diagonal">
        <div class="tpl-diag-img"><div class="tpl-img-slot"><img src="${img}" alt="" /></div></div>
        <div class="tpl-diag-text">
          <div class="tpl-diag-label">${isZh ? '精选房源' : 'Featured'}</div>
          <div class="tpl-diag-price">${formatPrice(listing.price)}</div>
          <div class="tpl-diag-name">${name}</div>
          <div class="tpl-diag-meta">${meta}</div>
          <div class="tpl-diag-cta">${isZh ? '立即预约' : 'BOOK NOW'}</div>
          <div class="tpl-diag-brand">加园地产</div>
        </div>
      </div>`;

    case 'features':
      return html`<div class="tpl-preview tpl-features">
        <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
        <div class="tpl-feat-badges">
          ${joinHtml(amenities.map(a => html`<div class="tpl-feat-badge"><span class="tpl-feat-icon">${AMENITY_ICON[a]}</span>${amenityLabel(a, lang)}</div>`))}
        </div>
        <div class="tpl-feat-bottom">
          <div class="tpl-feat-info">
            <div class="tpl-feat-price">${formatPrice(listing.price)}</div>
            <div class="tpl-feat-name">${name}</div>
          </div>
          <div class="tpl-feat-brand">加园地产</div>
        </div>
      </div>`;
  }
}
