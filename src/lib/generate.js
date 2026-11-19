// Generation façade for post drafts (M4 / B7). One entry point covers the
// three run modes: 1 post × 1 listing ('single'), N posts × 1 listing
// ('listing_batch') and N × M listings ('multi_listing').
//
// When the Xiaomi MiMo config is present (settings.llm.enabled + apiKey) copy
// is drafted through the OpenAI-compatible chat API; on ANY failure — no key,
// CORS, network error, non-2xx, timeout or unparseable JSON — it falls back
// silently to the template builder so the demo always works offline.
//
// `generatePostText(listing, opts)` returns `{ title, text, hashtags, engine }`
// where `engine` is 'mimo' | 'template' — the provenance callers store on the
// post. `generateDrafts({ listings, countPerListing, ... })` runs the batch
// modes sequentially and returns draft records ready for `createPost`.
import { formatPrice, getSettings, getBuilding } from './store.js';

const LLM_TIMEOUT_MS = 15000;
const FALLBACK_MODEL = 'mimo-v2.6-flash';
const FALLBACK_BASE_URL = 'https://api.xiaomimimo.com/v1';
const MAX_IMAGES = 4;

// B7 batch UI: posts per property is capped at 10 so a run stays reviewable.
export const MAX_POSTS_PER_LISTING = 10;

// Tone rotation for batch runs: several posts for one listing must read
// differently (B7). Also the `angle` vocabulary accepted by generatePostText.
export const GEN_ANGLES = ['featured', 'lifestyle', 'deal', 'location', 'amenities'];

const ANGLE_HINTS = {
  featured: 'present the property as a fresh, featured listing worth acting on now',
  lifestyle: 'paint the everyday lifestyle the property enables',
  deal: 'emphasize value for money and the investment angle',
  location: 'lead with the neighbourhood and what surrounds the property',
  amenities: 'lead with the building amenities and services',
};

const PLATFORM_TONES = {
  Facebook: 'casual and conversational',
  Instagram: 'upbeat and visual, hashtag-heavy',
  wx: 'warm and concise, friendly to a Chinese-market audience',
  wxch: 'warm and concise, friendly to a Chinese-market audience',
};

const COUNTRY_TAGS = { CR: 'CostaRica', CA: 'Canada', CN: 'China' };

export async function generatePostText(listing, opts = {}) {
  const t = opts.t || ((k) => k);
  if (!listing) {
    return { title: '', text: opts.emptyText || t('post_new_desc'), hashtags: '', engine: 'template' };
  }

  const building = listing.buildingId ? await getBuilding(listing.buildingId) : null;

  const llm = await generateWithMimo(listing, building, opts);
  if (llm) {
    return {
      title: llm.title,
      text: llm.text,
      hashtags: llm.hashtags || buildHashtags(listing, building),
      engine: 'mimo',
    };
  }

  const tpl = buildTemplateCopy(listing, building, opts, t);
  return { title: '', text: tpl.text, hashtags: tpl.hashtags, engine: 'template' };
}

// Batch generation (B7): for each listing × each of `countPerListing` posts
// produce a draft record ready for createPost:
//   { listingId, listingTitle, title, text, hashtags, images, media, date,
//     generation: { mode, engine } }
// Drafts run SEQUENTIALLY (rate limits) and each falls back to the template
// engine independently. `onProgress(done, total)` reports per-draft progress.
export async function generateDrafts(params = {}) {
  const listings = Array.isArray(params.listings) ? params.listings : [];
  const count = Math.min(MAX_POSTS_PER_LISTING, Math.max(1, Number(params.countPerListing) || 1));
  const platforms = Array.isArray(params.platforms) ? params.platforms : [];
  const date = params.date || '';
  const t = params.t || ((k) => k);
  const mode = listings.length > 1 ? 'multi_listing' : count > 1 ? 'listing_batch' : 'single';
  const total = listings.length * count;

  const drafts = [];
  let done = 0;
  for (const listing of listings) {
    const images = await assembleImages(listing);
    for (let v = 0; v < count; v++) {
      const angle = params.angle || GEN_ANGLES[done % GEN_ANGLES.length];
      const res = await generatePostText(listing, {
        t,
        angle,
        variantIndex: v,
        platforms,
      });
      const set = rotateImages(images, v);
      drafts.push({
        listingId: listing.id,
        listingTitle: listing.title || '',
        title: res.title || `${listing.title} · ${t('post_title_suffix')}`,
        text: res.text,
        hashtags: res.hashtags,
        images: set,
        media: set.length > 1 ? 'carousel' : 'single',
        date,
        generation: { mode, engine: res.engine },
      });
      done += 1;
      if (params.onProgress) params.onProgress(done, total);
    }
  }
  return drafts;
}

// Images: listing photos first, then the linked building's gallery to fill up
// to 4 (A4 — no per-post re-upload). Media is carousel only when >1.
async function assembleImages(listing) {
  const out = [];
  const push = (src) => {
    if (src && out.length < MAX_IMAGES && out.indexOf(src) < 0) out.push(src);
  };
  (listing.photos || []).forEach(push);
  push(listing.cover);
  push(listing.image);
  if (out.length < MAX_IMAGES && listing.buildingId) {
    const building = await getBuilding(listing.buildingId);
    ((building && building.photos) || []).forEach((p) => push(p && p.src));
  }
  return out;
}

// Different starting photo per variant so several posts for one listing do not
// all lead with the same image.
function rotateImages(images, variantIndex) {
  if (images.length <= 1) return images.slice();
  const start = variantIndex % images.length;
  return images.slice(start).concat(images.slice(0, start));
}

// ── MiMo path (OpenAI-compatible chat completions) ─────────────────────────

async function generateWithMimo(listing, building, opts) {
  const settings = await getSettings();
  const cfg = settings && settings.llm;
  if (!cfg || !cfg.enabled || !cfg.apiKey) return null;

  const url = String(cfg.baseUrl || FALLBACK_BASE_URL).replace(/\/+$/, '') + '/chat/completions';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + cfg.apiKey,
      },
      body: JSON.stringify({
        model: cfg.model || FALLBACK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt(listing, opts) },
          { role: 'user', content: propertyPrompt(listing, building, opts) },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    return parseModelContent(content);
  } catch (e) {
    return null; // any failure (CORS, network, abort, JSON) falls back to templates
  } finally {
    clearTimeout(timer);
  }
}

// Copy stays English unless the listing notes suggest a Chinese-market post.
function outputLanguage(listing) {
  return /[一-鿿]/.test(String((listing && listing.notes) || '')) ? 'Simplified Chinese' : 'English';
}

function systemPrompt(listing, opts) {
  const platforms = (opts.platforms || []).filter((p) => PLATFORM_TONES[p]);
  const tone = platforms.length
    ? 'Target platforms: ' + platforms.map((p) => p + ' (' + PLATFORM_TONES[p] + ')').join(', ') + '.'
    : 'Target platform: Facebook (casual and conversational).';
  return [
    'You write short social-media real-estate captions.',
    tone,
    'Write in ' + outputLanguage(listing) + '.',
    'Never mention commission, fees, the owner or any phone number; deal terms are internal and must not appear.',
    'Use only the facts given by the user; never invent details.',
    'Respond with a single JSON object and nothing else: {"title": "...", "text": "...", "hashtags": "#tag1 #tag2"}',
    'text: at most about 100 words, short paragraphs. hashtags: 4 to 6 tags separated by spaces.',
  ].join('\n');
}

function propertyPrompt(listing, building, opts) {
  const parts = [];
  parts.push('Property: ' + listing.title);
  parts.push('Offer: ' + (listing.type === 'rent' ? 'for rent' : 'for sale'));
  if (listing.location) parts.push('Location: ' + listing.location);
  parts.push(`Details: ${listing.beds || 0} bedrooms, ${listing.baths || 0} bathrooms, ${listing.area || 0} m²`);
  parts.push('Price: ' + formatPrice(listing.price, listing.currency) + (listing.type === 'rent' ? ' per month' : ''));
  parts.push('Pet policy: ' + (listing.petPolicy || 'yes'));
  if (building) {
    if (building.name) parts.push('Building: ' + building.name);
    const amenities = (building.amenities || []).map((a) => String(a).replace(/_/g, ' '));
    if (amenities.length) parts.push('Building amenities: ' + amenities.join(', '));
  }
  const angle = GEN_ANGLES.indexOf(opts.angle) >= 0 ? opts.angle : 'featured';
  parts.push('Angle: ' + ANGLE_HINTS[angle] + '.');
  if (opts.variantIndex > 0) {
    parts.push(
      'This is variant ' + (opts.variantIndex + 1) + ' for the same property; open differently from a previous version.'
    );
  }
  return parts.join('\n');
}

// The model must return a JSON object; strip markdown fences and parse
// defensively — anything unexpected returns null so the caller falls back.
function parseModelContent(content) {
  if (typeof content !== 'string' || !content.trim()) return null;
  const s = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let obj;
  try {
    obj = JSON.parse(s.slice(start, end + 1));
  } catch (e) {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  const text = typeof obj.text === 'string' ? obj.text.trim() : '';
  if (!text) return null;
  return {
    title: typeof obj.title === 'string' ? obj.title.trim() : '',
    text,
    hashtags: typeof obj.hashtags === 'string' ? obj.hashtags.replace(/\s+/g, ' ').trim() : '',
  };
}

// ── Template fallback ───────────────────────────────────────────────────────

function buildTemplateCopy(listing, building, opts, t) {
  const angle = GEN_ANGLES.indexOf(opts.angle) >= 0 ? opts.angle : 'featured';

  const spec = [
    `${listing.beds || 0} ${t('beds_unit')}`,
    `${listing.baths || 0} ${t('baths_unit')}`,
    listing.area ? `${listing.area} ${t('area_unit')}` : '',
    formatPrice(listing.price, listing.currency) + (listing.type === 'rent' ? t('per_month') : ''),
  ]
    .filter(Boolean)
    .join(' · ');

  const features = [];
  const amenities = ((building && building.amenities) || []).slice(0, 4).map((a) => t('bg_amenity_' + a));
  if (amenities.length) features.push(amenities.join(' · '));
  features.push(
    t('ls_pet_chip_' + (['yes', 'no', 'restricted'].indexOf(listing.petPolicy) >= 0 ? listing.petPolicy : 'yes'))
  );

  const text = [t('gen_open_' + angle), `${listing.title} — ${spec}`, features.join(' · '), t('gen_cta')]
    .filter(Boolean)
    .join('\n');

  return { text, hashtags: buildHashtags(listing, building) };
}

function buildHashtags(listing, building) {
  const tags = ['#HOMEDIRECT'];
  const city = String(listing.location || '')
    .split('·')[0]
    .trim()
    .replace(/\s+/g, '');
  if (city) tags.push('#' + city);
  if (building && building.name) tags.push('#' + String(building.name).replace(/\s+/g, ''));
  if (COUNTRY_TAGS[listing.country]) tags.push('#' + COUNTRY_TAGS[listing.country]);
  tags.push(listing.type === 'rent' ? '#ForRent' : '#ForSale');
  return tags.join(' ');
}
