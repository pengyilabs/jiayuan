import { registerActions } from '../../app/actions';
import { onBreakpointChange } from '../../app/responsive';
import { setState, store } from '../../app/state';
import type { FeedFilter, FeedStatusFilter, FeedView } from '../../app/state';
import { goToToday, navigateCalendar, pickDay, renderCalendar, setCalendarMode } from './calendar';
import type { CalendarMode } from '../../app/state';
import { initFeedCarousel } from './feed-carousel';
import { renderFeed } from './feed';
import { restoreFiltersFromUrl, syncFiltersToUrl } from './filters-url';
import { renderStats } from './stats';

export function initHome(): void {
  registerActions({
    'feed:filter': el => {
      setState({ feedFilter: (el.dataset.platform ?? 'all') as FeedFilter });
    },
    'feed:status-filter': el => {
      setState({ feedStatusFilter: (el.dataset.status ?? 'all') as FeedStatusFilter });
    },
    'feed:view': el => {
      setState({ feedView: el.dataset.view as FeedView });
    },
    'calendar:mode': el => {
      setCalendarMode(el.dataset.mode as CalendarMode);
    },
    'calendar:nav': el => {
      navigateCalendar(Number(el.dataset.dir));
    },
    'calendar:today': () => {
      goToToday();
    },
    'calendar:pick-day': el => {
      if (el.dataset.date) pickDay(el.dataset.date);
    },
    'calendar:clear-date': () => {
      setState({ feedDateRange: { from: null, to: null } });
    },
  });

  initFeedCarousel();
  restoreFiltersFromUrl();

  store.watch(s => s.lang, renderFeed);
  store.watch(s => s.posts, renderFeed);
  store.watch(s => s.feedFilter, renderFeed);
  store.watch(s => s.feedView, renderFeed);
  store.watch(s => s.feedStatusFilter, renderFeed);
  store.watch(s => s.feedDateRange, renderFeed);

  store.watch(s => s.lang, renderCalendar);
  store.watch(s => s.posts, renderCalendar);
  store.watch(s => s.feedFilter, renderCalendar);
  store.watch(s => s.feedStatusFilter, renderCalendar);
  store.watch(s => s.feedDateRange, renderCalendar);
  store.watch(s => s.calendarMode, renderCalendar);
  store.watch(s => s.calendarAnchor, renderCalendar);
  store.watch(s => s.currentUser, renderCalendar);

  store.watch(s => s.feedFilter, syncFiltersToUrl);
  store.watch(s => s.feedStatusFilter, syncFiltersToUrl);
  store.watch(s => s.feedDateRange, syncFiltersToUrl);
  store.watch(s => s.feedView, syncFiltersToUrl);

  renderFeed();
  renderCalendar();
  renderStats();
  store.watch(s => s.posts, renderStats);

  // El calendario se ajusta al tamaño (F7): agenda en móvil, semanal en tablet. En PC se deja
  // el modo que la persona haya elegido (por defecto, mensual).
  onBreakpointChange(breakpoint => {
    if (breakpoint === 'mobile') setCalendarMode('agenda');
    else if (breakpoint === 'tablet') setCalendarMode('week');
  });
}
