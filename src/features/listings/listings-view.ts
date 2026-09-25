import { getState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, raw, setHtml } from '../../core/html';
import { dict, t } from '../../i18n';
import {
  FALLBACK_PHOTO,
  STATUS_BADGE,
  bedBathLabel,
  listingMedia,
  listingTitle,
  listingType,
} from './listing-format';
import { formatArea, formatPrice } from '../../data/format';

const VIEW_ICON = raw(
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
);

function renderTable(): void {
  const container = getById('listings-table-view');
  if (!container) return;
  const { listings, lang } = getState();
  const labels = dict();

  setHtml(
    container,
    html` <table class="listings-table">
      <thead>
        <tr>
          <th style="width:60px"><span class="sr-only">${t('col_photo')}</span></th>
          <th>${t('col_title')}</th>
          <th>${t('col_type')}</th>
          <th>${t('col_status')}</th>
          <th>${t('col_price')}</th>
          <th>${t('col_beds_baths')}</th>
          <th style="width:80px"><span class="sr-only">${t('col_actions')}</span></th>
        </tr>
      </thead>
      <tbody>
        ${listings.map(l => {
          const img = l.photos[0] ?? FALLBACK_PHOTO;
          return html`<tr data-action="listing:open" data-id="${l.id}">
            <td><img class="listing-thumb" src="${img}" alt="" data-fallback="thumb" /></td>
            <td>
              <div class="listing-title">${listingTitle(l, lang)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:1px">${l.address}</div>
            </td>
            <td><span class="listing-type">${listingType(l, lang)}</span></td>
            <td>
              <span class="listing-status-badge badge ${STATUS_BADGE[l.status]}"
                ><span class="badge-dot"></span> ${labels[`status_${l.status}`] ?? l.status}</span
              >
            </td>
            <td><span class="listing-price">${formatPrice(l.price)}</span></td>
            <td><span class="listing-beds">${bedBathLabel(l)}</span></td>
            <td>
              <div class="listing-actions">
                <button data-action="listing:open" data-id="${l.id}" title="${t('action_view')}">
                  ${VIEW_ICON}
                </button>
              </div>
            </td>
          </tr>`;
        })}
      </tbody>
    </table>`,
  );
}

function renderGrid(): void {
  const grid = getById('listings-grid');
  if (!grid) return;
  const { listings, lang } = getState();
  const labels = dict();

  setHtml(
    grid,
    joinHtml(
      listings.map(l => {
        const title = listingTitle(l, lang);
        const media = listingMedia(l);
        const hasVideo = Boolean(l.video);
        const active = (i: number) => (i === 0 ? raw("class='active'") : '');
        return html` <div
          class="card"
          data-od-id="listing-card-${l.id}"
          data-listing-id="${l.id}"
          data-hover-carousel
        >
          <div class="card-carousel" data-action="listing:open" data-id="${l.id}">
            ${media.map((m, i) =>
              m.type === 'video'
                ? html`<video
                    muted
                    loop
                    playsinline
                    preload="metadata"
                    data-idx="${i}"
                    ${active(i)}
                    src="${m.src}"
                  ></video>`
                : html`<img
                    src="${m.src}"
                    data-idx="${i}"
                    alt="${title}"
                    ${active(i)}
                    data-loaded-class="loaded"
                    data-fallback="card"
                  />`,
            )}
            ${
              hasVideo
                ? html`<div class="video-badge">
                    <svg viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
                    </svg>
                    Video
                  </div>`
                : ''
            }
            <div class="carousel-counter">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
              ${media.length}
            </div>
            <button class="carousel-arrow prev" data-action="card:slide" data-dir="-1">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button class="carousel-arrow next" data-action="card:slide" data-dir="1">
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div class="carousel-dots">
              ${media.map((_, i) => html`<button class="carousel-dot${i === 0 ? ' active' : ''}" data-action="card:goto" data-index="${i}"></button>`)}
            </div>
          </div>
          <div class="card-body" data-action="listing:open" data-id="${l.id}">
            <div
              style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px"
            >
              <div class="card-title">${title}</div>
              <span class="badge ${STATUS_BADGE[l.status]}"
                ><span class="badge-dot"></span> ${labels[`status_${l.status}`] ?? l.status}</span
              >
            </div>
            <div class="card-meta">${l.address}</div>
            <div
              style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-3)"
            >
              <div class="card-price">${formatPrice(l.price)}</div>
              <div class="card-meta">${bedBathLabel(l)} · ${formatArea(l.areaSqft)} sqft</div>
            </div>
            <div style="margin-top:8px">
              <span class="badge badge-neutral">${listingType(l, lang)}</span>
            </div>
          </div>
        </div>`;
      }),
    ),
  );
}

/** Muestra la vista activa (tabla o grid) y la vuelve a renderizar. */
export function renderListings(): void {
  const { listingsView } = getState();
  const tableView = getById('listings-table-view');
  const gridView = getById('listings-grid');
  if (tableView) tableView.style.display = listingsView === 'table' ? '' : 'none';
  if (gridView) gridView.style.display = listingsView === 'grid' ? '' : 'none';

  document.querySelectorAll('.listings-view-toggle .view-toggle-btn').forEach(button => {
    button.classList.toggle('active', (button as HTMLElement).dataset.view === listingsView);
  });

  if (listingsView === 'table') renderTable();
  else renderGrid();
}
