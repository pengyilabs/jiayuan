import { EMPTY_SNAPSHOT } from '../data/snapshot';
import type { DataSnapshot } from '../data/snapshot';
import type { Lang, PageId, PlatformId } from '../types/models';
import { createStore } from './store';

export type FeedFilter = 'all' | PlatformId;
export type FeedView = 'grid' | 'list';
export type ListingsView = 'table' | 'grid';

export interface AppState extends DataSnapshot {
  lang: Lang;
  page: PageId;
  feedFilter: FeedFilter;
  feedView: FeedView;
  listingsView: ListingsView;
  /** Template abierto en el modal de vista previa. */
  previewTemplateId: number | null;
}

export const DEFAULT_LANG: Lang = 'en';

export const store = createStore<AppState>({
  ...EMPTY_SNAPSHOT,
  lang: DEFAULT_LANG,
  page: 'dashboard',
  feedFilter: 'all',
  feedView: 'grid',
  listingsView: 'table',
  previewTemplateId: null,
});

export const getState = (): AppState => store.getState();
export const setState: typeof store.setState = patch => {
  store.setState(patch);
};
