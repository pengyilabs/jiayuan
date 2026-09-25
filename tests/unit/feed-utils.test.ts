import { describe, expect, it } from 'vitest';
import {
  formatDayLabel,
  groupPostsByDate,
  matchesFilters,
} from '../../src/features/home/feed-utils';
import { createMemoryRepositories } from '../../src/data/repositories/memory';
import type { Post } from '../../src/types/models';

const post = (overrides: Partial<Post> = {}): Post =>
  ({
    id: 1,
    listingId: null,
    authorId: 'a',
    authorName: 'A',
    title: 'x',
    platformId: 'facebook',
    postTypeId: null,
    templateId: null,
    lang: 'English',
    description: '',
    hashtags: '',
    media: 'single',
    images: [],
    status: 'draft',
    rejectionReason: null,
    externalUrl: null,
    scheduledAt: '2026-03-18T00:00:00.000Z',
    date: '2026-03-18',
    ...overrides,
  }) as Post;

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

  describe('matchesFilters', () => {
    const noFilter = {
      platform: 'all' as const,
      status: 'all' as const,
      range: { from: null, to: null },
    };

    it('sin filtros, todo coincide', () => {
      expect(matchesFilters(post(), noFilter)).toBe(true);
    });

    it('filtra por plataforma', () => {
      expect(
        matchesFilters(post({ platformId: 'instagram' }), { ...noFilter, platform: 'facebook' }),
      ).toBe(false);
      expect(
        matchesFilters(post({ platformId: 'facebook' }), { ...noFilter, platform: 'facebook' }),
      ).toBe(true);
    });

    it('filtra por estado', () => {
      expect(matchesFilters(post({ status: 'draft' }), { ...noFilter, status: 'pending' })).toBe(
        false,
      );
      expect(matchesFilters(post({ status: 'pending' }), { ...noFilter, status: 'pending' })).toBe(
        true,
      );
    });

    it('filtra por rango de fechas (inclusive en ambos extremos)', () => {
      const range = { from: '2026-03-10', to: '2026-03-20' };
      expect(matchesFilters(post({ date: '2026-03-09' }), { ...noFilter, range })).toBe(false);
      expect(matchesFilters(post({ date: '2026-03-10' }), { ...noFilter, range })).toBe(true);
      expect(matchesFilters(post({ date: '2026-03-20' }), { ...noFilter, range })).toBe(true);
      expect(matchesFilters(post({ date: '2026-03-21' }), { ...noFilter, range })).toBe(false);
    });

    it('un solo extremo del rango también restringe', () => {
      expect(
        matchesFilters(post({ date: '2026-01-01' }), {
          ...noFilter,
          range: { from: '2026-02-01', to: null },
        }),
      ).toBe(false);
      expect(
        matchesFilters(post({ date: '2026-05-01' }), {
          ...noFilter,
          range: { from: null, to: '2026-02-01' },
        }),
      ).toBe(false);
    });

    it('combina los tres filtros a la vez', () => {
      const filters = {
        platform: 'facebook' as const,
        status: 'pending' as const,
        range: { from: '2026-03-01', to: '2026-03-31' },
      };
      expect(
        matchesFilters(
          post({ platformId: 'facebook', status: 'pending', date: '2026-03-15' }),
          filters,
        ),
      ).toBe(true);
      expect(
        matchesFilters(
          post({ platformId: 'facebook', status: 'draft', date: '2026-03-15' }),
          filters,
        ),
      ).toBe(false);
    });
  });
});
