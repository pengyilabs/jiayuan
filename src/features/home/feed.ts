/** Feed principal de Home: rail de fechas + secciones por día + tarjetas. */
import { getState } from '../../app/state';
import { getById, qsa } from '../../core/dom';
import { parseLocalDate, todayInTimeZone } from '../../core/dates';
import { html, joinHtml, setHtml } from '../../core/html';
import { dict } from '../../i18n';
import { WEEKDAYS_SHORT } from '../../i18n/calendar';
import type { Post } from '../../types/models';
import { renderFeedCard } from './feed-cards';
import { renderFeedList } from './feed-list';
import { formatDayLabel, groupPostsByDate } from './feed-utils';

let dayObserver: IntersectionObserver | null = null;

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
  const { feedFilter, feedView } = getState();
  qsa('.feed-filter').forEach(button => {
    button.classList.toggle('active', button.dataset.platform === feedFilter);
  });
  qsa('.feed-view-toggle .view-toggle-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.view === feedView);
  });
  const socialFeed = getById('social-feed');
  const listView = getById('feed-list-view');
  if (socialFeed) socialFeed.style.display = feedView === 'grid' ? '' : 'none';
  if (listView) listView.style.display = feedView === 'grid' ? 'none' : '';
}

export function setActiveDay(date: string): void {
  qsa('.date-rail-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.date === date);
  });
}

export function scrollToDay(date: string): void {
  const section = getById(`day-${date}`);
  const container = getById('content');
  if (section && container) {
    container.scrollTo({ top: section.offsetTop - container.offsetTop - 8, behavior: 'smooth' });
  }
  setActiveDay(date);
}

export function scrollDayRow(button: HTMLElement, direction: number): void {
  const row = button.closest('.day-scroll-wrap')?.querySelector('.day-scroll');
  const CARD_WIDTH = 336; // 320 de tarjeta + 16 de separación
  row?.scrollBy({ left: direction * CARD_WIDTH * 2, behavior: 'smooth' });
}

/** Marca en el rail el día visible mientras se hace scroll. */
function observeDays(): void {
  dayObserver?.disconnect();
  const container = getById('content');
  if (!container || typeof IntersectionObserver === 'undefined') return;
  const sections = qsa('.day-section', container);
  if (sections.length === 0) return;

  dayObserver = new IntersectionObserver(
    entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      const date = (visible?.target as HTMLElement | undefined)?.dataset.date;
      if (date) setActiveDay(date);
    },
    { root: container, threshold: 0.3 },
  );
  sections.forEach(section => dayObserver?.observe(section));
}

export function renderFeed(): void {
  const rows = getById('feed-day-rows');
  if (!rows) return;
  const rail = getById('date-rail');
  const { posts, feedFilter, feedView, lang } = getState();
  const labels = dict();

  const filtered = feedFilter === 'all' ? posts : posts.filter(p => p.platformId === feedFilter);
  syncFilterCounts(posts);
  syncFeedControls();

  const grouped = groupPostsByDate(filtered);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // más reciente primero
  const today = todayInTimeZone(getState().settings.timezone);

  if (rail) {
    setHtml(
      rail,
      joinHtml(
        dates.map(date => {
          const dt = parseLocalDate(date);
          return html`<button
            class="date-rail-pill${date === today ? ' active' : ''} has-posts"
            data-date="${date}"
            data-action="feed:scroll-day"
          >
            <span class="dr-weekday">${WEEKDAYS_SHORT[lang][dt.getDay()]}</span>
            <span class="dr-day">${dt.getDate()}</span>
            <span class="dr-dot"></span>
          </button>`;
        }),
      ),
    );
  }

  setHtml(
    rows,
    joinHtml(
      dates.map(date => {
        const dayPosts = grouped[date] ?? [];
        const dayLabel = date === today ? (labels.tab_today ?? '今天') : formatDayLabel(date, lang);
        return html`<div class="day-section" id="day-${date}" data-date="${date}">
          <div class="day-section-header">
            <div class="day-section-date">
              ${dayLabel}
              <span class="day-badge">${dayPosts.length} ${labels.feed_posts ?? '条内容'}</span>
            </div>
          </div>
          <div class="day-scroll-wrap">
            <button
              class="day-scroll-btn prev"
              data-action="feed:scroll-row"
              data-dir="-1"
              aria-label="Scroll left"
            >
              <svg viewBox="0 0 24 24"><polyline points="15,4 9,12 15,20" /></svg>
            </button>
            <div class="day-scroll">${dayPosts.map(renderFeedCard)}</div>
            <button
              class="day-scroll-btn next"
              data-action="feed:scroll-row"
              data-dir="1"
              aria-label="Scroll right"
            >
              <svg viewBox="0 0 24 24"><polyline points="9,4 15,12 9,20" /></svg>
            </button>
          </div>
        </div>`;
      }),
    ),
  );

  observeDays();
  if (feedView === 'list') renderFeedList(filtered);
}
