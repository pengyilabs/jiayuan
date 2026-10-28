// Listings data layer. Backed by localStorage today so the app stays
// deployable as a static site; every function is async so a real API can
// replace it later without touching the pages.
const KEY = 'pp-listings';
const listeners = new Set();

const SEED = [
  { id: 'l-1001', title: 'Riverside Garden Villa', type: 'sale', status: 'active', price: 12800000, location: '上海 · 徐汇滨江', beds: 4, baths: 3, area: 268, image: '/images/listings/villa1.jpg', agent: 'Chen Wei', updatedAt: '2026-10-20' },
  { id: 'l-1002', title: 'Emerald Lake Residence', type: 'sale', status: 'active', price: 8600000, location: '上海 · 翠湖天地', beds: 3, baths: 2, area: 186, image: '/images/listings/garden1.jpg', agent: 'Lin Yue', updatedAt: '2026-10-21' },
  { id: 'l-1003', title: 'Downtown Loft 12F', type: 'rent', status: 'active', price: 28000, location: '上海 · 静安寺', beds: 2, baths: 1, area: 96, image: '/images/listings/loft1.jpg', agent: 'Chen Wei', updatedAt: '2026-10-22' },
  { id: 'l-1004', title: 'Skyline View Apartment', type: 'sale', status: 'pending', price: 6300000, location: '上海 · 陆家嘴', beds: 2, baths: 2, area: 128, image: '/images/listings/view1.jpg', agent: 'Zhao Min', updatedAt: '2026-10-23' },
  { id: 'l-1005', title: 'Garden Townhouse', type: 'sale', status: 'sold', price: 9900000, location: '上海 · 虹桥', beds: 4, baths: 3, area: 220, image: '/images/listings/town1.jpg', agent: 'Lin Yue', updatedAt: '2026-10-18' },
  { id: 'l-1006', title: 'Modern Condo 8F', type: 'rent', status: 'active', price: 16500, location: '上海 · 长宁', beds: 1, baths: 1, area: 62, image: '/images/listings/condo1.jpg', agent: 'Zhao Min', updatedAt: '2026-10-24' },
  { id: 'l-1007', title: 'Lakeview Family Home', type: 'sale', status: 'active', price: 7400000, location: '上海 · 苏州湾', beds: 3, baths: 2, area: 174, image: '/images/listings/garden2.jpg', agent: 'Chen Wei', updatedAt: '2026-10-25' },
  { id: 'l-1008', title: 'Penthouse Duplex', type: 'sale', status: 'pending', price: 15600000, location: '上海 · 外滩', beds: 5, baths: 4, area: 320, image: '/images/listings/villa2.jpg', agent: 'Lin Yue', updatedAt: '2026-10-26' }
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  persist(SEED);
  return SEED.slice();
}

function persist(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
}

function emit() {
  listeners.forEach((fn) => { try { fn(); } catch (e) {} });
  try { window.dispatchEvent(new Event('pp-listings-change')); } catch (e) {}
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function listListings(filter) {
  let items = load();
  if (filter) {
    const { status, type, q } = filter;
    if (status && status !== 'all') items = items.filter((i) => i.status === status);
    if (type && type !== 'all') items = items.filter((i) => i.type === type);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((i) =>
        (i.title + ' ' + i.location + ' ' + i.agent).toLowerCase().indexOf(needle) >= 0
      );
    }
  }
  return items;
}

export async function getListing(id) {
  return load().find((i) => i.id === id) || null;
}

export async function createListing(data) {
  const items = load();
  const item = Object.assign({}, data, {
    id: 'l-' + Date.now().toString(36),
    updatedAt: new Date().toISOString().slice(0, 10)
  });
  items.unshift(item);
  persist(items);
  emit();
  return item;
}

export async function updateListing(id, patch) {
  const items = load();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  items[idx] = Object.assign({}, items[idx], patch, {
    updatedAt: new Date().toISOString().slice(0, 10)
  });
  persist(items);
  emit();
  return items[idx];
}

export async function deleteListing(id) {
  const items = load().filter((i) => i.id !== id);
  persist(items);
  emit();
}

export async function getStats() {
  const items = load();
  const sold = items.filter((i) => i.status === 'sold');
  const active = items.filter((i) => i.status === 'active');
  return {
    total: items.length,
    active: active.length,
    pending: items.filter((i) => i.status === 'pending').length,
    sold: sold.length,
    forSale: items.filter((i) => i.type === 'sale').length,
    forRent: items.filter((i) => i.type === 'rent').length,
    totalValue: items.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    soldValue: sold.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    avgPrice: items.length ? Math.round(items.reduce((sum, i) => sum + (Number(i.price) || 0), 0) / items.length) : 0
  };
}

export function formatPrice(n) {
  return '¥' + Number(n || 0).toLocaleString('en-US');
}
