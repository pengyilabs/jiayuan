/**
 * Combinaciones plataforma+tipo compatibles con cada template, y sus dimensiones de salida
 * (F5). `slots` describe los elementos visuales que el layout ya coloca (título, precio,
 * imagen, marca); el renderizador de cada layout está escrito a mano (no es genérico a partir
 * de `slots`), así que aquí son solo metadatos informativos para quien explore la base de datos.
 */
import type { TablesInsert } from '../../types/db';

type VariantSeed = Omit<TablesInsert<'template_variants'>, 'id'>;

const slots = (...names: readonly string[]): Record<string, boolean> =>
  Object.fromEntries(names.map(n => [n, true]));

export const templateVariantsSeed: VariantSeed[] = [
  // hero — 出售 (id 1): imagen a pantalla completa, precio y título superpuestos
  {
    template_id: 1,
    platform_id: 'facebook',
    post_type_id: 'single',
    width: 1080,
    height: 1080,
    slots: slots('image', 'price', 'title', 'logo'),
  },
  // split — Sale/English (id 2): imagen a la izquierda, información a la derecha
  {
    template_id: 2,
    platform_id: 'facebook',
    post_type_id: 'single',
    width: 1920,
    height: 1080,
    slots: slots('image', 'price', 'title', 'badges'),
  },
  // hero — 出租 (id 3)
  {
    template_id: 3,
    platform_id: 'wechat_official',
    post_type_id: 'single',
    width: 1080,
    height: 1080,
    slots: slots('image', 'price', 'title', 'logo'),
  },
  // split — Brand (id 4): portada de artículo de WeChat
  {
    template_id: 4,
    platform_id: 'wechat_official',
    post_type_id: 'article',
    width: 1080,
    height: 460,
    slots: slots('image', 'title', 'contact'),
  },
  // hero — Sale bilingüe (id 5)
  {
    template_id: 5,
    platform_id: 'instagram',
    post_type_id: 'single',
    width: 1080,
    height: 1350,
    slots: slots('image', 'price', 'title', 'logo'),
  },
  // split — Rent/English (id 6)
  {
    template_id: 6,
    platform_id: 'facebook',
    post_type_id: 'video',
    width: 1920,
    height: 1080,
    slots: slots('image', 'price', 'title', 'badges'),
  },
  // gallery — Sale bilingüe (id 7): varias fotos en cuadrícula
  {
    template_id: 7,
    platform_id: 'facebook',
    post_type_id: 'carousel',
    width: 1080,
    height: 1080,
    slots: slots('images', 'price', 'title'),
  },
  {
    template_id: 7,
    platform_id: 'instagram',
    post_type_id: 'carousel',
    width: 1080,
    height: 1080,
    slots: slots('images', 'price', 'title'),
  },
  // magazine — Sale/English (id 8): portada editorial de artículo
  {
    template_id: 8,
    platform_id: 'wechat_official',
    post_type_id: 'article',
    width: 1080,
    height: 460,
    slots: slots('image', 'price', 'title', 'excerpt', 'features'),
  },
  // story — Sale bilingüe (id 9)
  {
    template_id: 9,
    platform_id: 'facebook',
    post_type_id: 'stories',
    width: 1080,
    height: 1920,
    slots: slots('image', 'price', 'title', 'cta'),
  },
  {
    template_id: 9,
    platform_id: 'instagram',
    post_type_id: 'stories',
    width: 1080,
    height: 1920,
    slots: slots('image', 'price', 'title', 'cta'),
  },
  // minimal — Sale/English (id 10)
  {
    template_id: 10,
    platform_id: 'twitter',
    post_type_id: 'single',
    width: 1600,
    height: 900,
    slots: slots('image', 'price', 'title'),
  },
  // diagonal — Sale bilingüe (id 11)
  {
    template_id: 11,
    platform_id: 'xiaohongshu',
    post_type_id: 'note',
    width: 1080,
    height: 1440,
    slots: slots('image', 'price', 'title', 'cta'),
  },
  // features — Sale/中文 (id 12)
  {
    template_id: 12,
    platform_id: 'wechat_official',
    post_type_id: 'video',
    width: 1080,
    height: 1440,
    slots: slots('image', 'price', 'title', 'badges'),
  },
  {
    template_id: 12,
    platform_id: 'youtube',
    post_type_id: 'video',
    width: 1920,
    height: 1080,
    slots: slots('image', 'price', 'title', 'badges'),
  },
];
