// Listings data layer. Backed by localStorage today so the app stays
// deployable as a static site; every function is async so a real API can
// replace it later without touching the pages.
const KEY = 'pp-listings';
const listeners = new Set();

const SEED = [
  { id: 'l-1001', title: 'Riverside Garden Villa', type: 'sale', status: 'active', price: 12800000, currency: 'CNY', location: '上海 · 徐汇滨江', unitNumber: 'No. 12', propertyType: 'house', beds: 4, baths: 3, area: 268, parking: { count: 2, type: 'covered' }, furnishedLevel: 'semi', petsAllowed: true, photos: ['/images/listings/villa1.jpg', '/images/listings/villa2.jpg', '/images/listings/villa3.jpg'], cover: '/images/listings/villa1.jpg', agent: 'Chen Wei', ownerName: 'Wang Jianguo', ownerPhone: '+86 138 0013 8000', notes: 'Owner prefers weekend viewings.', updatedAt: '2026-10-20' },
  { id: 'l-1002', title: 'Emerald Lake Residence', type: 'sale', status: 'active', price: 8600000, currency: 'CNY', location: '上海 · 翠湖天地', unitNumber: 'Bldg 3 · 1202', propertyType: 'apartment', beds: 3, baths: 2, area: 186, parking: { count: 1, type: 'covered' }, furnishedLevel: 'full', petsAllowed: false, photos: ['/images/listings/garden1.jpg', '/images/listings/garden3.jpg'], cover: '/images/listings/garden1.jpg', agent: 'Lin Yue', ownerName: 'Li Hongmei', ownerPhone: '+86 139 2200 3311', notes: '', updatedAt: '2026-10-21' },
  { id: 'l-1003', title: 'Downtown Loft 12F', type: 'rent', status: 'active', price: 28000, currency: 'CNY', location: '上海 · 静安寺', unitNumber: '12F-A', propertyType: 'loft', beds: 2, baths: 1, area: 96, parking: { count: 1, type: 'available' }, furnishedLevel: 'full', petsAllowed: false, photos: ['/images/listings/loft1.jpg', '/images/listings/loft2.jpg'], cover: '/images/listings/loft1.jpg', agent: 'Chen Wei', ownerName: 'Zhou Min', ownerPhone: '+86 137 5566 7788', notes: 'Short-term lease possible.', updatedAt: '2026-10-22' },
  { id: 'l-1004', title: 'Skyline View Apartment', type: 'sale', status: 'pending', price: 6300000, currency: 'CNY', location: '上海 · 陆家嘴', unitNumber: 'Tower 2 · 3305', propertyType: 'apartment', beds: 2, baths: 2, area: 128, parking: { count: 1, type: 'private' }, furnishedLevel: 'appliances', petsAllowed: true, photos: ['/images/listings/view1.jpg', '/images/listings/view2.jpg'], cover: '/images/listings/view1.jpg', agent: 'Zhao Min', ownerName: 'Chen Guoqiang', ownerPhone: '+86 136 9090 1212', notes: '', updatedAt: '2026-10-23' },
  { id: 'l-1005', title: 'Garden Townhouse', type: 'sale', status: 'sold', price: 9900000, currency: 'CNY', location: '上海 · 虹桥', unitNumber: 'Row 5 · 7', propertyType: 'townhouse', beds: 4, baths: 3, area: 220, parking: { count: 2, type: 'private' }, furnishedLevel: 'none', petsAllowed: true, photos: ['/images/listings/town1.jpg', '/images/listings/town2.jpg'], cover: '/images/listings/town1.jpg', agent: 'Lin Yue', ownerName: 'Sun Yaping', ownerPhone: '+86 135 4433 2211', notes: 'Closed 2026-10-18.', updatedAt: '2026-10-18' },
  { id: 'l-1006', title: 'Modern Condo 8F', type: 'rent', status: 'rented', price: 16500, currency: 'CNY', location: '上海 · 长宁', unitNumber: '8F-B', propertyType: 'apartment', beds: 1, baths: 1, area: 62, parking: { count: 0, type: 'none' }, furnishedLevel: 'semi', petsAllowed: false, photos: ['/images/listings/condo1.jpg', '/images/listings/condo2.jpg'], cover: '/images/listings/condo1.jpg', agent: 'Zhao Min', ownerName: 'He Ling', ownerPhone: '+86 134 7788 9900', notes: 'Lease ends 2027-04.', updatedAt: '2026-10-24' },
  { id: 'l-1007', title: 'Lakeview Family Home', type: 'sale', status: 'active', price: 7400000, currency: 'CNY', location: '上海 · 苏州湾', unitNumber: '', propertyType: 'house', beds: 3, baths: 2, area: 174, parking: { count: 1, type: 'covered' }, furnishedLevel: 'appliances', petsAllowed: true, photos: ['/images/listings/garden2.jpg', '/images/listings/garden4.jpg'], cover: '/images/listings/garden2.jpg', agent: 'Chen Wei', ownerName: 'Xu Wenbo', ownerPhone: '+86 133 2020 4040', notes: '', updatedAt: '2026-10-25' },
  { id: 'l-1008', title: 'Penthouse Duplex', type: 'sale', status: 'pending', price: 15600000, currency: 'CNY', location: '上海 · 外滩', unitNumber: 'PH-2', propertyType: 'apartment', beds: 5, baths: 4, area: 320, parking: { count: 3, type: 'private' }, furnishedLevel: 'full', petsAllowed: true, photos: ['/images/listings/villa2.jpg', '/images/listings/villa4.jpg', '/images/listings/view3.jpg'], cover: '/images/listings/villa2.jpg', agent: 'Lin Yue', ownerName: 'Gao Peng', ownerPhone: '+86 132 6677 8899', notes: 'Dual currency offers discussed.', updatedAt: '2026-10-26' }
];

// Fills newer listing fields on old localStorage records and keeps the legacy
// `image` field in sync with the cover so pages not yet migrated keep working.
function normalize(item) {
  const photos = Array.isArray(item.photos) && item.photos.length
    ? item.photos.slice()
    : (item.image ? [item.image] : []);
  const cover = photos.indexOf(item.cover) >= 0 ? item.cover : (photos[0] || '');
  return Object.assign({}, item, {
    propertyType: item.propertyType || '',
    unitNumber: item.unitNumber || '',
    parking: Object.assign({ count: 0, type: 'none' }, item.parking || {}),
    furnishedLevel: item.furnishedLevel || 'none',
    petsAllowed: !!item.petsAllowed,
    photos,
    cover,
    image: cover,
    currency: item.currency || 'CNY',
    ownerName: item.ownerName || '',
    ownerPhone: item.ownerPhone || '',
    notes: item.notes || ''
  });
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalize);
    }
  } catch (e) {}
  persist(SEED.map(normalize));
  return SEED.map(normalize);
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
  const item = normalize(Object.assign({}, data, {
    id: 'l-' + Date.now().toString(36),
    updatedAt: new Date().toISOString().slice(0, 10)
  }));
  items.unshift(item);
  persist(items);
  emit();
  return item;
}

export async function updateListing(id, patch) {
  const items = load();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  items[idx] = normalize(Object.assign({}, items[idx], patch, {
    updatedAt: new Date().toISOString().slice(0, 10)
  }));
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
    rented: items.filter((i) => i.status === 'rented').length,
    otherAgent: items.filter((i) => i.status === 'other_agent').length,
    forSale: items.filter((i) => i.type === 'sale').length,
    forRent: items.filter((i) => i.type === 'rent').length,
    totalValue: items.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    soldValue: sold.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    avgPrice: items.length ? Math.round(items.reduce((sum, i) => sum + (Number(i.price) || 0), 0) / items.length) : 0
  };
}

const CURRENCY_SYMBOLS = { CNY: '¥', USD: '$', EUR: '€' };

export function formatPrice(n, currency) {
  return (CURRENCY_SYMBOLS[currency] || '¥') + Number(n || 0).toLocaleString('en-US');
}

// Posts data layer (social media posts created to promote listings).
// Same localStorage-backed pattern as listings, own key, shared subscribe/emit
// so every page refreshes when either entity changes.
const POSTS_KEY = 'pp-posts';

function postDay(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const POSTS_SEED = [
  {
    id: 'p-2001', listingId: 'l-1001', listingTitle: 'Riverside Garden Villa',
    title: 'Riverside Garden Villa · Featured home',
    text: 'Wake up to river views every morning. 4 bedrooms, 3 baths and a private garden in Xuhui Riverside — book a private viewing this week.',
    images: ['/images/listings/villa1.jpg', '/images/listings/villa2.jpg', '/images/listings/villa3.jpg', '/images/listings/villa4.jpg'],
    media: 'carousel', platform: 'Facebook', templateId: 2,
    hashtags: '#Shanghai #LuxuryVilla #XuhuiRiverside #DreamHome',
    date: postDay(0), createdAt: postDay(0) + 'T09:20:00.000Z'
  },
  {
    id: 'p-2002', listingId: 'l-1003', listingTitle: 'Downtown Loft 12F',
    title: 'Downtown Loft 12F · Video tour',
    text: 'Full video tour of our Jing\'an loft — open plan, floor-to-ceiling windows, steps from the metro.',
    images: ['/images/listings/loft1.jpg'],
    media: 'video', platform: 'wxch', templateId: 3,
    hashtags: '#静安寺 #LoftLife #CityLiving',
    date: postDay(0), createdAt: postDay(0) + 'T06:05:00.000Z'
  },
  {
    id: 'p-2003', listingId: 'l-1002', listingTitle: 'Emerald Lake Residence',
    title: 'Emerald Lake Residence · Just listed',
    text: 'A calm, light-filled 3-bedroom residence beside the lake. Swipe for the garden, living room and skyline balcony.',
    images: ['/images/listings/garden1.jpg', '/images/listings/garden2.jpg', '/images/listings/garden3.jpg', '/images/listings/garden4.jpg'],
    media: 'carousel', platform: 'Instagram', templateId: 1,
    hashtags: '#翠湖天地 #JustListed #LakeView #HomeTour',
    date: postDay(1), createdAt: postDay(1) + 'T10:40:00.000Z'
  },
  {
    id: 'p-2004', listingId: 'l-1006', listingTitle: 'Modern Condo 8F',
    title: 'Modern Condo 8F · Rent spotlight',
    text: 'Compact, stylish and ready to move in. 62 m² in Changning from ¥16,500/month — ideal for young professionals.',
    images: ['/images/listings/condo1.jpg'],
    media: 'single', platform: 'wx', templateId: null,
    hashtags: '#长宁 #租房 #StudioGoals',
    date: postDay(2), createdAt: postDay(2) + 'T08:15:00.000Z'
  },
  {
    id: 'p-2005', listingId: 'l-1007', listingTitle: 'Lakeview Family Home',
    title: 'Lakeview Family Home · Open house',
    text: 'Join our open house this weekend at Suzhou Bay. 3 bedrooms, park views and top school districts nearby.',
    images: ['/images/listings/garden2.jpg'],
    media: 'single', platform: 'Facebook', templateId: 5,
    hashtags: '#苏州湾 #OpenHouse #FamilyHome',
    date: postDay(3), createdAt: postDay(3) + 'T11:00:00.000Z'
  },
  {
    id: 'p-2006', listingId: 'l-1008', listingTitle: 'Penthouse Duplex',
    title: 'Penthouse Duplex · Market insight',
    text: 'Why the Bund penthouse market keeps climbing — a short walkthrough of our newest duplex listing.',
    images: ['/images/listings/villa2.jpg'],
    media: 'video', platform: 'Instagram', templateId: null,
    hashtags: '#外滩 #Penthouse #MarketUpdate',
    date: postDay(4), createdAt: postDay(4) + 'T07:30:00.000Z'
  }
];

function loadPosts() {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  persistPosts(POSTS_SEED);
  return POSTS_SEED.slice();
}

function persistPosts(list) {
  try { localStorage.setItem(POSTS_KEY, JSON.stringify(list)); } catch (e) {}
}

export async function listPosts() {
  return loadPosts();
}

export async function createPost(data) {
  const items = loadPosts();
  const item = Object.assign({}, data, {
    id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    date: data.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  items.unshift(item);
  persistPosts(items);
  emit();
  return item;
}

export async function deletePost(id) {
  persistPosts(loadPosts().filter((p) => p.id !== id));
  emit();
}
