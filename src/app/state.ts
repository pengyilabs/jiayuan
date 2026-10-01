import { EMPTY_SNAPSHOT } from '../data/snapshot';
import type { DataSnapshot } from '../data/snapshot';
import { todayLocalISO } from '../core/dates';
import type { Lang, PageId, PlatformId } from '../types/models';
import { createStore } from './store';

export type FeedFilter = 'all' | PlatformId;
export type FeedView = 'grid' | 'list';
export type ListingsView = 'table' | 'grid';
export type FeedStatusFilter = 'all' | 'pending' | 'approved';
export type CalendarMode = 'month' | 'week' | 'agenda';

/** `YYYY-MM-DD` locales, o `null` = sin límite por ese lado. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface AppState extends DataSnapshot {
  lang: Lang;
  page: PageId;
  feedFilter: FeedFilter;
  feedView: FeedView;
  /** Solo admin (F6): filtrar por estado, reforzado por RLS (RLS ya limita qué posts llegan). */
  feedStatusFilter: FeedStatusFilter;
  feedDateRange: DateRange;
  calendarMode: CalendarMode;
  /** Día de referencia que el calendario muestra (mes/semana que lo contienen). */
  calendarAnchor: string;
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
  feedStatusFilter: 'all',
  feedDateRange: { from: null, to: null },
  calendarMode: 'month',
  calendarAnchor: todayLocalISO(),
  listingsView: 'table',
  previewTemplateId: null,
});

export const getState = (): AppState => store.getState();
export const setState: typeof store.setState = patch => {
  store.setState(patch);
};
