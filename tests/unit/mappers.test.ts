import { describe, expect, it } from 'vitest';
import {
  listingPatchToUpdate,
  postDraftToInsert,
  postDraftToUpdate,
  toListing,
  toLocalized,
  toPost,
} from '../../src/data/mappers';
import { formatArea, formatPrice, parseNumber } from '../../src/data/format';
import type { Tables } from '../../src/types/db';

const postRow = (overrides: Partial<Tables<'posts'>> = {}): Tables<'posts'> => ({
  id: 1,
  listing_id: null,
  author_id: 'u1',
  platform_id: 'facebook',
  post_type_id: null,
  template_id: null,
  format: 'single',
  lang: 'bilingual',
  title: 'Título',
  body: 'Cuerpo',
  hashtags: '#a',
  price: null,
  beds: null,
  baths: null,
  status: 'draft',
  scheduled_at: '2026-08-22T13:00:00+00:00',
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  published_at: null,
  external_url: null,
  deleted_at: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  ...overrides,
});

describe('mappers', () => {
  it('toLocalized ignora valores que no son texto o idiomas desconocidos', () => {
    expect(toLocalized({ zh: '中', en: 5, de: 'x', fr: 'fr' })).toEqual({ zh: '中', fr: 'fr' });
    expect(toLocalized(null)).toEqual({});
    expect(toLocalized(['a'])).toEqual({});
  });

  it('toPost calcula el día en la zona horaria de la organización, no en UTC', () => {
    const late = postRow({ scheduled_at: '2026-08-23T02:30:00+00:00' }); // 22:30 del 22 en Toronto
    const post = toPost(late, { media: [], authorName: 'A', timeZone: 'America/Toronto' });
    expect(post.date).toBe('2026-08-22');
    expect(toPost(late, { media: [], authorName: 'A', timeZone: 'Asia/Shanghai' }).date).toBe(
      '2026-08-23',
    );
  });

  it('toPost formatea el precio y traduce el idioma del contenido', () => {
    const post = toPost(postRow({ price: 850000, beds: 3, baths: 2, lang: 'zh' }), {
      media: [
        { path: 'b.jpg', kind: 'image', position: 1 },
        { path: 'a.jpg', kind: 'image', position: 0 },
      ],
      authorName: 'A',
      timeZone: 'America/Toronto',
    });
    expect(post).toMatchObject({
      price: '$850,000',
      beds: 3,
      lang: '中文',
      images: ['a.jpg', 'b.jpg'],
    });
    expect(toPost(postRow(), { media: [], authorName: '', timeZone: 'UTC' }).price).toBe('—');
  });

  it('toListing separa fotos y vídeo respetando el orden', () => {
    const listing = toListing(
      {
        id: 1,
        centris_id: null,
        title: { en: 'T' },
        description: {},
        address: 'x',
        price: 100,
        currency: 'CAD',
        beds: 1,
        baths: 1,
        area_sqft: null,
        property_type: 'villa',
        status: 'for_sale',
        amenities: ['gym', 'jacuzzi'],
        created_by: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      [
        { path: 'p2.jpg', kind: 'image', position: 2 },
        { path: 'v.mp4', kind: 'video', position: 0 },
        { path: 'p1.jpg', kind: 'image', position: 1 },
      ],
    );
    expect(listing).toMatchObject({
      photos: ['p1.jpg', 'p2.jpg'],
      video: 'v.mp4',
      centris: '',
      areaSqft: 0,
      amenities: ['gym'],
    });
  });

  it('las conversiones de escritura solo incluyen los campos indicados', () => {
    expect(listingPatchToUpdate({ price: 5, areaSqft: 9 })).toEqual({ price: 5, area_sqft: 9 });
    expect(postDraftToUpdate({ title: 'x', lang: 'Français' })).toEqual({ title: 'x', lang: 'fr' });
    expect(
      postDraftToInsert(
        { listingId: 1, platformId: 'facebook', title: 't', scheduledAt: '2026-08-22T13:00:00Z' },
        'u1',
      ),
    ).toMatchObject({ author_id: 'u1', format: 'single', lang: 'zh', body: '' });
  });
});

describe('format', () => {
  it('formatea y parsea importes', () => {
    expect(formatPrice(850000)).toBe('$850,000');
    expect(formatArea(1200)).toBe('1,200');
    expect(parseNumber('$999,000')).toBe(999000);
    expect(parseNumber('1 200.5 sqft')).toBe(1200.5);
    expect(parseNumber('abc')).toBe(0);
  });
});
