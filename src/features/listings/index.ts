import { registerActions } from '../../app/actions';
import { setState, store } from '../../app/state';
import type { ListingsView } from '../../app/state';
import { initCardCarousel } from './card-carousel';
import { initDetailGallery } from './detail-gallery';
import { initListingModal } from './listing-modal';
import { renderListings } from './listings-view';

export function initListings(): void {
  registerActions({
    'listings:view': el => {
      setState({ listingsView: el.dataset.view as ListingsView });
    },
  });

  initCardCarousel();
  initDetailGallery();
  initListingModal();

  store.watch(s => s.lang, renderListings);
  store.watch(s => s.listings, renderListings);
  store.watch(s => s.listingsView, renderListings);
  renderListings();
}
