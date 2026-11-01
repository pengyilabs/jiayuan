import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../lib/i18n.jsx';
import TopBar from '../components/TopBar.jsx';
import {
  subscribe, listListings, createListing, updateListing,
  deleteListing, getStats, formatPrice
} from '../lib/store.js';
import './Listings.css';

const IMAGES = [
  '/images/listings/condo1.jpg',
  '/images/listings/condo2.jpg',
  '/images/listings/condo3.jpg',
  '/images/listings/condo4.jpg',
  '/images/listings/garden1.jpg',
  '/images/listings/garden2.jpg',
  '/images/listings/garden3.jpg',
  '/images/listings/garden4.jpg',
  '/images/listings/loft1.jpg',
  '/images/listings/loft2.jpg',
  '/images/listings/loft3.jpg',
  '/images/listings/town1.jpg',
  '/images/listings/town2.jpg',
  '/images/listings/town3.jpg',
  '/images/listings/view1.jpg',
  '/images/listings/view2.jpg',
  '/images/listings/view3.jpg',
  '/images/listings/villa1.jpg',
  '/images/listings/villa2.jpg',
  '/images/listings/villa3.jpg',
  '/images/listings/villa4.jpg'
];

const DEFAULT_IMAGE = '/images/listings/condo1.jpg';

const EMPTY_FORM = {
  title: '', type: 'sale', status: 'active', price: '', location: '',
  beds: '', baths: '', area: '', agent: '', image: DEFAULT_IMAGE
};

const LOCALES = { zh: 'zh-CN', en: 'en-US', fr: 'fr-FR', es: 'es-ES' };

const CHIPS = [
  { id: 'all', labelKey: 'ls_filter_all', get: (s) => s.total },
  { id: 'active', labelKey: 'ls_status_active', get: (s) => s.active },
  { id: 'pending', labelKey: 'ls_status_pending', get: (s) => s.pending },
  { id: 'sold', labelKey: 'ls_status_sold', get: (s) => s.sold },
  { id: 'sale', labelKey: 'ls_type_sale', get: (s) => s.forSale },
  { id: 'rent', labelKey: 'ls_type_rent', get: (s) => s.forRent }
];

function chipFilter(id) {
  if (id === 'sale' || id === 'rent') return { type: id };
  if (id === 'all') return {};
  return { status: id };
}

function parseDay(iso) {
  return new Date(String(iso).slice(0, 10) + 'T00:00:00');
}

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function formatDayLong(iso, lang) {
  return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(parseDay(iso));
}

function formatWeekday(iso, lang) {
  return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { weekday: 'short' }).format(parseDay(iso));
}

function formatDayShort(iso, lang) {
  return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(parseDay(iso));
}

function groupByDay(items) {
  const map = new Map();
  for (const item of items) {
    const key = String(item.updatedAt || '').slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export default function Listings() {
  const { t, lang } = useLang();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [chip, setChip] = useState('all');
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [activeDay, setActiveDay] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 220);
    return () => clearTimeout(id);
  }, [search]);

  const refresh = useCallback(async () => {
    const req = ++reqRef.current;
    const filter = Object.assign({}, chipFilter(chip), q ? { q } : {});
    const [list, s] = await Promise.all([
      listListings(filter),
      getStats()
    ]);
    if (req !== reqRef.current) return;
    setItems(list);
    setStats(s);
  }, [chip, q]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => subscribe(refresh), [refresh]);

  useEffect(() => { document.title = t('ls_page_title'); }, [t]);

  const sorted = useMemo(
    () => items.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)),
    [items]
  );
  const days = useMemo(() => groupByDay(sorted), [sorted]);
  const today = todayIso();

  useEffect(() => {
    if (days.length === 0) {
      setActiveDay('');
      return;
    }
    setActiveDay((cur) => (days.some(([key]) => key === cur) ? cur : days[0][0]));
  }, [days]);

  useEffect(() => {
    if (view !== 'by-date' || days.length === 0) return undefined;
    const order = new Map(days.map(([key], i) => [key, i]));
    const seen = new Map();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
      const visible = [...seen.entries()]
        .filter(([, ok]) => ok)
        .map(([id]) => id.replace('od-day-', ''))
        .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
      if (visible.length > 0) setActiveDay(visible[0]);
    }, { rootMargin: '-140px 0px -55% 0px' });
    for (const [key] of days) {
      const el = document.getElementById('od-day-' + key);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [view, days]);

  useEffect(() => {
    if (!modal && !deleteTarget) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (deleteTarget) setDeleteTarget(null);
      else setModal(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, deleteTarget]);

  function jumpToDay(key) {
    setActiveDay(key);
    const el = document.getElementById('od-day-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollDay(e, dir) {
    const wrap = e.currentTarget.closest('.od-day-scroll-wrap');
    const row = wrap && wrap.querySelector('.od-day-scroll');
    if (row) row.scrollBy({ left: dir * 672, behavior: 'smooth' });
  }

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setModal({ mode: 'add' });
  }

  function openEdit(item) {
    setForm({
      title: item.title,
      type: item.type,
      status: item.status,
      price: String(item.price ?? ''),
      location: item.location,
      beds: String(item.beds ?? ''),
      baths: String(item.baths ?? ''),
      area: String(item.area ?? ''),
      agent: item.agent || '',
      image: item.image || DEFAULT_IMAGE
    });
    setErrors({});
    setModal({ mode: 'edit', id: item.id });
  }

  function clearFilters() {
    setChip('all');
    setSearch('');
    setQ('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = t('ls_err_title');
    if (form.price === '' || form.price === null) nextErrors.price = t('ls_err_price');
    else if (Number.isNaN(Number(form.price))) nextErrors.price = t('ls_err_price_nan');
    if (!form.location.trim()) nextErrors.location = t('ls_err_location');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      price: Number(form.price),
      location: form.location.trim(),
      beds: Number(form.beds) || 0,
      baths: Number(form.baths) || 0,
      area: Number(form.area) || 0,
      agent: form.agent.trim(),
      image: form.image
    };
    if (modal.mode === 'add') await createListing(payload);
    else await updateListing(modal.id, payload);
    setModal(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteListing(deleteTarget.id);
    setDeleteTarget(null);
  }

  const editBtn = (item) => (
    <button type="button" className="ls-btn ls-btn-sm ls-btn-outline" onClick={() => openEdit(item)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
      <span>{t('ls_card_edit')}</span>
    </button>
  );

  const deleteBtn = (item) => (
    <button type="button" className="ls-btn ls-btn-sm ls-btn-ghost" onClick={() => setDeleteTarget(item)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
      <span>{t('ls_card_delete')}</span>
    </button>
  );

  return (
    <div className="ls-page">
      <TopBar />

      <header className="ls-header">
        <div className="ls-header-bar">
          <div className="ls-header-left">
            <span className="ls-eyebrow">{t('ls_eyebrow')}</span>
            <h1 className="ls-title">{t('ls_heading')}</h1>
          </div>
          <button type="button" className="ls-btn ls-btn-accent" onClick={openAdd}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            <span>{t('ls_add_listing')}</span>
          </button>
        </div>
      </header>

      <div className="ls-toolbar">
        <div className="od-filters" role="group" aria-label={t('od_filter_label')}>
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={'od-feed-filter' + (chip === c.id ? ' od-active' : '')}
              onClick={() => setChip(c.id)}
              aria-pressed={chip === c.id}
            >
              <span>{t(c.labelKey)}</span>
              <span className="od-feed-filter-count">{stats ? c.get(stats) : '—'}</span>
            </button>
          ))}
        </div>
        <div className="ls-search">
          <svg className="ls-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.5" y2="16.5" /></svg>
          <input
            id="ls-search"
            className="ls-search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ls_search_placeholder')}
            aria-label={t('ls_search_label')}
          />
        </div>
        <div className="od-view-toggle" role="group" aria-label={t('od_view_label')}>
          <button
            type="button"
            className={'od-view-toggle-btn' + (view === 'grid' ? ' od-active' : '')}
            onClick={() => setView('grid')}
            title={t('od_view_grid')}
            aria-label={t('od_view_grid')}
            aria-pressed={view === 'grid'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          </button>
          <button
            type="button"
            className={'od-view-toggle-btn' + (view === 'by-date' ? ' od-active' : '')}
            onClick={() => setView('by-date')}
            title={t('ls_view_by_date')}
            aria-label={t('ls_view_by_date')}
            aria-pressed={view === 'by-date'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /></svg>
          </button>
        </div>
        <div className="ls-results">
          <strong>{items.length}</strong>
          <span>{t('ls_results_count')}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <section className="ls-empty">
          <div className="ls-empty-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-7h6v7" /></svg>
          </div>
          <h2 className="ls-empty-title">{t('ls_empty_title')}</h2>
          <p className="ls-empty-body">{t('ls_empty_body')}</p>
          <div className="ls-empty-actions">
            <button type="button" className="ls-btn ls-btn-outline" onClick={clearFilters}>{t('ls_empty_clear')}</button>
            <button type="button" className="ls-btn ls-btn-accent" onClick={openAdd}>{t('ls_add_listing')}</button>
          </div>
        </section>
      ) : view === 'grid' ? (
        <section className="ls-grid">
          {items.map((item) => (
            <article className="ls-card" key={item.id}>
              <div className="ls-card-media">
                <img className="ls-card-img" src={item.image} alt={item.title} loading="lazy" />
                <div className="ls-card-badges">
                  <span className={'ls-badge ls-badge-' + item.status}>{t('ls_status_' + item.status)}</span>
                  <span className={'ls-badge ls-badge-' + item.type}>{t('ls_type_' + item.type)}</span>
                </div>
                <div className="ls-card-price">
                  {formatPrice(item.price)}
                  {item.type === 'rent' ? <span className="ls-price-unit">{t('ls_unit_month')}</span> : null}
                </div>
              </div>
              <div className="ls-card-body">
                <h2 className="ls-card-title">{item.title}</h2>
                <p className="ls-card-location">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  <span>{item.location}</span>
                </p>
                <div className="ls-card-meta">
                  <span>{item.beds} {t('ls_unit_beds')}</span>
                  <span>{item.baths} {t('ls_unit_baths')}</span>
                  <span>{item.area} {t('ls_unit_area')}</span>
                </div>
                <div className="ls-card-foot">
                  <div className="ls-card-info">
                    <span className="ls-card-agent">{t('ls_agent_label')} · {item.agent}</span>
                    <span className="ls-card-updated">{t('ls_updated')} {item.updatedAt}</span>
                  </div>
                  <div className="ls-card-actions">
                    {editBtn(item)}
                    {deleteBtn(item)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="od-social-feed">
          <nav className="od-date-rail" aria-label={t('od_date_rail_label')}>
            {days.map(([key]) => (
              <button
                key={key}
                type="button"
                className={
                  'od-date-rail-pill od-has-posts' +
                  (activeDay === key ? ' od-active' : '') +
                  (key === today ? ' od-today' : '')
                }
                onClick={() => jumpToDay(key)}
              >
                <span className="od-dr-weekday">{formatWeekday(key, lang)}</span>
                <span className="od-dr-day">{parseDay(key).getDate()}</span>
                <span className="od-dr-dot" />
              </button>
            ))}
          </nav>
          <div className="od-feed-day-rows">
            {days.map(([key, dayItems]) => (
              <section className="od-day-section" id={'od-day-' + key} key={key}>
                <div className="od-day-section-header">
                  <div className="od-day-section-date">
                    {key === today ? t('od_today') : formatDayLong(key, lang)}
                    <span className="od-day-badge">{dayItems.length} {t('od_day_count')}</span>
                  </div>
                </div>
                <div className="od-day-scroll-wrap">
                  <button type="button" className="od-day-scroll-btn od-prev" onClick={(e) => scrollDay(e, -1)} aria-label={t('od_scroll_prev')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15,4 9,12 15,20" /></svg>
                  </button>
                  <div className="od-day-scroll">
                    {dayItems.map((item) => (
                      <article className="od-feed-card" key={item.id}>
                        <div className="od-card-media">
                          <img src={item.image} alt={item.title} loading="lazy" />
                          <div className="od-card-badges">
                            <span className={'od-badge od-badge-' + item.status}>{t('ls_status_' + item.status)}</span>
                            <span className={'od-badge od-badge-' + item.type}>{t('ls_type_' + item.type)}</span>
                          </div>
                          <div className="od-card-price">
                            {formatPrice(item.price)}
                            {item.type === 'rent' ? <span className="od-price-unit">{t('ls_unit_month')}</span> : null}
                          </div>
                        </div>
                        <div className="od-card-body">
                          <h3 className="od-card-title">{item.title}</h3>
                          <div className="od-card-location">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            <span>{item.location}</span>
                          </div>
                          <div className="od-card-meta">
                            {item.beds} {t('ls_unit_beds')} · {item.baths} {t('ls_unit_baths')} · {item.area} {t('ls_unit_area')}
                          </div>
                          <div className="od-card-foot">
                            <span className="od-card-agent">{t('ls_agent_label')} · {item.agent}</span>
                            <span className="od-card-updated">{t('ls_updated')} {formatDayShort(item.updatedAt, lang)}</span>
                          </div>
                          <div className="ls-card-actions od-card-actions">
                            {editBtn(item)}
                            {deleteBtn(item)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button type="button" className="od-day-scroll-btn od-next" onClick={(e) => scrollDay(e, 1)} aria-label={t('od_scroll_next')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9,4 15,12 9,20" /></svg>
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      <footer className="ls-foot">{t('ls_brand_foot')}</footer>

      {modal ? (
        <div
          className="ls-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="ls-modal" role="dialog" aria-modal="true" aria-label={modal.mode === 'add' ? t('ls_modal_add_title') : t('ls_modal_edit_title')}>
            <div className="ls-modal-head">
              <h2 className="ls-modal-title">{modal.mode === 'add' ? t('ls_modal_add_title') : t('ls_modal_edit_title')}</h2>
              <button type="button" className="ls-icon-btn" onClick={() => setModal(null)} aria-label={t('ls_btn_cancel')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
              </button>
            </div>

            <form className="ls-form" onSubmit={handleSubmit} noValidate>
              <div className="ls-field ls-field-full">
                <label className="ls-label" htmlFor="ls-f-title">{t('ls_field_title')}<span className="ls-req">*</span></label>
                <input
                  id="ls-f-title"
                  className={'ls-input' + (errors.title ? ' ls-input-invalid' : '')}
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder={t('ls_field_title_ph')}
                />
                {errors.title ? <p className="ls-error">{errors.title}</p> : null}
              </div>

              <div className="ls-form-row">
                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-price">{t('ls_field_price')}<span className="ls-req">*</span></label>
                  <input
                    id="ls-f-price"
                    className={'ls-input' + (errors.price ? ' ls-input-invalid' : '')}
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder={t('ls_field_price_ph')}
                    inputMode="numeric"
                  />
                  {errors.price ? <p className="ls-error">{errors.price}</p> : null}
                </div>
                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-location">{t('ls_field_location')}<span className="ls-req">*</span></label>
                  <input
                    id="ls-f-location"
                    className={'ls-input' + (errors.location ? ' ls-input-invalid' : '')}
                    value={form.location}
                    onChange={(e) => setField('location', e.target.value)}
                    placeholder={t('ls_field_location_ph')}
                  />
                  {errors.location ? <p className="ls-error">{errors.location}</p> : null}
                </div>
              </div>

              <div className="ls-form-row">
                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-type">{t('ls_field_type')}</label>
                  <select id="ls-f-type" className="ls-input" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                    <option value="sale">{t('ls_type_sale')}</option>
                    <option value="rent">{t('ls_type_rent')}</option>
                  </select>
                </div>
                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-status">{t('ls_field_status')}</label>
                  <select id="ls-f-status" className="ls-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    <option value="active">{t('ls_status_active')}</option>
                    <option value="pending">{t('ls_status_pending')}</option>
                    <option value="sold">{t('ls_status_sold')}</option>
                  </select>
                </div>
              </div>

              <div className="ls-form-row ls-form-row-thirds">
                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-beds">{t('ls_field_beds')}</label>
                  <input
                    id="ls-f-beds"
                    className="ls-input"
                    value={form.beds}
                    onChange={(e) => setField('beds', e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-baths">{t('ls_field_baths')}</label>
                  <input
                    id="ls-f-baths"
                    className="ls-input"
                    value={form.baths}
                    onChange={(e) => setField('baths', e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-area">{t('ls_field_area')}</label>
                  <input
                    id="ls-f-area"
                    className="ls-input"
                    value={form.area}
                    onChange={(e) => setField('area', e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="ls-field ls-field-full">
                <label className="ls-label" htmlFor="ls-f-agent">{t('ls_field_agent')}</label>
                <input
                  id="ls-f-agent"
                  className="ls-input"
                  value={form.agent}
                  onChange={(e) => setField('agent', e.target.value)}
                  placeholder={t('ls_field_agent_ph')}
                />
              </div>

              <div className="ls-field ls-field-full">
                <span className="ls-label">{t('ls_field_image')}</span>
                <p className="ls-img-hint">{t('ls_image_hint')}</p>
                <div className="ls-img-picker">
                  {IMAGES.map((img) => (
                    <button
                      type="button"
                      key={img}
                      className={'ls-img-thumb' + (form.image === img ? ' ls-img-thumb-sel' : '')}
                      onClick={() => setField('image', img)}
                      aria-pressed={form.image === img}
                      aria-label={img.split('/').pop().replace('.jpg', '')}
                    >
                      <img src={img} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="ls-modal-actions">
                <button type="button" className="ls-btn ls-btn-outline" onClick={() => setModal(null)}>{t('ls_btn_cancel')}</button>
                <button type="submit" className="ls-btn ls-btn-accent">{t('ls_btn_save')}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="ls-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="ls-modal ls-confirm" role="alertdialog" aria-modal="true" aria-label={t('ls_delete_title')}>
            <div className="ls-confirm-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
            </div>
            <h2 className="ls-confirm-title">{t('ls_delete_title')}</h2>
            <p className="ls-confirm-body">{t('ls_delete_body')}</p>
            <p className="ls-confirm-target">{deleteTarget.title}</p>
            <div className="ls-modal-actions ls-modal-actions-center">
              <button type="button" className="ls-btn ls-btn-outline" onClick={() => setDeleteTarget(null)}>{t('ls_delete_cancel')}</button>
              <button type="button" className="ls-btn ls-btn-danger" onClick={confirmDelete}>{t('ls_delete_confirm')}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
