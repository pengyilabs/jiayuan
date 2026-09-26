/** Galería de templates con vista previa de ejemplo por layout. */
import { getState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { dict, t } from '../../i18n';

export function renderTemplates(): void {
  const labels = dict();
  const grid = getById('templates-grid');
  if (!grid) return;
  const isZh = getState().lang === 'zh';
  const condoImg = 'images/listings/condo1.jpg';
  const villaImg = 'images/listings/villa1.jpg';
  const loftImg = 'images/listings/loft1.jpg';
  const gardenImg = 'images/listings/garden1.jpg';
  setHtml(
    grid,
    joinHtml(
      getState().templates.map(tpl => {
        const name = labels[tpl.nameKey] || tpl.nameKey;
        let preview: SafeHtml | '' = '';
        if (tpl.layout === 'hero') {
          preview = html`<div
            class="tpl-preview tpl-hero"
            style="background-image:url('${condoImg}')"
          >
            <div class="tpl-hero-overlay">
              <div class="tpl-hero-price">$850,000</div>
              <div class="tpl-hero-title">${isZh ? '市中心豪华公寓' : 'Downtown Luxury Condo'}</div>
              <div class="tpl-hero-meta">
                ${isZh ? '3卧 2卫 · 1,200 sqft' : '3 Bed · 2 Bath · 1,200 sqft'}
              </div>
            </div>
            <div class="tpl-hero-brand">加园地产 HOME DIRECT</div>
          </div>`;
        } else if (tpl.layout === 'split') {
          preview = html`<div class="tpl-preview tpl-split">
            <div class="tpl-split-img" style="background-image:url('${villaImg}')"></div>
            <div class="tpl-split-info">
              <div class="tpl-split-badge">${tpl.scene}</div>
              <div class="tpl-split-price">$1,250,000</div>
              <div class="tpl-split-title">${isZh ? '西山别墅' : 'Westmount Villa'}</div>
              <div class="tpl-split-meta">
                ${isZh ? '4卧 3卫 · 2,800 sqft' : '4 Bed · 3 Bath · 2,800 sqft'}
              </div>
              <div class="tpl-split-features">
                <span>🅿️ ${isZh ? '车库' : 'Garage'}</span
                ><span>🌳 ${isZh ? '花园' : 'Garden'}</span>
              </div>
              <div class="tpl-split-brand">加园地产</div>
            </div>
          </div>`;
        } else if (tpl.layout === 'gallery') {
          preview = html`<div class="tpl-preview tpl-gallery">
            <div class="tpl-img-slot"><img src="${condoImg}" alt="" /></div>
            <div class="tpl-img-slot"><img src="${villaImg}" alt="" /></div>
            <div class="tpl-img-slot"><img src="${loftImg}" alt="" /></div>
            <div class="tpl-img-slot"><img src="${gardenImg}" alt="" /></div>
            <div class="tpl-price-badge">$850,000</div>
            <div class="tpl-gallery-meta">
              ${isZh ? '3卧 2卫 · 1,200 sqft · 市中心' : '3 Bed · 2 Bath · 1,200 sqft · Downtown'}
            </div>
          </div>`;
        } else if (tpl.layout === 'magazine') {
          preview = html`<div class="tpl-preview tpl-magazine">
            <div class="tpl-mag-hero">
              <div class="tpl-img-slot"><img src="${condoImg}" alt="" /></div>
              <div class="tpl-mag-overlay">
                <div class="tpl-mag-price">$850,000</div>
                <div class="tpl-mag-title">
                  ${isZh ? '市中心豪华公寓' : 'Downtown Luxury Condo'}
                </div>
              </div>
            </div>
            <div class="tpl-mag-side">
              <div class="tpl-mag-label">${isZh ? '精选房源' : 'Featured Listing'}</div>
              <div class="tpl-mag-heading">
                ${isZh ? '现代都市生活的理想之选' : 'The Ideal Choice for Modern Urban Living'}
              </div>
              <div class="tpl-mag-excerpt">
                ${isZh ? '位于市中心黄金地段，步行可达地铁、商场和公园。精装修交付，拎包入住。' : 'Prime downtown location, steps from transit, shopping & parks. Move-in ready with premium finishes.'}
              </div>
              <div class="tpl-mag-features">
                <span class="tpl-mag-feat">🅿️ ${isZh ? '车库' : 'Garage'}</span>
                <span class="tpl-mag-feat">🌳 ${isZh ? '花园' : 'Garden'}</span>
                <span class="tpl-mag-feat">🏊 ${isZh ? '泳池' : 'Pool'}</span>
              </div>
              <div class="tpl-mag-brand">加园地产 HOME DIRECT</div>
            </div>
          </div>`;
        } else if (tpl.layout === 'story') {
          preview = html`<div class="tpl-preview tpl-story">
            <div class="tpl-img-slot"><img src="${condoImg}" alt="" /></div>
            <div class="tpl-story-top">
              <div class="tpl-story-brand">加园地产</div>
              <div class="tpl-story-badge">${isZh ? '新上架' : 'NEW'}</div>
            </div>
            <div class="tpl-story-bottom">
              <div class="tpl-story-price">$850,000</div>
              <div class="tpl-story-name">${isZh ? '市中心豪华公寓' : 'Downtown Luxury Condo'}</div>
              <div class="tpl-story-meta">
                ${isZh ? '3卧 2卫 · 1,200 sqft' : '3 Bed · 2 Bath · 1,200 sqft'}
              </div>
              <div class="tpl-story-cta">${isZh ? '了解详情 →' : 'LEARN MORE →'}</div>
            </div>
            <div class="tpl-story-swipe">▲ ${isZh ? '上滑查看' : 'Swipe up'}</div>
          </div>`;
        } else if (tpl.layout === 'minimal') {
          preview = html`<div class="tpl-preview tpl-minimal">
            <div class="tpl-min-accent"></div>
            <div class="tpl-min-img">
              <div class="tpl-img-slot"><img src="${condoImg}" alt="" /></div>
            </div>
            <div class="tpl-min-info">
              <div class="tpl-min-label">${isZh ? '在售' : 'For Sale'}</div>
              <div class="tpl-min-price">$850,000</div>
              <div class="tpl-min-name">${isZh ? '市中心豪华公寓' : 'Downtown Luxury Condo'}</div>
              <div class="tpl-min-meta">
                ${isZh ? '3卧 2卫 · 1,200 sqft' : '3 Bed · 2 Bath · 1,200 sqft'}
              </div>
              <div class="tpl-min-divider"></div>
              <div class="tpl-min-brand">加园地产 HOME DIRECT</div>
            </div>
          </div>`;
        } else if (tpl.layout === 'diagonal') {
          preview = html`<div class="tpl-preview tpl-diagonal">
            <div class="tpl-diag-img">
              <div class="tpl-img-slot"><img src="${condoImg}" alt="" /></div>
            </div>
            <div class="tpl-diag-text">
              <div class="tpl-diag-label">${isZh ? '精选房源' : 'Featured'}</div>
              <div class="tpl-diag-price">$850,000</div>
              <div class="tpl-diag-name">${isZh ? '市中心豪华公寓' : 'Downtown Luxury Condo'}</div>
              <div class="tpl-diag-meta">
                ${isZh ? '3卧 2卫 · 1,200 sqft · 黄金地段' : '3 Bed · 2 Bath · 1,200 sqft · Prime Location'}
              </div>
              <div class="tpl-diag-cta">${isZh ? '立即预约' : 'BOOK NOW'}</div>
              <div class="tpl-diag-brand">加园地产</div>
            </div>
          </div>`;
        } else if (tpl.layout === 'features') {
          preview = html`<div class="tpl-preview tpl-features">
            <div class="tpl-img-slot"><img src="${condoImg}" alt="" /></div>
            <div class="tpl-feat-badges">
              <div class="tpl-feat-badge">
                <span class="tpl-feat-icon">🏊</span>${isZh ? '私人泳池' : 'Private Pool'}
              </div>
              <div class="tpl-feat-badge">
                <span class="tpl-feat-icon">🅿️</span>${isZh ? '双车库' : '2-Car Garage'}
              </div>
              <div class="tpl-feat-badge">
                <span class="tpl-feat-icon">🌳</span>${isZh ? '大花园' : 'Large Garden'}
              </div>
            </div>
            <div class="tpl-feat-bottom">
              <div class="tpl-feat-info">
                <div class="tpl-feat-price">$850,000</div>
                <div class="tpl-feat-name">
                  ${isZh ? '市中心豪华公寓' : 'Downtown Luxury Condo'}
                </div>
              </div>
              <div class="tpl-feat-brand">加园地产</div>
            </div>
          </div>`;
        }
        return html` <div
          class="card template-card"
          data-od-id="template-card-${tpl.id}"
          data-action="template:preview"
          data-id="${tpl.id}"
        >
          ${preview}
          <div class="template-overlay">
            <button class="btn btn-primary btn-sm">${t('btn_use_template', '使用此模板')}</button>
          </div>
          <div class="card-body">
            <div class="card-title" style="font-size:var(--text-sm)">${name}</div>
            <div class="template-tags">
              ${joinHtml(tpl.platformTags.map(p => html`<span class="badge badge-neutral">${p}</span>`))}
              <span class="badge badge-accent">${tpl.langLabel}</span>
              <span class="badge badge-neutral">${tpl.scene}</span>
            </div>
          </div>
        </div>`;
      }),
    ),
  );
}
