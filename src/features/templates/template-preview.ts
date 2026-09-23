/** Modal de vista previa de un template con datos de un listing real. */
import { getState, setState } from '../../app/state';
import { mustGetById } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { dict, localize } from '../../i18n';
import type { Amenity } from '../../types/models';
import { openModal } from '../../ui/modal';
import { formatArea, formatPrice } from '../../data/format';

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
  setHtml(
    mustGetById('tpl-preview-meta'),
    html` <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">
        ${joinHtml(tpl.platformTags.map(p => html`<span class="badge badge-neutral">${p}</span>`))}
        <span class="badge badge-accent">${tpl.langLabel}</span>
        <span class="badge badge-neutral">${tpl.scene}</span>
      </div>
      <p style="font-size:var(--text-sm);color:var(--muted)">${labels.form_post_hint}</p>`,
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
  const isZh = getState().lang === 'zh';
  const name = localize(l.title, getState().lang);
  const bedsLabel = isZh ? '卧' : getState().lang === 'fr' ? 'ch' : 'bed';
  const bathsLabel = isZh ? '卫' : getState().lang === 'fr' ? 'sdb' : 'bath';
  const sqftLabel = 'sqft';
  const img = l.photos[0];
  const amenityIcons = {
    parking: '🅿️',
    gym: '🏋️',
    pool: '🏊',
    security: '🔒',
    terrace: '🌿',
    storage: '📦',
  };
  const amenityLabels = (a: Amenity): string =>
    ({
      parking: isZh ? '车库' : 'Garage',
      gym: isZh ? '健身房' : 'Gym',
      pool: isZh ? '泳池' : 'Pool',
      security: isZh ? '安保' : 'Security',
      terrace: isZh ? '露台' : 'Terrace',
      storage: isZh ? '储物' : 'Storage',
    })[a];
  let design: SafeHtml = html``;
  if (tpl.layout === 'hero') {
    design = html`<div class="tpl-preview tpl-hero" style="background-image:url('${img}')">
      <div class="tpl-hero-overlay">
        <div class="tpl-hero-price">${formatPrice(l.price)}</div>
        <div class="tpl-hero-title">${name}</div>
        <div class="tpl-hero-meta">
          ${l.beds}${bedsLabel} ${l.baths}${bathsLabel} · ${formatArea(l.areaSqft)} ${sqftLabel}
        </div>
      </div>
      <div class="tpl-hero-brand">加园地产 HOME DIRECT</div>
    </div>`;
  } else if (tpl.layout === 'split') {
    design = html`<div class="tpl-preview tpl-split">
      <div class="tpl-split-img" style="background-image:url('${img}')"></div>
      <div class="tpl-split-info">
        <div class="tpl-split-badge">${tpl.scene}</div>
        <div class="tpl-split-price">${formatPrice(l.price)}</div>
        <div class="tpl-split-title">${name}</div>
        <div class="tpl-split-meta">
          ${l.beds}${bedsLabel} ${l.baths}${bathsLabel} · ${formatArea(l.areaSqft)} ${sqftLabel}
        </div>
        <div class="tpl-split-features">
          ${joinHtml(l.amenities.slice(0, 3).map(a => html`<span>${amenityIcons[a] || ''} ${amenityLabels(a)}</span>`))}
        </div>
        <div class="tpl-split-brand">加园地产 HOME DIRECT</div>
      </div>
    </div>`;
  } else if (tpl.layout === 'gallery') {
    design = html`<div class="tpl-preview tpl-gallery">
      <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
      <div class="tpl-img-slot"><img src="${l.photos[1] || img}" alt="" /></div>
      <div class="tpl-img-slot"><img src="${l.photos[2] || img}" alt="" /></div>
      <div class="tpl-img-slot"><img src="${l.photos[3] || img}" alt="" /></div>
      <div class="tpl-price-badge">${formatPrice(l.price)}</div>
      <div class="tpl-gallery-meta">
        ${l.beds}${bedsLabel} ${l.baths}${bathsLabel} · ${formatArea(l.areaSqft)} ${sqftLabel} · ${name}
      </div>
    </div>`;
  } else if (tpl.layout === 'magazine') {
    design = html`<div class="tpl-preview tpl-magazine">
      <div class="tpl-mag-hero">
        <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
        <div class="tpl-mag-overlay">
          <div class="tpl-mag-price">${formatPrice(l.price)}</div>
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
          ${joinHtml(l.amenities.slice(0, 3).map(a => html`<span class="tpl-mag-feat">${amenityIcons[a] || ''} ${amenityLabels(a)}</span>`))}
        </div>
        <div class="tpl-mag-brand">加园地产 HOME DIRECT</div>
      </div>
    </div>`;
  } else if (tpl.layout === 'story') {
    design = html`<div class="tpl-preview tpl-story">
      <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
      <div class="tpl-story-top">
        <div class="tpl-story-brand">加园地产</div>
        <div class="tpl-story-badge">${isZh ? '新上架' : 'NEW'}</div>
      </div>
      <div class="tpl-story-bottom">
        <div class="tpl-story-price">${formatPrice(l.price)}</div>
        <div class="tpl-story-name">${name}</div>
        <div class="tpl-story-meta">
          ${l.beds}${bedsLabel} ${l.baths}${bathsLabel} · ${formatArea(l.areaSqft)} ${sqftLabel}
        </div>
        <div class="tpl-story-cta">${isZh ? '了解详情 →' : 'LEARN MORE →'}</div>
      </div>
      <div class="tpl-story-swipe">▲ ${isZh ? '上滑查看' : 'Swipe up'}</div>
    </div>`;
  } else if (tpl.layout === 'minimal') {
    design = html`<div class="tpl-preview tpl-minimal">
      <div class="tpl-min-accent"></div>
      <div class="tpl-min-img">
        <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
      </div>
      <div class="tpl-min-info">
        <div class="tpl-min-label">${isZh ? '在售' : 'For Sale'}</div>
        <div class="tpl-min-price">${formatPrice(l.price)}</div>
        <div class="tpl-min-name">${name}</div>
        <div class="tpl-min-meta">
          ${l.beds}${bedsLabel} ${l.baths}${bathsLabel} · ${formatArea(l.areaSqft)} ${sqftLabel}
        </div>
        <div class="tpl-min-divider"></div>
        <div class="tpl-min-brand">加园地产 HOME DIRECT</div>
      </div>
    </div>`;
  } else if (tpl.layout === 'diagonal') {
    design = html`<div class="tpl-preview tpl-diagonal">
      <div class="tpl-diag-img">
        <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
      </div>
      <div class="tpl-diag-text">
        <div class="tpl-diag-label">${isZh ? '精选房源' : 'Featured'}</div>
        <div class="tpl-diag-price">${formatPrice(l.price)}</div>
        <div class="tpl-diag-name">${name}</div>
        <div class="tpl-diag-meta">
          ${l.beds}${bedsLabel} ${l.baths}${bathsLabel} · ${formatArea(l.areaSqft)} ${sqftLabel}
        </div>
        <div class="tpl-diag-cta">${isZh ? '立即预约' : 'BOOK NOW'}</div>
        <div class="tpl-diag-brand">加园地产</div>
      </div>
    </div>`;
  } else if (tpl.layout === 'features') {
    design = html`<div class="tpl-preview tpl-features">
      <div class="tpl-img-slot"><img src="${img}" alt="" /></div>
      <div class="tpl-feat-badges">
        ${joinHtml(l.amenities.slice(0, 3).map(a => html`<div class="tpl-feat-badge"><span class="tpl-feat-icon">${amenityIcons[a] || '🏠'}</span>${amenityLabels(a)}</div>`))}
      </div>
      <div class="tpl-feat-bottom">
        <div class="tpl-feat-info">
          <div class="tpl-feat-price">${formatPrice(l.price)}</div>
          <div class="tpl-feat-name">${name}</div>
        </div>
        <div class="tpl-feat-brand">加园地产</div>
      </div>
    </div>`;
  }
  setHtml(mustGetById('tpl-preview-design'), design);
}
