import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  monthGrid,
  parseLocalDate,
  startOfMonth,
  startOfWeek,
  toDateInTimeZone,
  toLocalISODate,
  todayInTimeZone,
  todayLocalISO,
  utcIsoToZonedInputValue,
  weekDays,
  zonedTimeToUtcIso,
} from '../../src/core/dates';

describe('dates', () => {
  it('parseLocalDate devuelve la fecha local sin desfase de zona horaria', () => {
    const d = parseLocalDate('2026-08-22');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 7, 22]);
  });

  it('toLocalISODate usa el día local, no el UTC', () => {
    // 23:30 hora local: en zonas al oeste de UTC, toISOString() ya sería el día siguiente.
    expect(toLocalISODate(new Date(2026, 7, 22, 23, 30))).toBe('2026-08-22');
    expect(toLocalISODate(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('todayLocalISO acepta una fecha inyectada', () => {
    expect(todayLocalISO(new Date(2026, 8, 21, 12))).toBe('2026-09-21');
  });

  it('toDateInTimeZone usa la zona indicada, no UTC', () => {
    const instant = '2026-08-23T02:30:00Z';
    expect(toDateInTimeZone(instant, 'America/Toronto')).toBe('2026-08-22');
    expect(toDateInTimeZone(instant, 'Asia/Shanghai')).toBe('2026-08-23');
    expect(todayInTimeZone('America/Toronto', new Date('2026-01-01T03:00:00Z'))).toBe('2025-12-31');
  });

  it('zonedTimeToUtcIso convierte una hora de pared de una zona horaria a UTC', () => {
    // Toronto en octubre está en EDT (UTC-4): 14:30 local = 18:30 UTC.
    expect(zonedTimeToUtcIso('2026-10-05T14:30', 'America/Toronto')).toBe(
      '2026-10-05T18:30:00.000Z',
    );
    // Shanghái no tiene horario de verano (UTC+8): 09:00 local = 01:00 UTC.
    expect(zonedTimeToUtcIso('2026-10-05T09:00', 'Asia/Shanghai')).toBe('2026-10-05T01:00:00.000Z');
  });

  it('utcIsoToZonedInputValue es la inversa de zonedTimeToUtcIso', () => {
    const iso = zonedTimeToUtcIso('2026-10-05T14:30', 'America/Toronto');
    expect(utcIsoToZonedInputValue(iso, 'America/Toronto')).toBe('2026-10-05T14:30');
    expect(utcIsoToZonedInputValue('2026-10-05T01:00:00.000Z', 'Asia/Shanghai')).toBe(
      '2026-10-05T09:00',
    );
  });

  it('ida y vuelta a través del cambio de horario de verano', () => {
    // Toronto pasa a horario de invierno (EST, UTC-5) el primer domingo de noviembre.
    const winter = zonedTimeToUtcIso('2026-11-05T09:00', 'America/Toronto');
    expect(winter).toBe('2026-11-05T14:00:00.000Z');
    expect(utcIsoToZonedInputValue(winter, 'America/Toronto')).toBe('2026-11-05T09:00');
  });

  it('addDays / addMonths avanzan y retroceden en fechas locales', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 1)).toBe('2026-03-03'); // el desbordamiento de JS Date es esperado
    expect(addMonths('2026-03-15', -2)).toBe('2026-01-15');
  });

  it('startOfWeek / startOfMonth', () => {
    expect(startOfWeek('2026-03-18')).toBe('2026-03-15'); // miércoles → domingo anterior
    expect(startOfWeek('2026-03-15')).toBe('2026-03-15'); // ya es domingo
    expect(startOfMonth('2026-03-18')).toBe('2026-03-01');
  });

  it('monthGrid cubre el mes completo en 42 días empezando en domingo', () => {
    const grid = monthGrid('2026-03-18');
    expect(grid).toHaveLength(42);
    expect(parseLocalDate(grid[0] ?? '').getDay()).toBe(0);
    expect(grid).toContain('2026-03-01');
    expect(grid).toContain('2026-03-31');
  });

  it('weekDays devuelve los 7 días de domingo a sábado', () => {
    const week = weekDays('2026-03-18');
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-03-15');
    expect(week[6]).toBe('2026-03-21');
  });
});
