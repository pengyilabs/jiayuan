/** Feed principal de Home: secciones por día (agrupadas por `scheduled_at`) + tarjetas. */
import { getState } from '../../app/state';
import { getById, qsa } from '../../core/dom';
import { todayInTimeZone } from '../../core/dates';
import { html, joinHtml, setHtml } from '../../core/html';
import { dict } from '../../i18n';
import type { Post } from '../../types/models';
import { renderFeedCard } from './feed-cards';
import { renderFeedList } from './feed-list';
import { formatDayLabel, groupPostsByDate, matchesFilters } from './feed-utils';

/** Contadores de los botones de filtro que los declaran (`.feed-filter-count`). */
function syncFilterCounts(posts: readonly Post[]): void {
  qsa('.feed-filter').forEach(button => {
    const counter = button.querySelector('.feed-filter-count');
    if (!counter) return;
    const platform = button.dataset.platform;
    counter.textContent = String(
      platform === 'all' ? posts.length : posts.filter(p => p.platformId === platform).length,
    );
  });
}

/** Refleja filtro y vista activos en los botones y muestra el contenedor correcto. */
export function syncFeedControls(): void {
  const { feedFilter, feedView, feedStatusFilter } = getState();
  qsa('.feed-filter').forEach(button => {
    button.classList.toggle('active', button.dataset.platform === feedFilter);
  });
  qsa('.feed-status-filter').forEach(button => {
    button.classList.toggle('active', button.dataset.status === feedStatusFilter);
  });
  qsa('.feed-view-toggle .view-toggle-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.view === feedView);
  });
  const socialFeed = getById('social-feed');
  const listView = getById('feed-list-view');
  if (socialFeed) socialFeed.style.display = feedView === 'grid' ? '' : 'none';
  if (listView) listView.style.display = feedView === 'grid' ? 'none' : '';
}

export function renderFeed(): void {
  const rows = getById('feed-day-rows');
  if (!rows) return;
  const { posts, feedFilter, feedStatusFilter, feedDateRange, feedView, lang, settings } =
    getState();
  const labels = dict();

  const filtered = posts.filter(p =>
    matchesFilters(p, { platform: feedFilter, status: feedStatusFilter, range: feedDateRange }),
  );
  syncFilterCounts(posts);
  syncFeedControls();

  const grouped = groupPostsByDate(filtered);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // más reciente primero
  const today = todayInTimeZone(settings.timezone);

  setHtml(
    rows,
    dates.length === 0
      ? html`<p class="form-hint" style="padding:var(--space-6)">${labels.feed_empty ?? 'No posts.'}</p>`
      : joinHtml(
          dates.map(date => {
            const dayPosts = grouped[date] ?? [];
            const dayLabel =
              date === today ? (labels.tab_today ?? '今天') : formatDayLabel(date, lang);
            return html`<div class="day-section" id="day-${date}" data-date="${date}">
              <div class="day-section-header">
                <div class="day-section-date">
                  ${dayLabel}
                  <span class="day-badge">${dayPosts.length} ${labels.feed_posts ?? '条内容'}</span>
                </div>
              </div>
              <div class="day-scroll-wrap">
                <div class="day-scroll">${dayPosts.map(renderFeedCard)}</div>
              </div>
            </div>`;
          }),
        ),
  );

  if (feedView === 'list') renderFeedList(filtered);
}
