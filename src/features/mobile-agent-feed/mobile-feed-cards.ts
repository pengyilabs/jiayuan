/**
 * Tarjetas del feed móvil de agente (F10): misma estructura visual que el diseño adjunto, con
 * datos reales. Si el post tiene plantilla, reutiliza el renderizador real de F5
 * (`renderTemplateDesign`) —los mismos 8 layouts que en escritorio, con la imagen que la
 * persona subió— en vez de reinventar los 4 diseños de ejemplo del archivo original.
 */
import { getState } from '../../app/state';
import { html } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { t } from '../../i18n';
import { renderTemplateDesign, templateOutputSize } from '../templates/template-render';
import { findPlatform, platformDisplayName } from '../platforms/platform-format';
import type { Post, PostStatus } from '../../types/models';

const STATUS_CLASS: Readonly<Record<PostStatus, string>> = {
  draft: 'm-status-draft',
  pending: 'm-status-pending',
  approved: 'm-status-pending',
  publishing: 'm-status-pending',
  published: 'm-status-published',
  failed: 'm-status-rejected',
  rejected: 'm-status-rejected',
};
const STATUS_KEY: Readonly<Record<PostStatus, string>> = {
  draft: 'tab_draft',
  pending: 'tab_pending',
  approved: 'tab_pending',
  publishing: 'tab_pending',
  published: 'tab_published',
  failed: 'tab_rejected',
  rejected: 'tab_rejected',
};

function platformTag(post: Post): SafeHtml {
  const platform = findPlatform(getState().platforms, post.platformId);
  const color = platform?.color ?? '#999';
  const name = platform ? platformDisplayName(platform, getState().lang) : post.platformId;
  return html`<span class="m-post-platform-tag" style="background:${color}">${name}</span>`;
}

function actionsRow(): SafeHtml {
  return html`<div class="m-post-actions">
    <button class="m-post-action" data-action="mobile-feed:like">${t('m_feed_like', '👍 Like')}</button>
    <button class="m-post-action">${t('m_feed_comment', '💬 Comment')}</button>
    <button class="m-post-action">${t('m_feed_share', '↗ Share')}</button>
  </div>`;
}

function carouselMedia(post: Post): SafeHtml {
  const imgs = post.images.map(
    (src, i) =>
      html`<img src="${src}" alt="" loading="lazy" data-fallback="feed" data-idx="${i}" />`,
  );
  const dots = post.images
    .slice(0, 7)
    .map(
      (_, i) =>
        html`<div class="m-carousel-dot${i === 0 ? ' m-active' : ''}" data-dot="${i}"></div>`,
    );
  return html`<div class="m-carousel" data-m-carousel="${post.id}">
    <div class="m-carousel-track">${imgs}</div>
    <div class="m-carousel-dots">${dots}</div>
    <button class="m-carousel-btn m-carousel-prev" data-dir="-1" aria-label="Previous">
      <svg viewBox="0 0 24 24"><polyline points="15,4 9,12 15,20" /></svg>
    </button>
    <button class="m-carousel-btn m-carousel-next" data-dir="1" aria-label="Next">
      <svg viewBox="0 0 24 24"><polyline points="9,4 15,12 9,20" /></svg>
    </button>
  </div>`;
}

/** Con plantilla: reutiliza el renderizador real (F5), no los 4 diseños fijos del mockup. */
function templatedCard(post: Post): SafeHtml | null {
  const tpl = post.templateId
    ? getState().templates.find(x => x.id === post.templateId)
    : undefined;
  const listing = post.listingId
    ? getState().listings.find(l => l.id === post.listingId)
    : undefined;
  if (!tpl || !listing) return null;

  const size = templateOutputSize(tpl, post.platformId, post.postTypeId ?? undefined);
  return html`<div class="m-feed-tpl" data-od-id="m-post-${post.id}">
    <div class="m-post-header">
      <div class="m-post-avatar">HD</div>
      <div class="m-post-byline">
        <div class="m-post-author">${t('brand_short', 'HOME DIRECT')}</div>
        <div class="m-post-meta">${post.date}</div>
      </div>
      ${platformTag(post)}
    </div>
    <div style="aspect-ratio:${size.width}/${size.height}">
      ${renderTemplateDesign(tpl, listing, getState().lang, post.images)}
    </div>
    ${post.hashtags ? html`<div class="m-feed-tpl-hashtags">${post.hashtags}</div>` : ''}
    ${actionsRow()}
  </div>`;
}

export function renderMobileFeedCard(post: Post): SafeHtml {
  const withTemplate = templatedCard(post);
  if (withTemplate) return withTemplate;

  const img = post.images[0] ?? 'images/listings/condo1.jpg';
  const isCarousel = post.media === 'carousel' && post.images.length > 1;
  const isVideo = post.media === 'video';

  const media = isCarousel
    ? carouselMedia(post)
    : isVideo
      ? html`<div class="m-post-img-wrap m-ratio-169">
          <img src="${img}" alt="" loading="lazy" data-fallback="feed" />
          <div class="m-post-video-play">
            <div><svg viewBox="0 0 24 24" fill="#fff"><polygon points="8,5 19,12 8,19" /></svg></div>
          </div>
        </div>`
      : html`<div class="m-post-img-wrap">
          <img src="${img}" alt="" loading="lazy" data-fallback="feed" />
        </div>`;

  const priceLine =
    post.price !== '—'
      ? html`<div class="m-post-price">
          ${post.price}${post.beds ? html` · ${post.beds}🛏 ${post.baths}🚿` : ''}
        </div>`
      : '';

  return html`<div class="m-post-card" data-od-id="m-post-${post.id}">
    <div class="m-post-header">
      <div class="m-post-avatar">HD</div>
      <div class="m-post-byline">
        <div class="m-post-author">${t('brand_short', 'HOME DIRECT')}</div>
        <div class="m-post-meta">${post.date}</div>
      </div>
      ${platformTag(post)}
    </div>
    ${media}
    <div class="m-post-body">
      <div class="m-post-title">${post.title}</div>
      <div class="m-post-text">${post.description}</div>
      ${priceLine}
      ${post.hashtags ? html`<div class="m-post-hashtags">${post.hashtags}</div>` : ''}
      <span class="m-post-status ${STATUS_CLASS[post.status]}">${t(STATUS_KEY[post.status])}</span>
    </div>
    ${actionsRow()}
  </div>`;
}

/** Arrastrar/tocar los puntos del carrusel de una tarjeta sin plantilla (el m-feed-tpl no usa carrusel). */
export function initMobileCarousels(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-m-carousel]').forEach(el => {
    const track = el.querySelector<HTMLElement>('.m-carousel-track');
    const dots = Array.from(el.querySelectorAll<HTMLElement>('.m-carousel-dot'));
    const imgs = el.querySelectorAll('img').length;
    if (!track || imgs === 0) return;
    let idx = 0;
    const update = (i: number): void => {
      idx = (i + imgs) % imgs;
      track.style.transform = `translateX(-${String(idx * 100)}%)`;
      dots.forEach((d, j) => {
        d.classList.toggle('m-active', j === idx);
      });
    };
    el.querySelector('.m-carousel-prev')?.addEventListener('click', e => {
      e.stopPropagation();
      update(idx - 1);
    });
    el.querySelector('.m-carousel-next')?.addEventListener('click', e => {
      e.stopPropagation();
      update(idx + 1);
    });
    dots.forEach((d, j) => {
      d.addEventListener('click', e => {
        e.stopPropagation();
        update(j);
      });
    });
    let startX = 0;
    track.addEventListener('touchstart', e => (startX = e.touches[0]?.clientX ?? 0), {
      passive: true,
    });
    track.addEventListener(
      'touchend',
      e => {
        const diff = startX - (e.changedTouches[0]?.clientX ?? 0);
        if (Math.abs(diff) > 40) update(idx + (diff > 0 ? 1 : -1));
      },
      { passive: true },
    );
  });
}
