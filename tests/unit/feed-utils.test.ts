import { describe, expect, it } from 'vitest';
import { formatDayLabel, groupPostsByDate } from '../../src/features/home/feed-utils';
import { createMemoryRepositories } from '../../src/data/repositories/memory';

describe('feed-utils', () => {
  it('agrupa los posts por día conservando el total', async () => {
    const posts = await createMemoryRepositories().posts.list();
    const grouped = groupPostsByDate(posts);
    const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(posts.length);
    expect(Object.keys(grouped)).toContain('2026-08-22');
  });

  it('formatDayLabel respeta el formato de cada idioma', () => {
    expect(formatDayLabel('2026-08-22', 'en')).toBe('Sat · Aug 22');
    expect(formatDayLabel('2026-08-22', 'zh')).toBe('六 · 8月22日');
    expect(formatDayLabel('2026-08-22', 'fr')).toBe('Sam · août 22');
  });
});
