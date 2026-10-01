import { parseLocalDate } from '../../core/dates';
import { MONTHS_SHORT, WEEKDAYS_SHORT } from '../../i18n/calendar';
import type { DateRange, FeedFilter, FeedStatusFilter } from '../../app/state';
import type { Lang, Post } from '../../types/models';

export const FALLBACK_IMAGE = 'images/listings/condo1.jpg';

export interface FeedFilters {
  platform: FeedFilter;
  status: FeedStatusFilter;
  range: DateRange;
}

/** `true` si `post` cumple los tres filtros a la vez (plataforma, estado, rango de fechas). */
export function matchesFilters(post: Post, filters: FeedFilters): boolean {
  if (filters.platform !== 'all' && post.platformId !== filters.platform) return false;
  if (filters.status !== 'all' && post.status !== filters.status) return false;
  if (filters.range.from && post.date < filters.range.from) return false;
  if (filters.range.to && post.date > filters.range.to) return false;
  return true;
}

/** Agrupa posts por día (`YYYY-MM-DD`) conservando el orden de entrada dentro de cada día. */
export function groupPostsByDate(posts: readonly Post[]): Record<string, Post[]> {
  const grouped: Record<string, Post[]> = {};
  for (const post of posts) {
    (grouped[post.date] ??= []).push(post);
  }
  return grouped;
}

/** Etiqueta de día: `Mon · Aug 22` / `一 · 8月22日`. */
export function formatDayLabel(date: string, lang: Lang): string {
  const dt = parseLocalDate(date);
  const weekday = WEEKDAYS_SHORT[lang][dt.getDay()] ?? '';
  const month = MONTHS_SHORT[lang][dt.getMonth()] ?? '';
  const day = dt.getDate();
  return lang === 'zh'
    ? `${weekday} · ${month}${String(day)}日`
    : `${weekday} · ${month} ${String(day)}`;
}
