/** Modal de detalle / edición de un listing. */
import { registerActions } from '../../app/actions';
import { getState, setState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, raw, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { dict } from '../../i18n';
import { formatArea, formatPrice, parseNumber } from '../../data/format';
import { repos } from '../../app/services';
import { showNotice } from '../../ui/toast';
import { errorMessage } from '../../ui/errors';
import type {
  Amenity,
  Lang,
  Listing,
  ListingPatch,
  PostStatus,
  PropertyType,
} from '../../types/models';
import { postRejectionNote, postRowActions } from '../posts/post-row';
import { onModalClose } from '../../ui/modal';
import { clearAllGalleryTimers, clearGalleryTimer, startGalleryAutoplay } from './detail-gallery';
import {
  FALLBACK_PHOTO,
  STATUS_BADGE,
  bedBathLabel,
  listingDescription,
  listingMedia,
  listingTitle,
  listingType,
} from './listing-format';

const MODAL_ID = 'modal-listing-detail';

const AMENITY_ICONS: Readonly<Record<Amenity, string>> = {
  parking: '🚗',
  gym: '🏋️',
  pool: '🏊',
  security: '🔒',
  terrace: '🌳',
  storage: '📦',
};

const POST_STATUS_BADGE: Readonly<Record<PostStatus, string>> = {
  draft: 'badge-neutral',
  pending: 'badge-warn',
  approved: 'badge-accent',
  rejected: 'badge-danger',
  published: 'badge-success',
  publishing: 'badge-warn',
  failed: 'badge-danger',
};

const REMOVE_ICON = raw(
  '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
);

function renderEditForm(l: Listing): SafeHtml {
  const { lang } = getState();
  const labels = dict();
  const title = listingTitle(l, lang);
  const desc = listingDescription(l, lang);
  const isType = (type: PropertyType): string => (l.propertyType === type ? 'selected' : '');

  return html` <div class="modal">
    <div class="modal-header">
      <h3>${labels.btn_edit_listing}: ${title}</h3>
      <button class="btn btn-ghost" data-action="listing:open" data-id="${l.id}">&times;</button>
    </div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${labels.form_listing_name}</label>
          <input type="text" id="edit-name-${l.id}" value="${title}" />
        </div>
        <div class="form-group">
          <label class="form-label">${labels.form_centris_id}</label>
          <input type="text" id="edit-centris-${l.id}" value="${l.centris}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${labels.form_address}</label>
        <input type="text" id="edit-address-${l.id}" value="${l.address}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${labels.form_price}</label>
          <input type="text" id="edit-price-${l.id}" value="${formatPrice(l.price)}" />
        </div>
        <div class="form-group">
          <label class="form-label">${labels.form_type}</label>
          <select id="edit-type-${l.id}">
            <option value="apartment" ${isType('apartment')}>${labels.type_apartment}</option>
            <option value="villa" ${isType('villa')}>${labels.type_villa}</option>
            <option value="commercial" ${isType('commercial')}>${labels.type_commercial}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${labels.form_bedrooms}</label>
          <input type="number" id="edit-beds-${l.id}" value="${l.beds}" />
        </div>
        <div class="form-group">
          <label class="form-label">${labels.form_bathrooms}</label>
          <input type="number" id="edit-baths-${l.id}" value="${l.baths}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${labels.form_area}</label>
        <input type="text" id="edit-area-${l.id}" value="${formatArea(l.areaSqft)}" />
      </div>
      <div class="form-group">
        <label class="form-label">${labels.form_description}</label>
        <textarea id="edit-desc-${l.id}" rows="3">${desc}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Photos & Videos</label>
        <div class="media-preview-grid">
          ${l.photos.map(p => html`<div class="media-preview-item"><img src="${p}" alt="" /><button class="remove-media" data-action="media:remove">${REMOVE_ICON}</button></div>`)}
          ${l.video ? html`<div class="media-preview-item is-video"><img src="${l.video}" alt="" /><button class="remove-media" data-action="media:remove">${REMOVE_ICON}</button></div>` : ''}
        </div>
        <div class="media-upload-zone" style="margin-top:var(--space-3)">
          <svg viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>${labels.form_media_hint}</p>
          <div class="upload-hint">${labels.form_media_formats}</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="listing:open" data-id="${l.id}">
        ${labels.btn_cancel}
      </button>
      <button class="btn btn-primary" data-action="listing:save" data-id="${l.id}">
        ${labels.btn_save_listing}
      </button>
    </div>
  </div>`;
}

function renderDetail(l: Listing): { content: SafeHtml; mediaCount: number } {
  const { lang, posts } = getState();
  const labels = dict();
  const title = listingTitle(l, lang);
  const listingPosts = posts.filter(p => p.listingId === l.id);

  const photos = l.photos.filter(p => p.trim() !== '');
  const withPhotos: Listing = { ...l, photos };
  const media = listingMedia(withPhotos);
  if (!media.length) media.push({ type: 'img', src: FALLBACK_PHOTO });

  const amenityLabels: Readonly<Record<Amenity, string | undefined>> = {
    parking: labels.amenity_parking,
    gym: labels.amenity_gym,
    pool: labels.amenity_pool,
    security: labels.amenity_security,
    terrace: labels.amenity_terrace,
    storage: labels.amenity_storage,
  };

  const content = html` <div class="modal">
    <div class="detail-gallery" id="detail-gallery-${l.id}">
      ${media.map((m, i) =>
        m.type === 'video'
          ? html`<video
              muted
              loop
              playsinline
              preload="metadata"
              data-idx="${i}"
              class="${i === 0 ? 'active' : ''}"
              style="${i === 0 ? 'display:block' : ''}"
              src="${m.src}"
            ></video>`
          : html`<img
              src="${m.src}"
              data-idx="${i}"
              alt="${title}"
              class="${i === 0 ? 'active' : ''}"
              style="${i === 0 ? 'display:block' : ''}"
              data-fallback="gallery"
            />`,
      )}
      <button class="gallery-close" data-action="modal:close" data-modal="${MODAL_ID}">
        ${REMOVE_ICON}
      </button>
      <div class="gallery-thumbs" id="detail-thumbs-${l.id}">
        ${media.map((m, i) => html`<div class="gallery-thumb${i === 0 ? ' active' : ''}" data-action="gallery:goto" data-id="${l.id}" data-index="${i}"><img src="${m.src}" alt="" /></div>`)}
      </div>
    </div>
    <div class="detail-info-section">
      <div class="detail-info-top">
        <div style="flex:1">
          <h2>${title}</h2>
          <div class="detail-info-meta" style="margin-top:6px">
            <span>${l.address}</span>
            <span>Centris #${l.centris}</span>
          </div>
        </div>
        <div class="detail-info-badges">
          <span class="badge ${STATUS_BADGE[l.status]}"
            ><span class="badge-dot"></span> ${labels[`status_${l.status}`] ?? l.status}</span
          >
          <span class="badge badge-neutral">${listingType(l, lang)}</span>
          <span class="badge badge-neutral">${bedBathLabel(l)}</span>
          <span class="badge badge-neutral">${formatArea(l.areaSqft)} sqft</span>
        </div>
      </div>
      <div class="detail-info-price">${formatPrice(l.price)}</div>
      <div class="detail-info-desc">${listingDescription(l, lang)}</div>
      <div>
        <h3 style="font-size:var(--text-base);font-weight:700;margin-bottom:var(--space-3)">
          ${labels.detail_amenities}
        </h3>
        <div class="detail-info-amenities">
          ${l.amenities.map(
            a =>
              html`<div class="detail-amenity-item">
                <div class="detail-amenity-icon">${AMENITY_ICONS[a]}</div>
                <span>${amenityLabels[a] ?? a}</span>
              </div>`,
          )}
        </div>
      </div>
      <div>
        <h3 style="font-size:var(--text-base);font-weight:700;margin:var(--space-4) 0 var(--space-3)">
          ${labels.listing_posts_title}
        </h3>
        ${
          listingPosts.length === 0
            ? html`<p class="form-hint">${labels.listing_posts_empty}</p>`
            : joinHtml(
                listingPosts.map(
                  p => html`<div class="post-row-compact">
                  <span class="badge ${POST_STATUS_BADGE[p.status]}">${labels[`tab_${p.status}`] ?? p.status}</span>
                  <span class="post-row-compact-title">${p.title}</span>
                  <span class="post-row-compact-date">${p.date}</span>
                  <div class="post-row-actions">${postRowActions(p)}</div>
                  ${postRejectionNote(p)}
                </div>`,
                ),
              )
        }
      </div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-primary" data-action="post:new" data-listing-id="${l.id}">${labels.btn_create_post}</button>
      <button class="btn btn-secondary" data-action="listing:edit" data-id="${l.id}">
        ${labels.btn_edit_listing}
      </button>
      <button class="btn btn-secondary" data-action="modal:close" data-modal="${MODAL_ID}">
        ${labels.btn_back}
      </button>
    </div>
  </div>`;
  return { content, mediaCount: media.length };
}

/** Abre el modal de un listing en modo detalle o edición. */
export function openListingModal(id: number, editMode = false): void {
  const listing = getState().listings.find(l => l.id === id);
  const modal = getById(MODAL_ID);
  if (!listing || !modal) return;

  clearGalleryTimer(id);
  if (editMode) {
    setHtml(modal, renderEditForm(listing));
    modal.classList.add('open');
    return;
  }

  const { content, mediaCount } = renderDetail(listing);
  setHtml(modal, content);
  modal.classList.add('open');
  startGalleryAutoplay(id, mediaCount);
}

const PROPERTY_TYPES: readonly PropertyType[] = ['apartment', 'villa', 'commercial'];

/** Lee el formulario de edición y devuelve solo los cambios. */
function readEditForm(listing: Listing, lang: Lang): ListingPatch {
  const value = (name: string): string | undefined =>
    (document.getElementById(`edit-${name}-${String(listing.id)}`) as HTMLInputElement | null)
      ?.value;

  const patch: ListingPatch = {};
  const name = value('name');
  const desc = value('desc');
  const type = value('type');
  const centris = value('centris');
  const address = value('address');
  const price = value('price');
  const beds = value('beds');
  const baths = value('baths');
  const area = value('area');

  // El texto se guarda en el idioma con el que se está editando.
  if (name !== undefined) patch.title = { ...listing.title, [lang]: name };
  if (desc !== undefined) patch.description = { ...listing.description, [lang]: desc };
  if (centris !== undefined) patch.centris = centris;
  if (address !== undefined) patch.address = address;
  if (price !== undefined) patch.price = parseNumber(price);
  if (type !== undefined && PROPERTY_TYPES.includes(type as PropertyType))
    patch.propertyType = type as PropertyType;
  if (beds !== undefined) patch.beds = Number(beds);
  if (baths !== undefined) patch.baths = Number(baths);
  if (area !== undefined) patch.areaSqft = parseNumber(area);
  return patch;
}

async function saveListingEdit(id: number): Promise<void> {
  const listing = getState().listings.find(l => l.id === id);
  if (!listing) return;
  try {
    const updated = await repos.listings.update(id, readEditForm(listing, getState().lang));
    setState(state => ({ listings: state.listings.map(l => (l.id === id ? updated : l)) }));
    openListingModal(id, false);
  } catch (error) {
    showNotice(errorMessage(error));
  }
}

export function initListingModal(): void {
  onModalClose(MODAL_ID, clearAllGalleryTimers);

  registerActions({
    'listing:open': el => {
      openListingModal(Number(el.dataset.id));
    },
    'listing:edit': el => {
      openListingModal(Number(el.dataset.id), true);
    },
    'listing:save': el => {
      void saveListingEdit(Number(el.dataset.id));
    },
    'media:remove': el => {
      el.parentElement?.remove();
    },
  });
}
