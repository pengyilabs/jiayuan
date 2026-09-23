import { parseLocalDate } from '../../core/dates';
import { MONTHS_SHORT, WEEKDAYS_SHORT } from '../../i18n/calendar';
import type { Lang, Post } from '../../types/models';

export const FALLBACK_IMAGE = 'images/listings/condo1.jpg';

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
