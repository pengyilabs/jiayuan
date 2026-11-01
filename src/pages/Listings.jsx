import { useCallback, useEffect, useRef, useState } from 'react';
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

export default function Listings() {
  const { t } = useLang();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [chip, setChip] = useState('all');
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menu, setMenu] = useState(null);
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

  useEffect(() => {
    if (!modal && !deleteTarget && !menu) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (menu) setMenu(null);
      else if (deleteTarget) setDeleteTarget(null);
      else setModal(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, deleteTarget, menu]);

  useEffect(() => {
    if (!menu) return undefined;
    function onDown(e) {
      const el = e.target;
      if (el.closest && (el.closest('.ls-row-menu') || el.closest('.ls-row-menu-btn'))) return;
      setMenu(null);
    }
    function onClose() { setMenu(null); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [menu]);

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

  function toggleMenu(e, item) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const MENU_H = 136;
    const openUp = rect.bottom + MENU_H > window.innerHeight;
    const openRight = rect.left < 200;
    setMenu((cur) => (cur && cur.item.id === item.id ? null : {
      item,
      top: openUp ? rect.top - MENU_H - 6 : rect.bottom + 6,
      left: openRight ? rect.left : rect.right,
      openRight
    }));
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

  const rowMenuBtn = (item) => (
    <button
      type="button"
      className="ls-row-menu-btn"
      aria-haspopup="menu"
      aria-expanded={!!(menu && menu.item.id === item.id)}
      aria-label={t('ls_menu_more')}
      onClick={(e) => toggleMenu(e, item)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
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
            className={'od-view-toggle-btn' + (view === 'table' ? ' od-active' : '')}
            onClick={() => setView('table')}
            title={t('ls_view_table')}
            aria-label={t('ls_view_table')}
            aria-pressed={view === 'table'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="4" x2="9" y2="20" /></svg>
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
            <article className="ls-card" key={item.id} onClick={() => openEdit(item)}>
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
                    {rowMenuBtn(item)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="ls-table-wrap">
          <table className="ls-table">
            <thead>
              <tr>
                <th scope="col">{t('ls_th_property')}</th>
                <th scope="col">{t('ls_field_location')}</th>
                <th scope="col">{t('ls_filter_status_label')}</th>
                <th scope="col">{t('ls_filter_type_label')}</th>
                <th scope="col">{t('ls_field_price')}</th>
                <th scope="col">{t('ls_field_beds')}</th>
                <th scope="col">{t('ls_field_baths')}</th>
                <th scope="col">{t('ls_field_area')}</th>
                <th scope="col">{t('ls_agent_label')}</th>
                <th scope="col">{t('ls_updated')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => openEdit(item)}>
                  <td>
                    <div className="ls-table-prop">
                      {rowMenuBtn(item)}
                      <img className="ls-table-thumb" src={item.image} alt={item.title} loading="lazy" />
                      <span className="ls-table-title">{item.title}</span>
                    </div>
                  </td>
                  <td>{item.location}</td>
                  <td><span className={'ls-badge ls-badge-' + item.status}>{t('ls_status_' + item.status)}</span></td>
                  <td><span className={'ls-badge ls-badge-' + item.type}>{t('ls_type_' + item.type)}</span></td>
                  <td className="ls-table-price">
                    {formatPrice(item.price)}
                    {item.type === 'rent' ? <span className="ls-price-unit">{t('ls_unit_month')}</span> : null}
                  </td>
                  <td>{item.beds}</td>
                  <td>{item.baths}</td>
                  <td>{item.area}</td>
                  <td>{item.agent}</td>
                  <td className="ls-table-updated">{item.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="ls-foot">{t('ls_brand_foot')}</footer>

      {menu ? (
        <div
          className={'ls-row-menu' + (menu.openRight ? ' ls-row-menu-right' : '')}
          role="menu"
          style={{ top: menu.top, left: menu.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="ls-row-menu-item"
            onClick={() => { setMenu(null); openEdit(menu.item); }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
            <span>{t('ls_menu_view')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="ls-row-menu-item"
            onClick={() => { setMenu(null); openEdit(menu.item); }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            <span>{t('ls_card_edit')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="ls-row-menu-item ls-row-menu-danger"
            onClick={() => { setMenu(null); setDeleteTarget(menu.item); }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
            <span>{t('ls_card_delete')}</span>
          </button>
        </div>
      ) : null}

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
