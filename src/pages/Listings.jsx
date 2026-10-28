import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
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

const STAT_CARDS = [
  { key: 'ls_stats_total', get: (s) => s.total, accent: true },
  { key: 'ls_stats_active', get: (s) => s.active },
  { key: 'ls_stats_pending', get: (s) => s.pending },
  { key: 'ls_stats_sold', get: (s) => s.sold },
  { key: 'ls_stats_for_sale', get: (s) => s.forSale },
  { key: 'ls_stats_for_rent', get: (s) => s.forRent },
  { key: 'ls_stats_total_value', get: (s) => formatPrice(s.totalValue) }
];

export default function Listings() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
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
    const [list, s] = await Promise.all([
      listListings({ status, type, q }),
      getStats()
    ]);
    if (req !== reqRef.current) return;
    setItems(list);
    setStats(s);
  }, [status, type, q]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => subscribe(refresh), [refresh]);

  useEffect(() => { document.title = t('ls_page_title'); }, [t]);

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

  function handleLogout() {
    try { sessionStorage.removeItem('pp-role'); } catch (e) {}
    navigate('/login');
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
    setStatus('all');
    setType('all');
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

  return (
    <div className="ls-page">
      <header className="ls-header">
        <div className="ls-topbar">
          <Link to="/" className="ls-brand">
            <span className="ls-brand-logo">加</span>
            <span className="ls-brand-name">{t('ls_brand_name')}</span>
          </Link>
          <nav className="ls-nav">
            <Link to="/" className="ls-nav-link">{t('ls_nav_home')}</Link>
            <Link to="/feed" className="ls-nav-link">{t('ls_nav_feed')}</Link>
            <Link to="/listings" className="ls-nav-link ls-nav-active">{t('ls_nav_listings')}</Link>
          </nav>
          <div className="ls-top-actions">
            <LanguageSwitcher />
            <button type="button" className="ls-btn-logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              <span>{t('ls_logout')}</span>
            </button>
          </div>
        </div>

        <div className="ls-hero">
          <div className="ls-hero-text">
            <span className="ls-eyebrow">{t('ls_eyebrow')}</span>
            <h1 className="ls-title">{t('ls_heading')}</h1>
            <p className="ls-sub">{t('ls_subheading')}</p>
          </div>
          <button type="button" className="ls-btn ls-btn-accent ls-btn-lg" onClick={openAdd}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            <span>{t('ls_add_listing')}</span>
          </button>
        </div>
      </header>

      <section className="ls-stats">
        {STAT_CARDS.map((def) => (
          <div
            key={def.key}
            className={'ls-stat' + (def.accent ? ' ls-stat-accent' : '') + (def.key === 'ls_stats_total_value' ? ' ls-stat-wide' : '')}
          >
            <span className="ls-stat-label">{t(def.key)}</span>
            <span className="ls-stat-value">{stats ? def.get(stats) : '—'}</span>
          </div>
        ))}
      </section>

      <section className="ls-filters">
        <div className="ls-filter-field">
          <label className="ls-filter-label" htmlFor="ls-filter-status">{t('ls_filter_status_label')}</label>
          <select
            id="ls-filter-status"
            className="ls-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">{t('ls_filter_all')}</option>
            <option value="active">{t('ls_status_active')}</option>
            <option value="pending">{t('ls_status_pending')}</option>
            <option value="sold">{t('ls_status_sold')}</option>
          </select>
        </div>
        <div className="ls-filter-field">
          <label className="ls-filter-label" htmlFor="ls-filter-type">{t('ls_filter_type_label')}</label>
          <select
            id="ls-filter-type"
            className="ls-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">{t('ls_filter_all')}</option>
            <option value="sale">{t('ls_type_sale')}</option>
            <option value="rent">{t('ls_type_rent')}</option>
          </select>
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
        <div className="ls-results">
          <strong>{items.length}</strong>
          <span>{t('ls_results_count')}</span>
        </div>
      </section>

      {items.length > 0 ? (
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
                    <button type="button" className="ls-btn ls-btn-sm ls-btn-outline" onClick={() => openEdit(item)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                      <span>{t('ls_card_edit')}</span>
                    </button>
                    <button type="button" className="ls-btn ls-btn-sm ls-btn-ghost" onClick={() => setDeleteTarget(item)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                      <span>{t('ls_card_delete')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
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
