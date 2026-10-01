/**
 * Home móvil de agente (F10): el mismo feed de siempre (Post real, RLS ya limita a los propios),
 * mostrado con el layout del diseño adjunto. Solo se activa en móvil para el rol `employee`
 * (CSS, ver `mobile-agent-feed.css`); admin y tablet/PC siguen con el calendario + feed de F6/F7.
 */
import { registerActions } from '../../app/actions';
import { navigate } from '../../app/router';
import { getState, setState, store } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import { t } from '../../i18n';
import type { Lang } from '../../types/models';
import { formatDayLabel, groupPostsByDate } from '../home/feed-utils';
import { initMobileCarousels, renderMobileFeedCard } from './mobile-feed-cards';
import { initMobileCreateSheet } from './mobile-create-sheet';

const LANG_ORDER: readonly Lang[] = ['zh', 'en', 'fr', 'es'];
const LANG_SHORT: Readonly<Record<Lang, string>> = { zh: '简体', en: 'EN', fr: 'FR', es: 'ES' };

function renderFeed(): void {
  const feed = getById('m-feed');
  if (!feed) return;
  const { posts, lang } = getState();
  const grouped = groupPostsByDate(posts);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  setHtml(
    feed,
    dates.length === 0
      ? html`<div class="m-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <p>${t('feed_empty')}</p>
        </div>`
      : joinHtml(
          dates.map(date => {
            const dayPosts = grouped[date] ?? [];
            return html`<div class="m-date-group">
                <div class="m-date-group-label">
                  ${formatDayLabel(date, lang)}
                  <span class="m-date-group-count">${dayPosts.length} ${t('feed_posts')}</span>
                </div>
              </div>
              ${joinHtml(dayPosts.map(renderMobileFeedCard))}`;
          }),
        ),
  );
  initMobileCarousels(feed);
}

function renderLangButton(): void {
  const btn = getById('m-lang-cycle');
  if (btn) btn.textContent = LANG_SHORT[getState().lang];
}

export function initMobileAgentFeed(): void {
  registerActions({
    'mobile-feed:cycle-lang': () => {
      const idx = LANG_ORDER.indexOf(getState().lang);
      setState({ lang: LANG_ORDER[(idx + 1) % LANG_ORDER.length] ?? 'en' });
    },
    'mobile-feed:tab': el => {
      if (el.dataset.tab === 'listings') navigate('listings');
      // "feed" ya es la pantalla actual: no hay nada que navegar.
    },
    'mobile-feed:search': () => {
      navigate('listings');
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('.topbar-search input')?.focus();
      });
    },
    'mobile-feed:like': el => {
      const btn = el as HTMLButtonElement;
      const liked = btn.classList.toggle('m-liked');
      btn.textContent = liked ? t('m_feed_liked', '❤ Liked') : t('m_feed_like', '👍 Like');
    },
  });

  store.watch(s => s.posts, renderFeed);
  store.watch(s => s.templates, renderFeed);
  store.watch(
    s => s.lang,
    () => {
      renderFeed();
      renderLangButton();
    },
  );
  renderFeed();
  renderLangButton();
  initMobileCreateSheet();
}
