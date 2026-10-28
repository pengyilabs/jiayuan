import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import { listListings, subscribe, formatPrice } from '../lib/store.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import './AgentFeed.css';

const IMG = '/images/listings/';

const SIBLING_COUNT = { condo: 4, garden: 4, loft: 3, town: 3, view: 3, villa: 4 };

const PLATFORMS = [
  { id: 'Facebook', key: 'platform_fb', color: '#1877F2', icon: 'f', tagCls: 'tag-fb' },
  { id: 'wx', key: 'platform_wx', color: '#07C160', icon: 'W', tagCls: 'tag-wx' },
  { id: 'wxch', key: 'platform_wxch', color: '#FF6B2C', icon: 'W', tagCls: 'tag-wxch' },
  { id: 'Instagram', key: 'platform_ig', color: '#E1306C', icon: 'ig', tagCls: 'tag-ig' }
];

const STATUS_LABEL_KEY = {
  published: 'status_published',
  pending: 'status_pending',
  draft: 'status_draft',
  rejected: 'status_rejected',
  active: 'status_active',
  sold: 'status_sold'
};

const STATUS_CLS = {
  published: 'status-published',
  pending: 'status-pending',
  draft: 'status-draft',
  rejected: 'status-rejected',
  active: 'status-active',
  sold: 'status-sold'
};

const LOCALES = { zh: 'zh-CN', en: 'en-US', fr: 'fr-FR', es: 'es-ES' };

function siblingImages(image) {
  const src = image || IMG + 'condo1.jpg';
  const m = /\/([a-z]+)(\d+)\.jpg$/i.exec(src);
  if (!m) return [src];
  const prefix = m[1].toLowerCase();
  const max = SIBLING_COUNT[prefix];
  if (!max) return [src];
  const start = (Number(m[2]) - 1) % max;
  const out = [];
  for (let i = 0; i < Math.min(3, max); i++) out.push(`${IMG}${prefix}${((start + i) % max) + 1}.jpg`);
  return out;
}

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateGroupLabel(dateStr, lang, t) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  let formatted;
  try {
    formatted = new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', {
      weekday: 'short', month: 'long', day: 'numeric'
    }).format(dt);
  } catch (e) {
    formatted = dateStr;
  }
  return dateStr === localISO(new Date()) ? `${t('date_today')} · ${formatted}` : formatted;
}

function listingToItem(l, t) {
  const isRent = l.type === 'rent';
  return {
    kind: 'listing',
    id: l.id,
    date: l.updatedAt,
    title: l.title,
    subtitle: l.location,
    text: l.location,
    price: formatPrice(l.price) + (isRent ? t('per_month') : ''),
    beds: l.beds,
    baths: l.baths,
    area: l.area,
    location: l.location,
    statusKey: l.status,
    typeKey: l.type,
    images: [l.image || IMG + 'condo1.jpg'],
    media: 'single',
    platform: null,
    templateId: null,
    hashtags: ''
  };
}

function Carousel({ images, t }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef(0);
  const total = images.length;
  const go = (i) => setIdx(((i % total) + total) % total);
  return (
    <div className="carousel">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${idx * 100}%)` }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diff = startX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) go(idx + (diff > 0 ? 1 : -1));
        }}
      >
        {images.map((src, i) => <img key={i} src={src} alt="" loading="lazy" />)}
      </div>
      <div className="carousel-dots">
        {images.slice(0, 7).map((_, i) => (
          <button
            type="button"
            key={i}
            className={'carousel-dot' + (i === idx ? ' active' : '')}
            aria-label={String(i + 1)}
            onClick={(e) => { e.stopPropagation(); go(i); }}
          />
        ))}
      </div>
      <button type="button" className="carousel-btn carousel-prev" aria-label={t('btn_prev')} onClick={(e) => { e.stopPropagation(); go(idx - 1); }}>
        <svg viewBox="0 0 24 24"><polyline points="15,4 9,12 15,20" /></svg>
      </button>
      <button type="button" className="carousel-btn carousel-next" aria-label={t('btn_next')} onClick={(e) => { e.stopPropagation(); go(idx + 1); }}>
        <svg viewBox="0 0 24 24"><polyline points="9,4 15,12 9,20" /></svg>
      </button>
    </div>
  );
}

function VideoPlay() {
  return (
    <div className="post-video-play">
      <div><svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19" /></svg></div>
    </div>
  );
}

function PostMedia({ item, variant, t }) {
  const isCarousel = item.media === 'carousel' && item.images.length > 1;
  const isVideo = item.media === 'video';
  const cover = item.images[0] || IMG + 'condo1.jpg';

  if (variant === 'plain') {
    if (isCarousel) return <Carousel images={item.images} t={t} />;
    return (
      <div className={'post-img-wrap' + (isVideo ? ' ratio-169' : '')}>
        <img src={cover} alt="" loading="lazy" />
        {isVideo && <VideoPlay />}
        {isVideo && <div className="post-badge">▶ {t('status_pending')}</div>}
      </div>
    );
  }

  if (isCarousel) {
    return <div className="feed-media"><Carousel images={item.images} t={t} /></div>;
  }
  if (isVideo) {
    return (
      <div className="feed-media">
        <img src={cover} alt="" loading="lazy" />
        <VideoPlay />
      </div>
    );
  }
  return <img className="feed-photo" src={cover} alt="" loading="lazy" />;
}

function PlatformTag({ platform, t }) {
  const p = PLATFORMS.find((x) => x.id === platform);
  return (
    <span className={'post-platform-tag ' + (p ? p.tagCls : 'tag-unknown')} style={p ? undefined : { background: '#999' }}>
      {p ? t(p.key) : platform}
    </span>
  );
}

function PostActions({ item, t, liked, onToggleLike }) {
  return (
    <div className="post-actions">
      <button type="button" className={'post-action' + (liked ? ' liked' : '')} onClick={() => onToggleLike(item.id)}>
        {liked ? t('liked') : t('like')}
      </button>
      <button type="button" className="post-action">{t('comment')}</button>
      <button type="button" className="post-action">{t('share')}</button>
    </div>
  );
}

function PostHeader({ item, t }) {
  return (
    <div className="post-header">
      <div className="post-avatar">HD</div>
      <div className="post-byline">
        <div className="post-author">{t('brand')}</div>
        <div className="post-meta">{item.date}</div>
      </div>
      {item.platform
        ? <PlatformTag platform={item.platform} t={t} />
        : <span className={'post-type-tag ' + (item.typeKey === 'rent' ? 'type-rent' : 'type-sale')}>{t(item.typeKey === 'rent' ? 'rent_label' : 'sale_label')}</span>}
    </div>
  );
}

function PostBadges({ item, t }) {
  return (
    <div className="post-badges">
      {item.kind === 'listing' && (
        <span className={'post-type-tag ' + (item.typeKey === 'rent' ? 'type-rent' : 'type-sale')}>
          {t(item.typeKey === 'rent' ? 'rent_label' : 'sale_label')}
        </span>
      )}
      <span className={'post-status ' + (STATUS_CLS[item.statusKey] || 'status-pending')}>
        {t(STATUS_LABEL_KEY[item.statusKey] || 'status_pending')}
      </span>
    </div>
  );
}

function PlainCard({ item, t, liked, onToggleLike }) {
  return (
    <div className="post-card">
      <PostHeader item={item} t={t} />
      <PostMedia item={item} variant="plain" t={t} />
      <div className="post-body">
        <div className="post-title">{item.title}</div>
        <div className="post-text">{item.text}</div>
        {item.price ? <div className="post-price">{item.price}</div> : null}
        {(item.beds > 0 || item.location) && (
          <div className="post-chips">
            {item.location && <span className="chip">📍 {item.location}</span>}
            {item.beds > 0 && <span className="chip">🛏 {item.beds} {t('beds_unit')}</span>}
            {item.baths > 0 && <span className="chip">🚿 {item.baths} {t('baths_unit')}</span>}
            {item.area > 0 && <span className="chip">📐 {item.area} {t('area_unit')}</span>}
          </div>
        )}
        {item.hashtags ? <div className="post-hashtags">{item.hashtags}</div> : null}
        <PostBadges item={item} t={t} />
      </div>
      <PostActions item={item} t={t} liked={liked} onToggleLike={onToggleLike} />
    </div>
  );
}

function TplDesign({ item, t }) {
  const price = item.price || '';
  const address = `${item.subtitle || item.title} · ${item.beds} ${t('beds_unit')} ${item.baths} ${t('baths_unit')}`;

  if (item.templateId === 1) {
    return (
      <div className="feed-design-a">
        <div className="feed-brand">{t('brand')}</div>
        <div className="feed-price">{price}</div>
        <div className="feed-title">{item.title}</div>
        <PostMedia item={item} variant="a" t={t} />
      </div>
    );
  }
  if (item.templateId === 2) {
    return (
      <div className="feed-design-b">
        <PostMedia item={item} variant="b" t={t} />
        <div className="feed-info">
          <div className="feed-badge">{t('for_sale')}</div>
          <div className="feed-price">{price}</div>
          <div className="feed-address">{address}</div>
        </div>
        <div className="feed-brand">{t('brand_mark')}</div>
      </div>
    );
  }
  if (item.templateId === 3) {
    return (
      <div className="feed-design-c">
        <PostMedia item={item} variant="c" t={t} />
        <div className="feed-overlay">
          <div className="feed-brand">{t('brand')}</div>
          <div className="feed-price">{price}</div>
          <div className="feed-title">{item.title}</div>
          <div className="feed-tag">{t('rent_label')}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="feed-design-d">
      <div className="feed-left">
        <div className="feed-brand">{t('brand_mark')}</div>
        <div className="feed-zh">{item.title}</div>
        <div className="feed-en">{item.subtitle}</div>
      </div>
      <PostMedia item={item} variant="d" t={t} />
      <div className="feed-price-bar">{price}</div>
    </div>
  );
}

function TplCard({ item, t, liked, onToggleLike }) {
  return (
    <div className="feed-tpl">
      <PostHeader item={item} t={t} />
      <TplDesign item={item} t={t} />
      {item.hashtags ? <div className="tpl-hashtags">{item.hashtags}</div> : null}
      <PostActions item={item} t={t} liked={liked} onToggleLike={onToggleLike} />
    </div>
  );
}

function StepsBar({ step }) {
  return (
    <div className="create-steps">
      {[0, 1, 2].map((i) => (
        <div key={i} className={'create-step' + (i < step ? ' done' : i === step ? ' active' : '')} />
      ))}
    </div>
  );
}

function TplOption({ selected, onSelect, name, desc, wide, children }) {
  return (
    <button type="button" className={'tpl-card' + (selected ? ' selected' : '')} style={wide ? { gridColumn: 'span 2' } : undefined} onClick={onSelect}>
      <div className="tpl-preview">{children}</div>
      <div className="tpl-label">
        <div className="tpl-label-name">{name}</div>
        <div className="tpl-label-desc">{desc}</div>
      </div>
    </button>
  );
}

function FormatOption({ selected, onSelect, icon, name, desc }) {
  return (
    <button type="button" className={'format-option' + (selected ? ' selected' : '')} onClick={onSelect}>
      <div className="format-icon">{icon}</div>
      <div className="format-name">{name}</div>
      <div className="format-desc">{desc}</div>
    </button>
  );
}

export default function AgentFeed() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [posts, setPosts] = useState([]);
  const [liked, setLiked] = useState(() => new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [createState, setCreateState] = useState({ platforms: [], templateFormat: 'single' });
  const [toast, setToast] = useState('');
  const feedRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    document.title = t('af_page_title');
  }, [t]);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      listListings().then((items) => { if (alive) setListings(items); });
    };
    refresh();
    const unsub = subscribe(refresh);
    return () => { alive = false; unsub(); };
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const feedItems = useMemo(() => {
    const listingItems = listings.map((l) => listingToItem(l, t));
    return [...posts, ...listingItems];
  }, [listings, posts, t]);

  const groups = useMemo(() => {
    const map = new Map();
    feedItems.forEach((item) => {
      const date = item.date || localISO(new Date());
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(item);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [feedItems]);

  function toggleLike(id) {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }

  function logout() {
    try { sessionStorage.removeItem('pp-role'); } catch (e) {}
    navigate('/login');
  }

  function openCreate() {
    setCreateStep(0);
    setCreateState({ platforms: [], templateFormat: 'single' });
    setSheetOpen(true);
  }

  function closeCreate() {
    setSheetOpen(false);
  }

  function selectListing(id) {
    setCreateState((s) => ({ ...s, listingId: id }));
  }

  function togglePlatform(id) {
    setCreateState((s) => ({
      ...s,
      platforms: s.platforms.indexOf(id) === -1 ? [...s.platforms, id] : s.platforms.filter((p) => p !== id)
    }));
  }

  function selectTemplate(id) {
    setCreateState((s) => ({ ...s, templateId: id }));
  }

  function selectFormat(fmt) {
    setCreateState((s) => ({ ...s, templateFormat: fmt }));
  }

  function confirmPost() {
    const listing = listings.find((l) => l.id === createState.listingId) || null;
    const hasTemplate = createState.templateId !== undefined && createState.templateId !== null;
    const fmt = createState.templateFormat || 'single';
    const date = localISO(new Date());
    const title = listing ? `${listing.title} · ${t('post_title_suffix')}` : t('post_new_title');
    const price = listing ? formatPrice(listing.price) + (listing.type === 'rent' ? t('per_month') : '') : '';
    const baseImage = listing ? listing.image : IMG + 'condo3.jpg';

    let media = 'single';
    let images = [baseImage];
    if (hasTemplate) {
      if (fmt === 'carousel') {
        const multi = siblingImages(baseImage);
        if (multi.length > 1) { media = 'carousel'; images = multi; }
      } else if (fmt === 'video') {
        media = 'video';
      }
    }

    const created = createState.platforms.map((platform, i) => ({
      kind: 'post',
      id: 'p-' + Date.now().toString(36) + '-' + i,
      date,
      title,
      subtitle: listing ? listing.location : '',
      text: listing
        ? `${listing.title}，${listing.beds} ${t('beds_unit')} ${listing.baths} ${t('baths_unit')}，${formatPrice(listing.price)}`
        : t('post_new_desc'),
      price,
      beds: listing ? listing.beds : 0,
      baths: listing ? listing.baths : 0,
      area: listing ? listing.area : 0,
      location: '',
      statusKey: 'pending',
      typeKey: listing ? listing.type : 'sale',
      images,
      media,
      platform,
      templateId: hasTemplate ? createState.templateId : null,
      hashtags: ''
    }));

    setPosts((prev) => [...created, ...prev]);
    setSheetOpen(false);
    showToast(`${created.length} ${t('toast_posted')}`);
    if (feedRef.current) feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const selCount = createState.platforms.length;

  let sheetTitle = t('select_listing');
  let sheetBody = null;
  let sheetFooter = null;

  if (createStep === 0) {
    sheetTitle = t('select_listing');
    sheetBody = (
      <Fragment>
        <StepsBar step={0} />
        <div className="step-label">{t('step_of_1')}</div>
        <div className="step-title">{t('step_1')}</div>
        {listings.map((l) => (
          <button
            type="button"
            key={l.id}
            className={'listing-option' + (createState.listingId === l.id ? ' selected' : '')}
            onClick={() => selectListing(l.id)}
          >
            <img className="listing-thumb" src={l.image} alt="" />
            <div className="listing-info">
              <div className="listing-name">{l.title}</div>
              <div className="listing-detail">
                {l.beds} {t('beds_unit')} {l.baths} {t('baths_unit')} · {t(l.type === 'rent' ? 'rent_label' : 'sale_label')}
              </div>
              <div className="listing-price">{formatPrice(l.price)}{l.type === 'rent' ? t('per_month') : ''}</div>
            </div>
          </button>
        ))}
        <button
          type="button"
          className={'listing-option' + (createState.listingId === null ? ' selected' : '')}
          onClick={() => selectListing(null)}
        >
          <div className="listing-thumb listing-thumb-note">📝</div>
          <div className="listing-info">
            <div className="listing-name">{t('no_listing')}</div>
            <div className="listing-detail">{t('no_listing_desc')}</div>
          </div>
        </button>
      </Fragment>
    );
    sheetFooter = (
      <Fragment>
        <button type="button" className="btn btn-ghost" onClick={closeCreate}>{t('btn_cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={createState.listingId === undefined} onClick={() => setCreateStep(1)}>
          {t('btn_next')}
        </button>
      </Fragment>
    );
  } else if (createStep === 1) {
    sheetTitle = t('select_platform');
    sheetBody = (
      <Fragment>
        <StepsBar step={1} />
        <div className="step-label">{t('step_of_2')}</div>
        <div className="step-title">{t('step_2')}{selCount ? ` (${selCount})` : ''}</div>
        <div className="platform-grid">
          {PLATFORMS.map((p) => (
            <button
              type="button"
              key={p.id}
              className={'platform-option' + (createState.platforms.indexOf(p.id) >= 0 ? ' selected' : '')}
              onClick={() => togglePlatform(p.id)}
            >
              <div className="platform-icon" style={{ background: p.color }}>{p.icon}</div>
              <div className="platform-name">{t(p.key)}</div>
            </button>
          ))}
        </div>
      </Fragment>
    );
    sheetFooter = (
      <Fragment>
        <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(0)}>{t('btn_prev')}</button>
        <button type="button" className="btn btn-primary" disabled={!selCount} onClick={() => setCreateStep(2)}>{t('btn_next')}</button>
      </Fragment>
    );
  } else {
    sheetTitle = t('select_template');
    const tplSelected = createState.templateId !== undefined && createState.templateId !== null;
    sheetBody = (
      <Fragment>
        <StepsBar step={2} />
        <div className="step-label">{t('step_of_3')}</div>
        <div className="step-title">{t('step_3')}</div>
        <div className="template-grid">
          <TplOption selected={createState.templateId === 1} onSelect={() => selectTemplate(1)} name={t('tpl_name_a')} desc={t('tpl_desc_a')}>
            <div className="tpl-design-a">
              <div className="tpl-brand">{t('brand')}</div>
              <div className="tpl-price">{t('hero_price')}</div>
              <div className="tpl-title">{t('hero_title')}</div>
              <img className="tpl-photo" src={IMG + 'condo1.jpg'} alt="" />
            </div>
          </TplOption>
          <TplOption selected={createState.templateId === 2} onSelect={() => selectTemplate(2)} name={t('tpl_name_b')} desc={t('tpl_desc_b')}>
            <div className="tpl-design-b">
              <img className="tpl-photo" src={IMG + 'villa1.jpg'} alt="" />
              <div className="tpl-info">
                <div className="tpl-badge">{t('for_sale')}</div>
                <div className="tpl-price">{t('tpl_sample_price')}</div>
                <div className="tpl-address">{t('tpl_sample_address')}</div>
              </div>
              <div className="tpl-brand">{t('brand_mark')}</div>
            </div>
          </TplOption>
          <TplOption selected={createState.templateId === 3} onSelect={() => selectTemplate(3)} name={t('tpl_name_c')} desc={t('tpl_desc_c')}>
            <div className="tpl-design-c">
              <img className="tpl-photo" src={IMG + 'condo1.jpg'} alt="" />
              <div className="tpl-overlay">
                <div className="tpl-brand">{t('brand')}</div>
                <div className="tpl-price">{t('rent_price')}</div>
                <div className="tpl-title">{t('hero_title')} · {t('rent_label')}</div>
                <div className="tpl-tag">{t('rent_label')}</div>
              </div>
            </div>
          </TplOption>
          <TplOption selected={createState.templateId === 5} onSelect={() => selectTemplate(5)} name={t('tpl_name_d')} desc={t('tpl_desc_d')}>
            <div className="tpl-design-d">
              <div className="tpl-left">
                <div className="tpl-brand">{t('brand_mark')}</div>
                <div className="tpl-zh">{t('bi_title')}</div>
                <div className="tpl-en">{t('bi_sub')}</div>
              </div>
              <img className="tpl-photo" src={IMG + 'villa1.jpg'} alt="" />
              <div className="tpl-price">{t('hero_price')}</div>
            </div>
          </TplOption>
          <TplOption wide selected={createState.templateId === null} onSelect={() => selectTemplate(null)} name={t('tpl_name_blank')} desc={t('tpl_blank_desc')}>
            <div className="tpl-blank">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              <span>{t('no_template')}</span>
            </div>
          </TplOption>
        </div>
        {tplSelected && (
          <div className="format-block">
            <div className="step-title format-title">{t('format_title')}</div>
            <div className="format-grid">
              <FormatOption selected={createState.templateFormat === 'carousel'} onSelect={() => selectFormat('carousel')} icon="🖼" name={t('format_carousel')} desc={t('format_carousel_desc')} />
              <FormatOption selected={createState.templateFormat === 'single'} onSelect={() => selectFormat('single')} icon="📷" name={t('format_single')} desc={t('format_single_desc')} />
              <FormatOption selected={createState.templateFormat === 'video'} onSelect={() => selectFormat('video')} icon="▶" name={t('format_video')} desc={t('format_video_desc')} />
            </div>
          </div>
        )}
      </Fragment>
    );
    sheetFooter = (
      <Fragment>
        <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(1)}>{t('btn_prev')}</button>
        <button type="button" className="btn btn-primary" onClick={confirmPost}>{t('btn_confirm')}</button>
      </Fragment>
    );
  }

  return (
    <div className="af-page">
      <div className="status-bar" />

      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">HD</div>
          <div className="topbar-title">{t('brand_mark')}</div>
        </div>
        <div className="topbar-actions">
          <LanguageSwitcher />
          <button type="button" className="topbar-icon" aria-label={t('aria_search')}>
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
          <button type="button" className="topbar-icon" aria-label={t('aria_notifications')}>
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          </button>
          <button type="button" className="topbar-icon" aria-label={t('aria_logout')} onClick={logout}>
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </header>

      <div className="feed" ref={feedRef}>
        {groups.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
            <p>{t('feed_empty')}</p>
          </div>
        ) : groups.map(([date, items]) => (
          <Fragment key={date}>
            <div className="date-group">
              <div className="date-group-label">
                {dateGroupLabel(date, lang, t)}
                <span className="date-group-count">{items.length} {t('posts_unit')}</span>
              </div>
            </div>
            {items.map((item) => (
              item.templateId
                ? <TplCard key={item.id} item={item} t={t} liked={liked.has(item.id)} onToggleLike={toggleLike} />
                : <PlainCard key={item.id} item={item} t={t} liked={liked.has(item.id)} onToggleLike={toggleLike} />
            ))}
          </Fragment>
        ))}
      </div>

      <nav className="bottom-nav">
        <button type="button" className="nav-btn active" onClick={() => navigate('/feed')}>
          <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          <span>{t('nav_feed')}</span>
        </button>
        <button type="button" className="nav-btn nav-btn-create" onClick={openCreate}>
          <div className="nav-create-icon">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </div>
          <span>{t('nav_create')}</span>
        </button>
        <button type="button" className="nav-btn" onClick={() => navigate('/listings')}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          <span>{t('nav_listings')}</span>
        </button>
      </nav>

      <div className={'sheet-overlay' + (sheetOpen ? ' open' : '')} onClick={(e) => { if (e.target === e.currentTarget) closeCreate(); }}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div className="sheet-title">{sheetTitle}</div>
            <button type="button" className="sheet-close" aria-label={t('btn_cancel')} onClick={closeCreate}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="sheet-body">{sheetBody}</div>
          <div className="sheet-footer">{sheetFooter}</div>
        </div>
      </div>

      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
    </div>
  );
}
