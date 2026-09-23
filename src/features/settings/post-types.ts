/** Pestaña "Tipos de post": similitud entre plataformas y formatos por plataforma. */
import { getState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, raw, setHtml } from '../../core/html';
import { localize, t } from '../../i18n';
import type { PostTypeGroup } from '../../types/models';
import { PLATFORM_BADGE_ICONS } from '../../ui/icons/platform-icons';
import { findPlatform, platformDisplayName, postTypeName } from '../platforms/platform-format';

const GROUP_ICONS: Readonly<Record<PostTypeGroup, string>> = {
  image: '🖼',
  carousel: '📰',
  video: '🎬',
  short_video: '📱',
  story: '⏱',
  live: '🔴',
  article: '📄',
  text: '💬',
};

export function renderCrossPlatformGrid(): void {
  const grid = getById('cross-platform-grid');
  if (!grid) return;
  const { postTypeGroups, platforms, lang } = getState();

  const cards = (Object.keys(postTypeGroups) as PostTypeGroup[]).map(key => {
    const group = postTypeGroups[key];
    const desc = localize(group.description, lang);
    const badges = group.platforms.map(id => {
      const platform = findPlatform(platforms, id);
      if (!platform) return '';
      return html`<span class="cross-platform-badge" style="background:${platform.color}"
        >${platformDisplayName(platform, lang)}</span
      >`;
    });
    return html`<div class="cross-platform-card">
      <div class="cross-platform-card-header">
        <div class="cross-platform-card-icon">${GROUP_ICONS[key]}</div>
        <div class="cross-platform-card-name">${group.name}</div>
      </div>
      <div class="cross-platform-card-desc">${desc}</div>
      <div class="cross-platform-platforms">${badges}</div>
    </div>`;
  });
  setHtml(grid, joinHtml(cards));
}

export function renderAllPlatformFormats(): void {
  const grid = getById('all-platforms-format-grid');
  if (!grid) return;
  const { platforms, lang } = getState();

  const cards = platforms.map(platform => {
    const types = platform.postTypes.map(
      type =>
        html`<div class="format-type">
          <div class="format-type-header">
            <span class="format-type-name">${postTypeName(type, lang)}</span>
            <span class="format-type-ratio">${type.ratio}</span>
          </div>
        </div>`,
    );
    return html`<div class="format-card">
      <div class="format-card-header">
        <div class="format-card-icon" style="background:${platform.color}">
          ${raw(PLATFORM_BADGE_ICONS[platform.id])}
        </div>
        <div>
          <div class="format-card-name">${platformDisplayName(platform, lang)}</div>
          <div class="format-card-desc">${platform.postTypes.length} ${t('post_types_count')}</div>
        </div>
      </div>
      <div class="format-card-body">${types}</div>
    </div>`;
  });
  setHtml(grid, joinHtml(cards));
}
