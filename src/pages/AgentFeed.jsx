import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import {
  listListings, listPosts, createPost, deletePost, subscribe, formatPrice
} from '../lib/store.js';
import TopBar from '../components/TopBar.jsx';
import './AgentFeed.css';

const IMG = '/images/listings/';

const SIBLING_COUNT = { condo: 4, garden: 4, loft: 3, town: 3, view: 3, villa: 4 };

const PLATFORMS = [
  { id: 'Facebook', key: 'platform_fb', color: '#1877F2', icon: 'f', tagCls: 'tag-fb' },
  { id: 'wx', key: 'platform_wx', color: '#07C160', icon: 'W', tagCls: 'tag-wx' },
  { id: 'wxch', key: 'platform_wxch', color: '#FF6B2C', icon: 'W', tagCls: 'tag-wxch' },
  { id: 'Instagram', key: 'platform_ig', color: '#E1306C', icon: 'ig', tagCls: 'tag-ig' }
];

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

function parseDay(iso) {
  return new Date(String(iso).slice(0, 10) + 'T00:00:00');
}

function formatWeekday(iso, lang) {
  return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { weekday: 'short' }).format(parseDay(iso));
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

function groupByDay(items) {
  const map = new Map();
  for (const item of items) {
    const key = String(item.date || '').slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function VideoPlay() {
  return (
    <div className="post-video-play">
      <div><svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19" /></svg></div>
    </div>
  );
}

function PostMedia({ post }) {
  const cover = post.images[0] || IMG + 'condo1.jpg';
  const isVideo = post.media === 'video';
  const isCarousel = post.media === 'carousel' && post.images.length > 1;
  return (
    <div className="post-img-wrap">
      <img src={cover} alt="" loading="lazy" />
      {isVideo && <VideoPlay />}
      {isCarousel && (
        <div className="af-stack">
          {post.images.slice(1, 4).map((src, i) => <img key={i} src={src} alt="" loading="lazy" />)}
          <span className="af-stack-count">{post.images.length}</span>
        </div>
      )}
    </div>
  );
}

function PlatformTag({ platform, t }) {
  const p = PLATFORMS.find((x) => x.id === platform);
  return (
    <span className={'post-platform-tag ' + (p ? p.tagCls : 'tag-unknown')} style={p ? undefined : { background: '#999' }}>
      {p ? t(p.key) : platform}
    </span>
  );
}

function PostCard({ post, t, liked, onToggleLike, onDelete }) {
  return (
    <article className="post-card">
      <div className="post-header">
        <div className="post-avatar">HD</div>
        <div className="post-byline">
          <div className="post-author">{t('brand')}</div>
          <div className="post-meta">{post.date}</div>
        </div>
        <PlatformTag platform={post.platform} t={t} />
      </div>
      <PostMedia post={post} />
      <div className="post-body">
        <div className="post-title">{post.title}</div>
        <div className="post-text">{post.text}</div>
        {post.hashtags ? <div className="post-hashtags">{post.hashtags}</div> : null}
        {post.listingTitle ? (
          <Link className="af-post-promo" to="/listings">{t('af_promotes')} · {post.listingTitle}</Link>
        ) : null}
      </div>
      <div className="post-actions">
        <button type="button" className={'post-action' + (liked ? ' liked' : '')} onClick={() => onToggleLike(post.id)}>
          {liked ? t('liked') : t('like')}
        </button>
        <button
          type="button"
          className="post-action af-post-delete"
          aria-label={t('ls_card_delete')}
          onClick={() => onDelete(post.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
          {t('ls_card_delete')}
        </button>
      </div>
    </article>
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
  const [listings, setListings] = useState([]);
  const [posts, setPosts] = useState([]);
  const [liked, setLiked] = useState(() => new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [createState, setCreateState] = useState({ platforms: [], templateFormat: 'single' });
  const [toast, setToast] = useState('');
  const [activeDay, setActiveDay] = useState('');
  const toastTimer = useRef(null);

  useEffect(() => {
    document.title = `${t('af_heading')} — ${t('brand_mark')}`;
  }, [t]);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      listListings().then((items) => { if (alive) setListings(items); });
      listPosts().then((items) => { if (alive) setPosts(items); });
    };
    refresh();
    const unsub = subscribe(refresh);
    return () => { alive = false; unsub(); };
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const sorted = useMemo(
    () => posts.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [posts]
  );
  const days = useMemo(() => groupByDay(sorted), [sorted]);
  const today = localISO(new Date());

  useEffect(() => {
    if (days.length === 0) {
      setActiveDay('');
      return;
    }
    setActiveDay((cur) => (days.some(([key]) => key === cur) ? cur : days[0][0]));
  }, [days]);

  useEffect(() => {
    if (days.length === 0) return undefined;
    const order = new Map(days.map(([key], i) => [key, i]));
    const seen = new Map();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
      const visible = [...seen.entries()]
        .filter(([, ok]) => ok)
        .map(([id]) => id.replace('af-day-', ''))
        .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
      if (visible.length > 0) setActiveDay(visible[0]);
    }, { rootMargin: '-140px 0px -55% 0px' });
    for (const [key] of days) {
      const el = document.getElementById('af-day-' + key);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [days]);

  function jumpToDay(key) {
    setActiveDay(key);
    const el = document.getElementById('af-day-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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

  async function handleDelete(id) {
    await deletePost(id);
    showToast(t('af_toast_deleted'));
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

  async function confirmPost() {
    const listing = listings.find((l) => l.id === createState.listingId) || null;
    const hasTemplate = createState.templateId !== undefined && createState.templateId !== null;
    const fmt = createState.templateFormat || 'single';
    const date = localISO(new Date());
    const title = listing ? `${listing.title} · ${t('post_title_suffix')}` : t('post_new_title');
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

    const text = listing
      ? `${listing.title}，${listing.beds} ${t('beds_unit')} ${listing.baths} ${t('baths_unit')}，${formatPrice(listing.price)}`
      : t('post_new_desc');

    for (const platform of createState.platforms) {
      await createPost({
        listingId: listing ? listing.id : null,
        listingTitle: listing ? listing.title : '',
        title,
        text,
        images,
        media,
        platform,
        templateId: hasTemplate ? createState.templateId : null,
        hashtags: '',
        date
      });
    }

    setSheetOpen(false);
    showToast(`${createState.platforms.length} ${t('toast_posted')}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <TopBar />

      <header className="af-header">
        <div className="af-header-bar">
          <div className="af-header-left">
            <span className="af-eyebrow">{t('af_eyebrow')}</span>
            <h1 className="af-title">{t('af_heading')}</h1>
          </div>
          <button type="button" className="af-btn af-btn-accent" onClick={openCreate}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            <span>{t('af_create_post')}</span>
          </button>
        </div>
      </header>

      <div className="af-feed">
        {days.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
            <p>{t('feed_empty')}</p>
            <button type="button" className="af-btn af-btn-accent af-empty-btn" onClick={openCreate}>{t('af_create_post')}</button>
          </div>
        ) : (
          <div className="af-social-feed">
            <nav className="af-date-rail" aria-label={t('af_date_rail_label')}>
              {days.map(([key]) => (
                <button
                  key={key}
                  type="button"
                  className={
                    'af-date-pill' +
                    (activeDay === key ? ' af-active' : '') +
                    (key === today ? ' af-today' : '')
                  }
                  onClick={() => jumpToDay(key)}
                >
                  <span className="af-dr-weekday">{formatWeekday(key, lang)}</span>
                  <span className="af-dr-day">{parseDay(key).getDate()}</span>
                  <span className="af-dr-dot" />
                </button>
              ))}
            </nav>
            <div className="af-day-rows">
              {days.map(([key, dayPosts]) => (
                <section className="af-day-section" id={'af-day-' + key} key={key}>
                  <div className="af-day-header">
                    <h2 className="af-day-date">{dateGroupLabel(key, lang, t)}</h2>
                    <span className="af-day-count">{dayPosts.length} {t('posts_unit')}</span>
                  </div>
                  <div className="af-day-posts">
                    {dayPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        t={t}
                        liked={liked.has(post.id)}
                        onToggleLike={toggleLike}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>

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
