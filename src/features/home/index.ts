import { registerActions } from '../../app/actions';
import { setState, store } from '../../app/state';
import type { FeedFilter, FeedView } from '../../app/state';
import { initFeedCarousel } from './feed-carousel';
import { renderFeed, scrollDayRow, scrollToDay } from './feed';

export function initHome(): void {
  registerActions({
    'feed:filter': el => {
      setState({ feedFilter: el.dataset.platform as FeedFilter });
    },
    'feed:view': el => {
      setState({ feedView: el.dataset.view as FeedView });
    },
    'feed:scroll-day': el => {
      if (el.dataset.date) scrollToDay(el.dataset.date);
    },
    'feed:scroll-row': el => {
      scrollDayRow(el, Number(el.dataset.dir));
    },
  });

  initFeedCarousel();

  store.watch(s => s.lang, renderFeed);
  store.watch(s => s.posts, renderFeed);
  store.watch(s => s.feedFilter, renderFeed);
  store.watch(s => s.feedView, renderFeed);
  renderFeed();
}
