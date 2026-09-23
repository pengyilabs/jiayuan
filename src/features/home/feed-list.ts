/** Vista de lista del feed (alternativa al grid). */
import { getState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import { dict } from '../../i18n';
import type { Post, PostLang, PostStatus } from '../../types/models';
import { postRejectionNote, postRowActions } from '../posts/post-row';
import { feedIcon, findPlatform, platformDisplayName } from '../platforms/platform-format';
import { FALLBACK_IMAGE, groupPostsByDate } from './feed-utils';

const STATUS_CLASS: Readonly<Record<PostStatus, string>> = {
  published: 'status-published',
  pending: 'status-pending',
  draft: 'status-draft',
  rejected: 'status-rejected',
  approved: 'status-approved',
  publishing: 'status-pending',
  failed: 'status-rejected',
};

const LANG_LABEL: Readonly<Record<PostLang, string>> = {
  中文: '中文',
  English: 'English',
  双语: 'Bilingue',
  Français: 'Français',
};

export function renderFeedList(posts: readonly Post[]): void {
  const container = getById('feed-list-container');
  if (!container) return;
  const labels = dict();
  const { platforms, lang } = getState();
  const grouped = groupPostsByDate(posts);
  // Orden ascendente por `sort()` y luego invertido, igual que la versión original.
  const dates = Object.keys(grouped).sort().reverse();

  setHtml(
    container,
    joinHtml(
      dates.map(date => {
        const dayPosts = (grouped[date] ?? []).map(p => {
          const platform = findPlatform(platforms, p.platformId);
          const name = platform ? platformDisplayName(platform, lang) : p.platformId;
          return html`<div class="feed-list-post">
            <img
              class="post-thumb"
              src="${p.images[0] ?? FALLBACK_IMAGE}"
              alt=""
              data-fallback="thumb"
            />
            <div class="post-info">
              <div class="post-title">${p.title}</div>
              <div class="post-desc">${p.description}</div>
              ${postRejectionNote(p)}
            </div>
            <div class="post-platform">
              <div class="post-platform-icon" style="background:${platform?.color ?? '#666'}">
                ${feedIcon(p.platformId) || name.charAt(0)}
              </div>
              <span class="post-platform-name">${name}</span>
            </div>
            <span class="post-lang">${LANG_LABEL[p.lang]}</span>
            <span class="status-badge ${STATUS_CLASS[p.status]}"
              >${labels[`tab_${p.status}`] ?? p.status}</span
            >
            <span class="post-date">${p.date}</span>
            <div class="post-row-actions">${postRowActions(p)}</div>
          </div>`;
        });
        return html`<div class="day-section">
          <div class="day-section-header">
            <div class="day-section-date">${date}</div>
          </div>
          ${dayPosts}
        </div>`;
      }),
    ),
  );
}
