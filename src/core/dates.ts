/** Fechas de calendario (`YYYY-MM-DD`) tratadas siempre en hora local. */

export function parseLocalDate(value: string): Date {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Formatea en hora local. `Date.toISOString()` usa UTC y devuelve el día equivocado de noche. */
export function toLocalISODate(date: Date): string {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayLocalISO(now: Date = new Date()): string {
  return toLocalISODate(now);
}

/** Día `YYYY-MM-DD` de un instante en una zona horaria IANA (p. ej. `America/Toronto`). */
export function toDateInTimeZone(value: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const pick = (type: string): string => parts.find(part => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return toDateInTimeZone(now, timeZone);
}

// ── Cuadrículas de calendario (F6): puras, en hora local, domingo primero ─────────────────────

export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

export function addMonths(dateStr: string, months: number): string {
  const d = parseLocalDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return toLocalISODate(d);
}

/** El domingo de la semana que contiene `dateStr`. */
export function startOfWeek(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return toLocalISODate(d);
}

/** El día 1 del mes que contiene `dateStr`. */
export function startOfMonth(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** 42 días (6 semanas) que cubren el mes de `dateStr` por completo, empezando en domingo. */
export function monthGrid(dateStr: string): string[] {
  const first = startOfWeek(startOfMonth(dateStr));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** Los 7 días (domingo a sábado) de la semana que contiene `dateStr`. */
export function weekDays(dateStr: string): string[] {
  const first = startOfWeek(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Desfase (en minutos, este del meridiano positivo) de una zona horaria en un instante dado. */
function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const pick = (type: string): number => Number(parts.find(p => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour'),
    pick('minute'),
    pick('second'),
  );
  return (asUtc - date.getTime()) / 60000;
}

/**
 * Convierte una hora de pared en una zona horaria (p. ej. el valor de un
 * `<input type="datetime-local">`, `"2026-10-05T14:30"`) al instante UTC correspondiente.
 */
export function zonedTimeToUtcIso(localDateTime: string, timeZone: string): string {
  const guess = new Date(`${localDateTime}:00.000Z`);
  const offset = timeZoneOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offset * 60000).toISOString();
}

/** Convierte un instante UTC al valor que debe mostrar un `<input type="datetime-local">`. */
export function utcIsoToZonedInputValue(isoUtc: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(isoUtc));
  const pick = (type: string): string => parts.find(p => p.type === type)?.value ?? '00';
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}`;
}
