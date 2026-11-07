// Listings data layer. Backed by localStorage today so the app stays
// deployable as a static site; every function is async so a real API can
// replace it later without touching the pages.
const KEY = 'pp-listings';
const listeners = new Set();

// Single-company deployment with a multi-tenant seam: every entity carries
// `companyId` so a future backend can scope rows without a schema migration.
export const COMPANY_ID = 'c-home-direct';

export const PET_POLICIES = ['yes', 'no', 'restricted'];
export const DEAL_MODES = ['owner_100', 'split_50', 'fixed'];
export const POST_STATUSES = ['draft', 'planned', 'published'];
export const AMENITIES = ['pool', 'gym', 'guest_parking', 'lobby', 'football', 'tennis', 'event_room', 'bbq'];
export const AGENT_ROLES = ['owner', 'agent'];

const SEED = [
  {
    id: 'l-2001',
    title: 'Skygarden 2-Bed Condo',
    type: 'rent',
    status: 'active',
    price: 1000,
    currency: 'USD',
    country: 'CR',
    location: 'Curridabat · Skygarden',
    unitNumber: 'Tower A · 704',
    propertyType: 'apartment',
    buildingId: 'b-001',
    beds: 2,
    baths: 2,
    area: 85,
    parking: { count: 1, type: 'covered' },
    furnishedLevel: 'full',
    petsAllowed: true,
    petPolicy: 'restricted',
    dealTerms: { mode: 'split_50', amount: 0, currency: 'USD' },
    isOwnerProperty: true,
    photos: ['/images/listings/condo1.jpg', '/images/listings/condo2.jpg', '/images/listings/view1.jpg'],
    cover: '/images/listings/condo1.jpg',
    agent: 'Chen Wei, Lin Yue',
    agentIds: ['a-1', 'a-2'],
    ownerName: 'Carlos Jiménez',
    ownerPhone: '+506 8888-1234',
    notes: 'Unit faces the garden. Owner accepts 50% split.',
    updatedAt: '2026-11-01',
  },
  {
    id: 'l-2002',
    title: 'Skygarden Studio',
    type: 'rent',
    status: 'active',
    price: 650,
    currency: 'USD',
    country: 'CR',
    location: 'Curridabat · Skygarden',
    unitNumber: 'Tower B · 210',
    propertyType: 'apartment',
    buildingId: 'b-001',
    beds: 1,
    baths: 1,
    area: 45,
    parking: { count: 1, type: 'covered' },
    furnishedLevel: 'none',
    petsAllowed: false,
    petPolicy: 'no',
    dealTerms: { mode: 'fixed', amount: 150, currency: 'USD' },
    isOwnerProperty: false,
    photos: ['/images/listings/condo3.jpg', '/images/listings/condo4.jpg'],
    cover: '/images/listings/condo3.jpg',
    agent: 'Zhao Min',
    agentIds: ['a-3'],
    ownerName: 'María Rojas',
    ownerPhone: '+506 8777-5678',
    notes: 'Managed for third-party owner. Fixed $150 per rental.',
    updatedAt: '2026-11-02',
  },
  {
    id: 'l-2003',
    title: 'Curridabat Family House',
    type: 'sale',
    status: 'active',
    price: 185000,
    currency: 'USD',
    country: 'CR',
    location: 'Curridabat · 800m east of Plaza del Sol',
    unitNumber: '',
    propertyType: 'house',
    buildingId: '',
    beds: 3,
    baths: 2,
    area: 220,
    parking: { count: 2, type: 'private' },
    furnishedLevel: 'none',
    petsAllowed: true,
    petPolicy: 'yes',
    dealTerms: { mode: 'owner_100', amount: 0, currency: 'USD' },
    isOwnerProperty: true,
    photos: ['/images/listings/villa1.jpg', '/images/listings/villa2.jpg', '/images/listings/garden1.jpg'],
    cover: '/images/listings/villa1.jpg',
    agent: 'Chen Wei',
    agentIds: ['a-1'],
    ownerName: 'Carlos Jiménez',
    ownerPhone: '+506 8888-1234',
    notes: 'Pet-friendly garden. Owner pays 100% of commission.',
    updatedAt: '2026-11-03',
  },
  {
    id: 'l-2004',
    title: 'Toronto Downtown Condo',
    type: 'rent',
    status: 'active',
    price: 2600,
    currency: 'CAD',
    country: 'CA',
    location: 'Toronto · Harbourfront',
    unitNumber: '3205',
    propertyType: 'apartment',
    buildingId: 'b-002',
    beds: 2,
    baths: 1,
    area: 70,
    parking: { count: 1, type: 'covered' },
    furnishedLevel: 'full',
    petsAllowed: true,
    petPolicy: 'restricted',
    dealTerms: { mode: 'split_50', amount: 0, currency: 'CAD' },
    isOwnerProperty: true,
    photos: ['/images/listings/view2.jpg', '/images/listings/view3.jpg'],
    cover: '/images/listings/view2.jpg',
    agent: 'Lin Yue, Zhao Min',
    agentIds: ['a-2', 'a-3'],
    ownerName: 'Wei Zhang',
    ownerPhone: '+1 416-555-0198',
    notes: 'Owned by Chinese partner, managed by HOME DIRECT.',
    updatedAt: '2026-11-03',
  },
  {
    id: 'l-2005',
    title: 'Vancouver Townhouse',
    type: 'rent',
    status: 'pending',
    price: 3200,
    currency: 'CAD',
    country: 'CA',
    location: 'Vancouver · Oak Street',
    unitNumber: '',
    propertyType: 'townhouse',
    buildingId: '',
    beds: 3,
    baths: 2,
    area: 140,
    parking: { count: 2, type: 'private' },
    furnishedLevel: 'none',
    petsAllowed: true,
    petPolicy: 'yes',
    dealTerms: { mode: 'fixed', amount: 300, currency: 'CAD' },
    isOwnerProperty: false,
    photos: ['/images/listings/town1.jpg', '/images/listings/town2.jpg', '/images/listings/town3.jpg'],
    cover: '/images/listings/town1.jpg',
    agent: 'Chen Wei',
    agentIds: ['a-1'],
    ownerName: 'Li Hua',
    ownerPhone: '+1 604-555-0142',
    notes: '',
    updatedAt: '2026-11-04',
  },
  {
    id: 'l-2006',
    title: 'Skygarden 3-Bed Corner',
    type: 'sale',
    status: 'other_agent',
    price: 210000,
    currency: 'USD',
    country: 'CR',
    location: 'Curridabat · Skygarden',
    unitNumber: 'Tower A · 1102',
    propertyType: 'apartment',
    buildingId: 'b-001',
    beds: 3,
    baths: 2,
    area: 120,
    parking: { count: 2, type: 'covered' },
    furnishedLevel: 'semi',
    petsAllowed: true,
    petPolicy: 'restricted',
    dealTerms: { mode: 'split_50', amount: 0, currency: 'USD' },
    isOwnerProperty: true,
    photos: ['/images/listings/villa3.jpg', '/images/listings/villa4.jpg'],
    cover: '/images/listings/villa3.jpg',
    agent: 'Lin Yue',
    agentIds: ['a-2'],
    ownerName: 'Carlos Jiménez',
    ownerPhone: '+506 8888-1234',
    notes: 'Sold by another agency; kept for market tracking.',
    updatedAt: '2026-11-05',
  },
];

// Fills newer listing fields on old localStorage records and keeps the legacy
// `image` field in sync with the cover so pages not yet migrated keep working.
function normalize(item) {
  const photos =
    Array.isArray(item.photos) && item.photos.length ? item.photos.slice() : item.image ? [item.image] : [];
  const cover = photos.indexOf(item.cover) >= 0 ? item.cover : photos[0] || '';
  const petPolicy =
    ['yes', 'no', 'restricted'].indexOf(item.petPolicy) >= 0
      ? item.petPolicy
      : item.petsAllowed === false
        ? 'no'
        : 'yes';
  return Object.assign({}, item, {
    companyId: item.companyId || COMPANY_ID,
    country: item.country || '',
    propertyType: item.propertyType || '',
    unitNumber: item.unitNumber || '',
    buildingId: item.buildingId || '',
    agentIds: Array.isArray(item.agentIds) ? item.agentIds.slice() : [],
    parking: Object.assign({ count: 0, type: 'none' }, item.parking || {}),
    furnishedLevel: item.furnishedLevel || 'none',
    petPolicy,
    petsAllowed: petPolicy !== 'no', // legacy alias kept in sync
    dealTerms: Object.assign(
      { mode: 'owner_100', amount: 0, currency: item.currency || 'USD' },
      ['owner_100', 'split_50', 'fixed'].indexOf(item.dealTerms?.mode) >= 0 ? item.dealTerms : {}
    ),
    isOwnerProperty: !!item.isOwnerProperty,
    photos,
    cover,
    image: cover,
    currency: item.currency || 'CNY',
    ownerName: item.ownerName || '',
    ownerPhone: item.ownerPhone || '',
    notes: item.notes || '',
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
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {}
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {}
  });
  try {
    window.dispatchEvent(new Event('pp-listings-change'));
  } catch (e) {}
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function listListings(filter) {
  let items = load();
  if (filter) {
    const { status, type, q, country, agentId, buildingId } = filter;
    if (status && status !== 'all') items = items.filter((i) => i.status === status);
    if (type && type !== 'all') items = items.filter((i) => i.type === type);
    if (country && country !== 'all') items = items.filter((i) => i.country === country);
    if (buildingId) items = items.filter((i) => i.buildingId === buildingId);
    if (agentId) items = items.filter((i) => i.agentIds.indexOf(agentId) >= 0);
    if (q) {
      const needle = q.toLowerCase();
      const buildingName = {};
      (loadBuildings() || []).forEach((b) => {
        buildingName[b.id] = b.name;
      });
      items = items.filter(
        (i) =>
          (
            i.title +
            ' ' +
            i.location +
            ' ' +
            i.agent +
            ' ' +
            i.unitNumber +
            ' ' +
            i.notes +
            ' ' +
            (buildingName[i.buildingId] || '')
          )
            .toLowerCase()
            .indexOf(needle) >= 0
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
  const item = normalize(
    Object.assign({}, data, {
      id: 'l-' + Date.now().toString(36),
      updatedAt: new Date().toISOString().slice(0, 10),
    })
  );
  items.unshift(item);
  persist(items);
  emit();
  return item;
}

export async function updateListing(id, patch) {
  const items = load();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  items[idx] = normalize(
    Object.assign({}, items[idx], patch, {
      updatedAt: new Date().toISOString().slice(0, 10),
    })
  );
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
    avgPrice: items.length ? Math.round(items.reduce((sum, i) => sum + (Number(i.price) || 0), 0) / items.length) : 0,
  };
}

const CURRENCY_SYMBOLS = { CNY: '¥', USD: '$', EUR: '€', CAD: 'C$' };

export function formatPrice(n, currency) {
  const code = CURRENCY_SYMBOLS[currency] ? currency : 'CNY';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  } catch (e) {
    return (CURRENCY_SYMBOLS[code] || '¥') + Number(n || 0).toLocaleString('en-US');
  }
}

// Posts data layer (social media posts created to promote listings).
// Same localStorage-backed pattern as listings, own key, shared subscribe/emit
// so every page refreshes when either entity changes.
// Lifecycle: status 'draft' -> 'planned' -> 'published' (publish UI is a later
// iteration; `destinations` is pre-wired for it). One record can target several
// platforms via `platforms[]` (legacy singular `platform` kept in sync).
const POSTS_KEY = 'pp-posts';

function postDay(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizePost(p, defaultStatus) {
  const platforms =
    Array.isArray(p.platforms) && p.platforms.length ? p.platforms.slice() : p.platform ? [p.platform] : ['Facebook'];
  return Object.assign({}, p, {
    companyId: p.companyId || COMPANY_ID,
    listingId: p.listingId || '',
    platforms,
    platform: platforms[0], // legacy alias
    status:
      ['draft', 'planned', 'published'].indexOf(p.status) >= 0
        ? p.status
        : defaultStatus || (p.createdAt ? 'published' : 'draft'),
    destinations: Array.isArray(p.destinations) ? p.destinations.slice() : [],
    createdByAgentId: p.createdByAgentId || '',
    generation: Object.assign({ mode: 'single', engine: 'template' }, p.generation || {}),
    editedText: !!p.editedText,
    publishedAt: p.publishedAt || null,
  });
}

const POSTS_SEED = [
  {
    id: 'p-2001',
    listingId: 'l-2001',
    listingTitle: 'Skygarden 2-Bed Condo',
    title: 'Skygarden 2-Bed Condo · Featured home',
    text: 'Wake up to garden views in Curridabat. 2 bedrooms, 2 baths and full amenities at Skygarden — book a private viewing this week.',
    images: ['/images/listings/condo1.jpg', '/images/listings/condo2.jpg', '/images/listings/view1.jpg'],
    media: 'carousel',
    platforms: ['Facebook', 'Instagram'],
    templateId: 2,
    hashtags: '#Curridabat #Skygarden #DreamHome #CostaRica',
    status: 'planned',
    createdByAgentId: 'a-1',
    date: postDay(0),
    createdAt: postDay(0) + 'T09:20:00.000Z',
  },
  {
    id: 'p-2002',
    listingId: 'l-2002',
    listingTitle: 'Skygarden Studio',
    title: 'Skygarden Studio · Rent spotlight',
    text: 'Compact, stylish and ready to move in. 45 m² studio in Skygarden from $650/month — ideal for young professionals.',
    images: ['/images/listings/condo3.jpg'],
    media: 'single',
    platforms: ['Facebook'],
    templateId: null,
    hashtags: '#Curridabat #Renta #StudioGoals',
    status: 'draft',
    createdByAgentId: 'a-3',
    date: postDay(-2),
    createdAt: postDay(0) + 'T06:05:00.000Z',
  },
  {
    id: 'p-2003',
    listingId: 'l-2004',
    listingTitle: 'Toronto Downtown Condo',
    title: 'Toronto Downtown Condo · Just listed',
    text: 'A light-filled 2-bedroom condo on Harbourfront with skyline views. Swipe for the living room and terrace.',
    images: ['/images/listings/view2.jpg', '/images/listings/view3.jpg'],
    media: 'carousel',
    platforms: ['wxch', 'wx'],
    templateId: 1,
    hashtags: '#Toronto #Harbourfront #JustListed #加拿大房产',
    status: 'planned',
    createdByAgentId: 'a-2',
    date: postDay(2),
    createdAt: postDay(1) + 'T10:40:00.000Z',
  },
  {
    id: 'p-2004',
    listingId: 'l-2003',
    listingTitle: 'Curridabat Family House',
    title: 'Curridabat Family House · Open house',
    text: 'Join our open house this weekend in Curridabat. 3 bedrooms, pet-friendly garden and a quiet street near Plaza del Sol.',
    images: ['/images/listings/villa1.jpg', '/images/listings/garden1.jpg'],
    media: 'carousel',
    platforms: ['Facebook', 'Instagram', 'wx'],
    templateId: 5,
    hashtags: '#Curridabat #OpenHouse #FamilyHome #PetFriendly',
    status: 'planned',
    createdByAgentId: 'a-1',
    date: postDay(-5),
    createdAt: postDay(2) + 'T11:00:00.000Z',
  },
  {
    id: 'p-2005',
    listingId: 'l-2005',
    listingTitle: 'Vancouver Townhouse',
    title: 'Vancouver Townhouse · Market insight',
    text: 'Why Oak Street townhomes keep climbing — a short walkthrough of our newest Vancouver rental.',
    images: ['/images/listings/town1.jpg'],
    media: 'single',
    platforms: ['Facebook'],
    templateId: null,
    hashtags: '#Vancouver #Townhouse #MarketUpdate',
    status: 'draft',
    createdByAgentId: 'a-1',
    date: postDay(4),
    createdAt: postDay(3) + 'T07:30:00.000Z',
  },
  {
    id: 'p-2006',
    listingId: 'l-2001',
    listingTitle: 'Skygarden 2-Bed Condo',
    title: 'Skygarden 2-Bed Condo · Amenities tour',
    text: 'Pool, gym, tennis and an event room — the Skygarden amenities your next home comes with.',
    images: ['/images/listings/garden1.jpg', '/images/listings/garden2.jpg', '/images/listings/garden3.jpg'],
    media: 'carousel',
    platforms: ['Instagram'],
    templateId: 3,
    hashtags: '#Skygarden #Amenities #Lifestyle',
    status: 'planned',
    createdByAgentId: 'a-2',
    date: postDay(-8),
    createdAt: postDay(4) + 'T08:00:00.000Z',
  },
];

function loadPosts() {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((p) => normalizePost(p));
    }
  } catch (e) {}
  persistPosts(POSTS_SEED);
  return POSTS_SEED.map((p) => normalizePost(p));
}

function persistPosts(list) {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(list));
  } catch (e) {}
}

export async function listPosts(filter) {
  let items = loadPosts();
  if (filter) {
    const { listingId, status, agentId } = filter;
    if (listingId) items = items.filter((p) => p.listingId === listingId);
    if (status && status !== 'all') items = items.filter((p) => p.status === status);
    if (agentId) items = items.filter((p) => p.createdByAgentId === agentId);
  }
  return items;
}

export async function createPost(data) {
  const items = loadPosts();
  const item = normalizePost(
    Object.assign({}, data, {
      id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      date: data.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }),
    'draft'
  );
  items.unshift(item);
  persistPosts(items);
  emit();
  return item;
}

export async function updatePost(id, patch) {
  const items = loadPosts();
  const idx = items.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  items[idx] = normalizePost(Object.assign({}, items[idx], patch, { id }), items[idx].status);
  persistPosts(items);
  emit();
  return items[idx];
}

export async function deletePost(id) {
  persistPosts(loadPosts().filter((p) => p.id !== id));
  emit();
}

// Agents data layer. Listings reference agents by id (agentIds) and keep a
// denormalized `agent` display string so older pages keep working.
const AGENTS_KEY = 'pp-agents';

const AGENTS_SEED = [
  { id: 'a-1', name: 'Chen Wei', phone: '+86 138 0000 1111', email: 'chen.wei@homedirect.cn', role: 'agent' },
  { id: 'a-2', name: 'Lin Yue', phone: '+86 138 0000 2222', email: 'lin.yue@homedirect.cn', role: 'agent' },
  { id: 'a-3', name: 'Zhao Min', phone: '+86 138 0000 3333', email: 'zhao.min@homedirect.cn', role: 'agent' },
];

function loadAgents() {
  try {
    const raw = localStorage.getItem(AGENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  persistAgents(AGENTS_SEED);
  return AGENTS_SEED.slice();
}

function persistAgents(list) {
  try {
    localStorage.setItem(AGENTS_KEY, JSON.stringify(list));
  } catch (e) {}
}

export async function listAgents() {
  return loadAgents();
}

export async function createAgent(data) {
  const items = loadAgents();
  const item = {
    id: 'a-' + Date.now().toString(36),
    name: (data.name || '').trim(),
    phone: (data.phone || '').trim(),
    email: (data.email || '').trim(),
    role: AGENT_ROLES.indexOf(data.role) >= 0 ? data.role : 'agent',
  };
  items.push(item);
  persistAgents(items);
  emit();
  return item;
}

export async function updateAgent(id, patch) {
  const items = loadAgents();
  const idx = items.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  items[idx] = Object.assign({}, items[idx], {
    name: (patch.name ?? items[idx].name).trim(),
    phone: (patch.phone ?? items[idx].phone).trim(),
    email: (patch.email ?? items[idx].email).trim(),
    role: AGENT_ROLES.indexOf(patch.role) >= 0 ? patch.role : items[idx].role || 'agent',
  });
  persistAgents(items);
  emit();
  return items[idx];
}

export async function deleteAgent(id) {
  persistAgents(loadAgents().filter((a) => a.id !== id));
  emit();
}

// Denormalizes agentIds[] into the legacy `agent` display string.
export function agentDisplayNames(agentIds) {
  const agents = loadAgents();
  return (agentIds || [])
    .map((id) => (agents.find((a) => a.id === id) || {}).name || '')
    .filter(Boolean)
    .join(', ');
}

// Buildings data layer. A listing links to 0..1 building (buildingId); the
// building holds the shared amenity gallery that property/post photo pickers
// can reuse instead of re-uploading per post.
const BUILDINGS_KEY = 'pp-buildings';

const BUILDINGS_SEED = [
  {
    id: 'b-001',
    companyId: COMPANY_ID,
    name: 'Skygarden',
    city: 'Curridabat',
    country: 'CR',
    address: 'Curridabat, San José, Costa Rica',
    amenities: ['pool', 'gym', 'guest_parking', 'lobby', 'football', 'tennis', 'event_room', 'bbq'],
    photos: [
      { src: '/images/listings/garden1.jpg', label: 'Pool' },
      { src: '/images/listings/garden2.jpg', label: 'Gardens & BBQ area' },
      { src: '/images/listings/condo2.jpg', label: 'Lobby' },
      { src: '/images/listings/condo4.jpg', label: 'Gym' },
      { src: '/images/listings/garden3.jpg', label: 'Football court' },
      { src: '/images/listings/garden4.jpg', label: 'Tennis court' },
      { src: '/images/listings/villa1.jpg', label: 'Event room' },
      { src: '/images/listings/view1.jpg', label: 'Guest parking & views' },
    ],
    notes: 'Family-oriented towers with full amenities.',
    updatedAt: '2026-11-01',
  },
  {
    id: 'b-002',
    companyId: COMPANY_ID,
    name: 'Harbour Residences',
    city: 'Toronto',
    country: 'CA',
    address: 'Harbourfront, Toronto, ON, Canada',
    amenities: ['gym', 'guest_parking', 'lobby'],
    photos: [
      { src: '/images/listings/view2.jpg', label: 'Harbour view' },
      { src: '/images/listings/loft1.jpg', label: 'Residence interior' },
    ],
    notes: 'Downtown tower managed for Chinese partners.',
    updatedAt: '2026-11-03',
  },
];

function normalizeBuilding(b) {
  return Object.assign({}, b, {
    companyId: b.companyId || COMPANY_ID,
    city: b.city || '',
    country: b.country || '',
    address: b.address || '',
    amenities: Array.isArray(b.amenities) ? b.amenities.filter((a) => AMENITIES.indexOf(a) >= 0) : [],
    photos: Array.isArray(b.photos)
      ? b.photos.map((p) =>
          typeof p === 'string' ? { src: p, label: '' } : { src: p.src || '', label: p.label || '' }
        )
      : [],
    notes: b.notes || '',
  });
}

function loadBuildings() {
  try {
    const raw = localStorage.getItem(BUILDINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalizeBuilding);
    }
  } catch (e) {}
  persistBuildings(BUILDINGS_SEED.map(normalizeBuilding));
  return BUILDINGS_SEED.map(normalizeBuilding);
}

function persistBuildings(list) {
  try {
    localStorage.setItem(BUILDINGS_KEY, JSON.stringify(list));
  } catch (e) {}
}

export async function listBuildings() {
  return loadBuildings();
}

export async function getBuilding(id) {
  return loadBuildings().find((b) => b.id === id) || null;
}

export async function createBuilding(data) {
  const items = loadBuildings();
  const item = normalizeBuilding(
    Object.assign({}, data, {
      id: 'b-' + Date.now().toString(36),
      updatedAt: new Date().toISOString().slice(0, 10),
    })
  );
  items.unshift(item);
  persistBuildings(items);
  emit();
  return item;
}

export async function updateBuilding(id, patch) {
  const items = loadBuildings();
  const idx = items.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  items[idx] = normalizeBuilding(
    Object.assign({}, items[idx], patch, {
      updatedAt: new Date().toISOString().slice(0, 10),
    })
  );
  persistBuildings(items);
  emit();
  return items[idx];
}

export async function deleteBuilding(id) {
  persistBuildings(loadBuildings().filter((b) => b.id !== id));
  emit();
}

// Destinations data layer. Facebook groups / channels a post can be published
// to. Schema-only for now (Q4): the picker UI ships with the publish
// transition in a later iteration.
const DESTINATIONS_KEY = 'pp-destinations';

const DESTINATIONS_SEED = [
  { id: 'd-1', companyId: COMPANY_ID, platform: 'facebook', city: 'Curridabat', name: 'Curridabat Rentals & Sales' },
  { id: 'd-2', companyId: COMPANY_ID, platform: 'facebook', city: 'San José', name: 'San José Real Estate CR' },
  { id: 'd-3', companyId: COMPANY_ID, platform: 'facebook', city: 'Toronto', name: 'Toronto Downtown Condos' },
];

function normalizeDestination(d) {
  return Object.assign({}, d, {
    companyId: d.companyId || COMPANY_ID,
    platform: d.platform || 'facebook',
    city: d.city || '',
    name: d.name || '',
  });
}

function loadDestinations() {
  try {
    const raw = localStorage.getItem(DESTINATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalizeDestination);
    }
  } catch (e) {}
  persistDestinations(DESTINATIONS_SEED.map(normalizeDestination));
  return DESTINATIONS_SEED.map(normalizeDestination);
}

function persistDestinations(list) {
  try {
    localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(list));
  } catch (e) {}
}

export async function listDestinations(filter) {
  let items = loadDestinations();
  if (filter) {
    if (filter.city) items = items.filter((d) => d.city === filter.city);
    if (filter.platform) items = items.filter((d) => d.platform === filter.platform);
  }
  return items;
}

export async function createDestination(data) {
  const items = loadDestinations();
  const item = normalizeDestination(Object.assign({}, data, { id: 'd-' + Date.now().toString(36) }));
  items.push(item);
  persistDestinations(items);
  emit();
  return item;
}

export async function deleteDestination(id) {
  persistDestinations(loadDestinations().filter((d) => d.id !== id));
  emit();
}

// Settings data layer. Holds the LLM config (Xiaomi MiMo) used by post
// generation; a missing/disabled config falls back to template-based copy.
const SETTINGS_KEY = 'pp-settings';

const SETTINGS_DEFAULT = {
  companyId: COMPANY_ID,
  llm: {
    provider: 'mimo',
    apiKey: '',
    model: 'mimo-v2.6-flash',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    enabled: true,
  },
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return Object.assign({}, SETTINGS_DEFAULT, parsed, {
          llm: Object.assign({}, SETTINGS_DEFAULT.llm, parsed.llm || {}),
        });
      }
    }
  } catch (e) {}
  return Object.assign({}, SETTINGS_DEFAULT, { llm: Object.assign({}, SETTINGS_DEFAULT.llm) });
}

export async function getSettings() {
  return loadSettings();
}

export async function updateSettings(patch) {
  const next = Object.assign(loadSettings(), patch, {
    llm: Object.assign(loadSettings().llm, patch.llm || {}),
  });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch (e) {}
  return next;
}
