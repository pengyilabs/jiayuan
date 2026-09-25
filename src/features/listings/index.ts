import { registerActions } from '../../app/actions';
import { onBreakpointChange } from '../../app/responsive';
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

  // En móvil la tabla no cabe: se fuerza la vista de tarjetas (F7). Al volver a tablet/PC se
  // respeta de nuevo lo que la persona haya elegido (por defecto, la tabla).
  onBreakpointChange(breakpoint => {
    if (breakpoint === 'mobile') setState({ listingsView: 'grid' });
  });
}
