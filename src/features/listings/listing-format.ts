import { getDictionary, localize, t } from '../../i18n';
import type { Lang, Listing, ListingStatus } from '../../types/models';

export const STATUS_BADGE: Readonly<Record<ListingStatus, string>> = {
  for_sale: 'badge-success',
  sold: 'badge-neutral',
  for_rent: 'badge-accent',
  rented: 'badge-warn',
  off: 'badge-danger',
};

export const FALLBACK_PHOTO = 'images/listings/condo1.jpg';

export function listingTitle(listing: Listing, lang: Lang): string {
  return localize(listing.title, lang);
}

export function listingType(listing: Listing, lang: Lang): string {
  return getDictionary(lang)[`type_${listing.propertyType}`] ?? listing.propertyType;
}

export function listingDescription(listing: Listing, lang: Lang): string {
  return localize(listing.description, lang);
}

/** Ej.: `3bd 2ba` / `3卧 2卫`. */
export function bedBathLabel(listing: Listing): string {
  return `${String(listing.beds)}${t('unit_bed')} ${String(listing.baths)}${t('unit_bath')}`;
}

export interface MediaItem {
  type: 'video' | 'img';
  src: string;
}

/** Vídeo (si existe) seguido de las fotos. */
export function listingMedia(listing: Listing): MediaItem[] {
  const photos = listing.photos.map((src): MediaItem => ({ type: 'img', src }));
  return listing.video ? [{ type: 'video', src: listing.video }, ...photos] : photos;
}
