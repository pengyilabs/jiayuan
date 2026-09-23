/** Tarjetas del feed: una variante visual por red social. */
import { getState } from '../../app/state';
import { html, joinHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { t } from '../../i18n';
import type { PlatformId, Post } from '../../types/models';
import { feedIcon, findPlatform, platformDisplayName } from '../platforms/platform-format';

const TAG_CLASS: Readonly<Partial<Record<PlatformId, string>>> = {
  facebook: 'platform-tag-fb',
  wechat_official: 'platform-tag-wx',
  wechat_channels: 'platform-tag-wxch',
  xiaohongshu: 'platform-tag-xhs',
  douyin: 'platform-tag-dy',
  instagram: 'platform-tag-ig',
  youtube: 'platform-tag-yt',
  tiktok: 'platform-tag-tt',
};

export function platformTag(id: PlatformId): SafeHtml {
  const { platforms, lang } = getState();
  const cls = TAG_CLASS[id] ?? 'platform-tag-fb';
  const platform = findPlatform(platforms, id);
  const displayName = platform ? platformDisplayName(platform, lang) : id;
  return html`<span class="platform-tag ${cls}"
    >${feedIcon(id)}<span style="margin-left:2px">${displayName}</span></span
  >`;
}

const isCarouselPost = (p: Post): boolean => p.media === 'carousel' && p.images.length > 1;

function mediaLabel(p: Post): SafeHtml | '' {
  if (isCarouselPost(p)) {
    return html`<div class="feed-media-badge">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect x="7" y="7" width="14" height="14" rx="2" opacity="0.5" />
      </svg>
      ${p.images.length} ${t('feed_images', '张图片')}
    </div>`;
  }
  if (p.media === 'video') {
    return html`<div class="feed-media-badge">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polygon points="5,3 19,12 5,21" />
      </svg>
      ${t('feed_video', '视频')}
    </div>`;
  }
  return '';
}

const hashtags = (p: Post): SafeHtml | '' =>
  p.hashtags
    ? html`<div style="margin-top:4px;font-size:10px;color:var(--accent);line-height:1.3">
        ${p.hashtags}
      </div>`
    : '';

function videoOverlay(p: Post): SafeHtml | '' {
  if (p.media !== 'video') return '';
  return html`<div class="feed-video-overlay">
    <div class="feed-video-play">
      <svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19" /></svg>
    </div>
  </div>`;
}

/** Tira de imágenes navegable (ver `feed-carousel.ts`). */
function carouselStrip(p: Post): SafeHtml | '' {
  if (!isCarouselPost(p)) return '';
  const imgs = p.images.map(
    (src, i) =>
      html`<img
        src="${src}"
        alt="${p.title}"
        class="feed-carousel-img"
        data-idx="${i}"
        data-fallback="feed"
      />`,
  );
  const dots = p.images.slice(0, 7).map(
    (_, i) =>
      html`<div
          class="feed-carousel-dot${i === 0 ? ' active' : ''}"
          data-dot="${i}"
          data-action="feed-carousel:goto"
          data-index="${i}"
        ></div>`,
  );
  return html`<div class="feed-carousel-strip" data-carousel="${p.id}">
    <div class="feed-carousel-track">${imgs}</div>
    <div class="feed-carousel-dots">${dots}</div>
    <button
      class="feed-carousel-btn feed-carousel-prev"
      data-action="feed-carousel:step"
      data-dir="-1"
      aria-label="Previous image"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="15,4 9,12 15,20" />
      </svg>
    </button>
    <button
      class="feed-carousel-btn feed-carousel-next"
      data-action="feed-carousel:step"
      data-dir="1"
      aria-label="Next image"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="9,4 15,12 9,20" />
      </svg>
    </button>
  </div>`;
}

export function renderFeedCard(p: Post): SafeHtml {
  const img = p.images && p.images[0] ? p.images[0] : 'images/listings/condo1.jpg';
  const isCarousel = p.media === 'carousel' && p.images && p.images.length > 1;
  const isIG = p.platformId === 'instagram';

  // ── Instagram card ──
  if (isIG) {
    const likes = Math.floor(Math.random() * 500) + 50;
    const tags = p.hashtags
      ? joinHtml(
          p.hashtags.split(/\s+/).map(t => html`<span class="feed-ig-tags">${t}</span>`),
          ' ',
        )
      : '';
    return html`<div class="feed-card feed-ig" data-od-id="feed-post-${p.id}">
      <div class="feed-ig-top">
        <div class="feed-ig-avatar">
          <div class="feed-ig-avatar-inner"><img src="${img}" alt="" /></div>
        </div>
        <div class="feed-ig-name">home_direct_mtl</div>
        <div class="feed-platform-tags">${platformTag('instagram')}</div>
      </div>
      ${
        isCarousel
          ? carouselStrip(p)
          : html` <img class="feed-ig-image" src="${img}" alt="${p.title}" data-fallback="feed" />`
      }
      <div class="feed-ig-actions">
        <svg viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2">
          <path
            d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
          />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22,2 15,22 11,13 2,9" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#262626"
          stroke-width="2"
          style="margin-left:auto"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </div>
      <div class="feed-ig-likes">${likes.toLocaleString()} likes</div>
      <div class="feed-ig-body">
        <div class="feed-ig-text"><b>home_direct_mtl</b> ${p.description}</div>
        <div style="margin-top:6px">${tags}</div>
      </div>
      <div class="feed-ig-time">${p.date}</div>
    </div>`;
  }

  // ── WeChat card ──
  const isWeChat = p.platformId === 'wechat_official' || p.platformId === 'wechat_channels';
  if (isWeChat) {
    const wxColor = p.platformId === 'wechat_channels' ? '#FF6B2C' : '#07C160';
    const wxLabel = p.platformId === 'wechat_channels' ? '视频号' : '公众号';
    return html`<div class="feed-card feed-wechat" data-od-id="feed-post-${p.id}">
      <div class="feed-header">
        <div class="feed-wx-icon" style="background:${wxColor}">
          ${feedIcon(p.platformId) || 'W'}
        </div>
        <div class="feed-wx-info">
          <div class="feed-wx-account">加园地产 HOME DIRECT · ${wxLabel}</div>
          <div class="feed-wx-time">${p.date}</div>
        </div>
        <div class="feed-platform-tags">${platformTag(p.platformId)}</div>
      </div>
      <div class="feed-wx-body">
        <div class="feed-wx-title">${p.title}</div>
        <div class="feed-wx-excerpt">${p.description}</div>
        ${hashtags(p)}
        <div class="feed-img-wrap" style="border-radius:4px;overflow:hidden;margin-top:8px">
          <img class="feed-wx-thumb" src="${img}" alt="${p.title}" data-fallback="feed" />
          ${videoOverlay(p)} ${mediaLabel(p)}
        </div>
      </div>
      <div class="feed-wx-footer">
        <span>${t('feed_read_more', '阅读原文')}</span>
        <span class="feed-wx-read-more">${t('feed_view_original', '查看原文 →')}</span>
      </div>
    </div>`;
  }

  // ── Xiaohongshu card ──
  const isXHS = p.platformId === 'xiaohongshu';
  if (isXHS) {
    const likes = Math.floor(Math.random() * 800) + 100;
    const saves = Math.floor(Math.random() * 200) + 50;
    const comments = Math.floor(Math.random() * 80) + 10;
    return html`<div class="feed-card feed-xhs" data-od-id="feed-post-${p.id}">
      <div class="feed-header">
        <div class="feed-xhs-icon" style="background:#FE2C55">
          ${feedIcon('xiaohongshu') || '小'}
        </div>
        <div class="feed-xhs-info">
          <div class="feed-xhs-account">加园地产 HOME DIRECT</div>
          <div class="feed-xhs-time">${p.date}</div>
        </div>
        <div class="feed-platform-tags">${platformTag('xiaohongshu')}</div>
      </div>
      ${
        isCarousel
          ? carouselStrip(p)
          : html` <div class="feed-img-wrap ratio-45">
              <img src="${img}" alt="${p.title}" data-fallback="feed" />
              ${videoOverlay(p)} ${mediaLabel(p)}
            </div>`
      }
      <div class="feed-body">
        <div class="feed-title">${p.title}</div>
        <div class="feed-text">${p.description}</div>
        ${p.price !== '—' ? html`<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--accent)">${p.price}${p.beds ? ` · ${p.beds}🛏 ${p.baths}🚿` : ''}</div>` : ''}
        ${hashtags(p)}
      </div>
      <div class="feed-xhs-actions">
        <div class="feed-xhs-action">
          <svg viewBox="0 0 24 24" fill="#FE2C55">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
          ${likes}
        </div>
        <div class="feed-xhs-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FE2C55" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          ${saves}
        </div>
        <div class="feed-xhs-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FE2C55" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          ${comments}
        </div>
      </div>
    </div>`;
  }

  // ── Douyin card ──
  const isDY = p.platformId === 'douyin';
  if (isDY) {
    const likes = Math.floor(Math.random() * 5000) + 500;
    const comments = Math.floor(Math.random() * 300) + 50;
    const shares = Math.floor(Math.random() * 100) + 20;
    return html`<div class="feed-card feed-dy" data-od-id="feed-post-${p.id}">
      <div class="feed-header">
        <div class="feed-dy-icon" style="background:#010101">${feedIcon('douyin') || '抖'}</div>
        <div class="feed-dy-info">
          <div class="feed-dy-account">加园地产 HOME DIRECT</div>
          <div class="feed-dy-time">${p.date}</div>
        </div>
        <div class="feed-platform-tags">${platformTag('douyin')}</div>
      </div>
      <div class="feed-img-wrap ratio-916">
        <img src="${img}" alt="${p.title}" data-fallback="feed" />
        ${videoOverlay(p)}
        <div class="feed-dy-overlay">
          <div class="feed-dy-sidebar">
            <div class="feed-dy-action">
              <svg viewBox="0 0 24 24" fill="#fff">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
              ${likes.toLocaleString()}
            </div>
            <div class="feed-dy-action">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              ${comments}
            </div>
            <div class="feed-dy-action">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16,6 12,2 8,6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              ${shares}
            </div>
          </div>
        </div>
      </div>
      <div class="feed-body">
        <div class="feed-title">${p.title}</div>
        <div class="feed-text">${p.description}</div>
        ${hashtags(p)}
      </div>
    </div>`;
  }

  // ── Facebook card ──
  const aspectClass = p.media === 'single' ? '' : 'ratio-45';
  const likes = Math.floor(Math.random() * 300) + 20;
  const comments = Math.floor(Math.random() * 50) + 5;
  const shares = Math.floor(Math.random() * 30) + 2;
  return html`<div class="feed-card feed-fb" data-od-id="feed-post-${p.id}">
    <div class="feed-header">
      <div class="feed-avatar">
        <svg viewBox="0 0 24 24" fill="#fff">
          <path
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          />
        </svg>
      </div>
      <div class="feed-byline">
        <div class="feed-author">加园地产 HOME DIRECT</div>
        <div class="feed-meta">${p.date} · 🌐</div>
      </div>
      <div class="feed-platform-tags">${platformTag(p.platformId)}</div>
    </div>
    ${
      isCarousel
        ? carouselStrip(p)
        : html` <div class="feed-img-wrap ${aspectClass}">
            <img src="${img}" alt="${p.title}" data-fallback="feed" />
            ${videoOverlay(p)} ${mediaLabel(p)}
          </div>`
    }
    <div class="feed-body">
      <div class="feed-title">${p.title}</div>
      <div class="feed-text">${p.description}</div>
      ${p.price !== '—' ? html`<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--accent)">${p.price}${p.beds ? ` · ${p.beds}🛏 ${p.baths}🚿` : ''}</div>` : ''}
      ${hashtags(p)}
    </div>
    <div class="feed-reactions">
      <div class="feed-reactions-left">
        <div class="feed-reactions-icons">
          <span class="feed-reactions-icon">👍</span>
          <span class="feed-reactions-icon">❤️</span>
          <span class="feed-reactions-icon">😄</span>
        </div>
        <span class="feed-reactions-count">${likes}</span>
      </div>
      <span class="feed-reactions-comments">${comments} comments · ${shares} shares</span>
    </div>
    <div class="feed-actions">
      <div class="feed-action">
        <svg viewBox="0 0 24 24">
          <path
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
          />
        </svg>
        Like
      </div>
      <div class="feed-action">
        <svg viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        Comment
      </div>
      <div class="feed-action">
        <svg viewBox="0 0 24 24">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
          <polyline points="16,6 12,2 8,6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </div>
    </div>
  </div>`;
}
