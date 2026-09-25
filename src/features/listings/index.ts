import { registerActions } from '../../app/actions';
import { onBreakpointChange } from '../../app/responsive';
import { setState, store } from '../../app/state';
import type { ListingsView } from '../../app/state';
import { qsa } from '../../core/dom';
import { initCardCarousel } from './card-carousel';
import { initDetailGallery } from './detail-gallery';
import { initListingModal } from './listing-modal';
import { renderListings, syncListingFilters } from './listings-view';

export function initListings(): void {
  registerActions({
    'listings:view': el => {
      setState({ listingsView: el.dataset.view as ListingsView });
    },
    'listing:filter-status': el => {
      syncListingFilters({ status: el.dataset.status ?? 'all' });
    },
    'listing:filter-type': el => {
      syncListingFilters({ type: el.dataset.type ?? 'all' });
    },
    'listing:filter-price': el => {
      syncListingFilters({ price: el.dataset.price ?? 'all' });
    },
  });

  // El buscador del encabezado (duplicado en el topbar y en el de Home, F8.1) filtra las
  // propiedades por título/dirección/Centris; solo tiene efecto visible en Listings.
  qsa<HTMLInputElement>('.topbar-search input').forEach(input => {
    input.addEventListener('input', () => {
      syncListingFilters({ search: input.value });
    });
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
