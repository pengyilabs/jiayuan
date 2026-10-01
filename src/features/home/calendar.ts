/** Calendario de Home (F6): mes / semana / agenda, por `scheduled_at`. Clic en un día filtra el feed. */
import { getState, setState } from '../../app/state';
import type { CalendarMode } from '../../app/state';
import { getById } from '../../core/dom';
import {
  addDays,
  addMonths,
  monthGrid,
  parseLocalDate,
  todayInTimeZone,
  weekDays,
} from '../../core/dates';
import { html, joinHtml, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { t } from '../../i18n';
import { MONTHS_SHORT, WEEKDAYS_SHORT } from '../../i18n/calendar';
import type { Post } from '../../types/models';
import { formatDayLabel, groupPostsByDate, matchesFilters } from './feed-utils';

/** Posts que cumplen plataforma+estado (no el rango de fechas: el calendario decide eso). */
function postsForCalendar(): Post[] {
  const { posts, feedFilter, feedStatusFilter } = getState();
  return posts.filter(p =>
    matchesFilters(p, {
      platform: feedFilter,
      status: feedStatusFilter,
      range: { from: null, to: null },
    }),
  );
}

function monthLabel(anchor: string): string {
  const dt = parseLocalDate(anchor);
  const lang = getState().lang;
  return lang === 'zh'
    ? `${String(dt.getFullYear())}年${MONTHS_SHORT.zh[dt.getMonth()] ?? ''}`
    : `${MONTHS_SHORT[lang][dt.getMonth()] ?? ''} ${String(dt.getFullYear())}`;
}

function dayCell(
  date: string,
  count: number,
  opts: { muted?: boolean; compact?: boolean } = {},
): SafeHtml {
  const { settings, feedDateRange } = getState();
  const isToday = date === todayInTimeZone(settings.timezone);
  const isSelected = feedDateRange.from === date && feedDateRange.to === date;
  const dt = parseLocalDate(date);
  const classes = [
    'cal-day',
    opts.muted ? 'muted' : '',
    isToday ? 'today' : '',
    isSelected ? 'selected' : '',
    count > 0 ? 'has-posts' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return html`<button type="button" class="${classes}" data-action="calendar:pick-day" data-date="${date}">
    <span class="cal-day-num">${dt.getDate()}</span>
    ${count > 0 ? html`<span class="cal-day-count">${count}</span>` : ''}
  </button>`;
}

function renderMonth(container: HTMLElement): void {
  const { calendarAnchor, lang } = getState();
  const grid = monthGrid(calendarAnchor);
  const grouped = groupPostsByDate(postsForCalendar());
  const currentMonth = parseLocalDate(calendarAnchor).getMonth();

  setHtml(
    container,
    html`<div class="cal-weekday-row">
        ${WEEKDAYS_SHORT[lang].map(w => html`<span>${w}</span>`)}
      </div>
      <div class="cal-month-grid">
        ${joinHtml(
          grid.map(date =>
            dayCell(date, grouped[date]?.length ?? 0, {
              muted: parseLocalDate(date).getMonth() !== currentMonth,
            }),
          ),
        )}
      </div>`,
  );
}

function renderWeek(container: HTMLElement): void {
  const { calendarAnchor, lang, settings } = getState();
  const days = weekDays(calendarAnchor);
  const grouped = groupPostsByDate(postsForCalendar());
  const today = todayInTimeZone(settings.timezone);
  const { feedDateRange } = getState();

  // Lista vertical (una columna), no una cuadrícula de 7 columnas: a 320px de ancho (el panel
  // en modo semana/agenda, F8.1) siete columnas quedaban recortadas. Una fila por día, con
  // hasta 2 títulos y ancho completo, es legible sin importar cuán angosto sea el panel.
  setHtml(
    container,
    html`<div class="cal-week-list">
      ${joinHtml(
        days.map(date => {
          const dayPosts = grouped[date] ?? [];
          const active = feedDateRange.from === date && feedDateRange.to === date;
          const classes = [
            'cal-week-row-item',
            date === today ? 'today' : '',
            active ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return html`<button type="button" class="${classes}" data-action="calendar:pick-day" data-date="${date}">
            <div class="cal-week-row-date">
              <span class="cal-week-row-weekday">${formatDayLabel(date, lang).split(' · ')[0]}</span>
              <span class="cal-week-row-num">${parseLocalDate(date).getDate()}</span>
            </div>
            <div class="cal-week-row-posts">
              ${
                dayPosts.length === 0
                  ? html`<span class="cal-week-row-empty">${t('calendar_agenda_empty')}</span>`
                  : joinHtml(
                      dayPosts
                        .slice(0, 2)
                        .map(p => html`<div class="cal-week-post">${p.title}</div>`),
                    )
              }
              ${
                dayPosts.length > 2
                  ? html`<div class="cal-week-more">+${dayPosts.length - 2}</div>`
                  : ''
              }
            </div>
          </button>`;
        }),
      )}
    </div>`,
  );
}

function renderAgenda(container: HTMLElement): void {
  const { lang, settings } = getState();
  const today = todayInTimeZone(settings.timezone);
  const grouped = groupPostsByDate(postsForCalendar());
  const dates = Object.keys(grouped).sort();
  const upcoming = dates.filter(d => d >= today).slice(0, 30);
  const list = upcoming.length > 0 ? upcoming : dates.slice(-14);

  setHtml(
    container,
    list.length === 0
      ? html`<p class="form-hint">${t('calendar_agenda_empty')}</p>`
      : html`<div class="cal-agenda">
          ${joinHtml(
            list.map(date => {
              const count = grouped[date]?.length ?? 0;
              const { feedDateRange } = getState();
              const active = feedDateRange.from === date && feedDateRange.to === date;
              return html`<button
                type="button"
                class="cal-agenda-row ${active ? 'selected' : ''}"
                data-action="calendar:pick-day"
                data-date="${date}"
              >
                <span class="cal-agenda-date">${formatDayLabel(date, lang)}</span>
                <span class="badge badge-neutral">${count}</span>
              </button>`;
            }),
          )}
        </div>`,
  );
}

export function renderCalendar(): void {
  const panel = getById('home-calendar');
  if (!panel) return;
  const { calendarMode, calendarAnchor, feedDateRange, currentUser } = getState();

  // Rediseño F8.1: el panel es más ancho en modo mes (necesita 7 columnas legibles) que en
  // semana/agenda (una lista angosta le basta), y vive a la izquierda del feed en PC (CSS).
  getById('home-layout')?.classList.toggle('calendar-wide', calendarMode === 'month');

  panel.querySelectorAll<HTMLElement>('[data-action="calendar:mode"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === calendarMode);
  });
  const label = getById('calendar-label');
  if (label) {
    label.textContent =
      calendarMode === 'agenda' ? t('calendar_upcoming') : monthLabel(calendarAnchor);
  }
  const nav = getById('calendar-nav-controls');
  if (nav) nav.style.visibility = calendarMode === 'agenda' ? 'hidden' : 'visible';

  const body = getById('calendar-body');
  if (body) {
    if (calendarMode === 'month') renderMonth(body);
    else if (calendarMode === 'week') renderWeek(body);
    else renderAgenda(body);
  }

  const clearBtn = getById('calendar-clear');
  if (clearBtn) clearBtn.hidden = feedDateRange.from === null;

  const statusPanel = getById('feed-status-filters');
  if (statusPanel) statusPanel.hidden = currentUser?.role !== 'admin';
}

export function setCalendarMode(mode: CalendarMode): void {
  setState({ calendarMode: mode });
}

export function navigateCalendar(direction: number): void {
  const { calendarMode, calendarAnchor } = getState();
  const anchor =
    calendarMode === 'month'
      ? addMonths(calendarAnchor, direction)
      : addDays(calendarAnchor, direction * 7);
  setState({ calendarAnchor: anchor });
}

export function goToToday(): void {
  setState({ calendarAnchor: todayInTimeZone(getState().settings.timezone) });
}

/** Clic en un día: lo selecciona como filtro (from=to=ese día), o lo deselecciona si ya lo estaba. */
export function pickDay(date: string): void {
  const { feedDateRange } = getState();
  const alreadySelected = feedDateRange.from === date && feedDateRange.to === date;
  setState({
    feedDateRange: alreadySelected ? { from: null, to: null } : { from: date, to: date },
  });
}

export function clearDateFilter(): void {
  setState({ feedDateRange: { from: null, to: null } });
}
