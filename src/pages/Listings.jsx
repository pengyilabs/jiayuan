import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import TopBar from '../components/TopBar.jsx';
import {
  subscribe, listListings, createListing, updateListing,
  deleteListing, getStats, formatPrice,
  listAgents, agentDisplayNames
} from '../lib/store.js';
import './Listings.css';

const DEFAULT_IMAGE = '/images/listings/condo1.jpg';

const PROPERTY_TYPES = ['apartment', 'house', 'townhouse', 'loft', 'lot', 'commercial'];
const STATUSES = ['active', 'pending', 'sold', 'rented', 'other_agent'];
const PARKING_TYPES = ['none', 'covered', 'private', 'available'];
const FURNISHED_LEVELS = ['none', 'appliances', 'semi', 'full'];
const CURRENCIES = ['CNY', 'USD', 'EUR'];

const PTYPE_ICONS = {
  apartment: <><rect x="6" y="3" width="12" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></>,
  house: <><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></>,
  townhouse: <><path d="M2 21V10l4-3 4 3v11" /><path d="M10 21V10l4-3 4 3v11" /><path d="M6 21v-5h4v5" /><path d="M14 21v-5h4v5" /></>,
  loft: <><path d="M3 21V8l9-5 9 5v13" /><path d="M3 21h18" /><path d="M7 21v-7h4v7" /><path d="M14 12h3v4h-3z" /></>,
  lot: <><path d="M3 19l5-8 4 5 3-4 6 7z" /><circle cx="17" cy="6" r="2" /></>,
  commercial: <><path d="M4 9h16" /><path d="M5 9l1.5-5h11L19 9" /><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /><path d="M9 21v-6h6v6" /></>
};

// Segmented toggle-button group — replaces plain dropdowns in the form.
function SegField({ label, options, value, onChange, getLabel, small }) {
  return (
    <div className="ls-field ls-field-full">
      <span className="ls-label">{label}</span>
      <div className={'ls-seg' + (small ? ' ls-seg-sm' : '')} role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={'ls-seg-btn' + (value === opt ? ' ls-seg-on' : '')}
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
          >
            {getLabel(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  title: '', type: 'sale', status: 'active', price: '', currency: 'CNY', location: '',
  propertyType: 'apartment', unitNumber: '',
  beds: '', baths: '', area: '',
  parkingCount: '0', parkingType: 'none',
  furnishedLevel: 'none', petsAllowed: false,
  photos: [], cover: '',
  agentIds: [],
  ownerName: '', ownerPhone: '', notes: ''
};

const CHIPS = [
  { id: 'all', labelKey: 'ls_filter_all', get: (s) => s.total },
  { id: 'active', labelKey: 'ls_status_active', get: (s) => s.active },
  { id: 'pending', labelKey: 'ls_status_pending', get: (s) => s.pending },
  { id: 'sold', labelKey: 'ls_status_sold', get: (s) => s.sold },
  { id: 'rented', labelKey: 'ls_status_rented', get: (s) => s.rented },
  { id: 'sale', labelKey: 'ls_type_sale', get: (s) => s.forSale },
  { id: 'rent', labelKey: 'ls_type_rent', get: (s) => s.forRent }
];

function chipFilter(id) {
  if (id === 'sale' || id === 'rent') return { type: id };
  if (id === 'all') return {};
  return { status: id };
}

const TYPE_OPTIONS = ['sale', 'rent'];

const BED_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>
);
const BATH_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-2z" /><path d="M7 12V6a2 2 0 0 1 4 0" /><path d="M7 18l-1.5 2.5M17 18l1.5 2.5" /></svg>
);

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
  const [editCell, setEditCell] = useState(null);
  const [agents, setAgents] = useState([]);
  const reqRef = useRef(0);

  useEffect(() => {
    let alive = true;
    listAgents().then((list) => { if (alive) setAgents(list); });
    return () => { alive = false; };
  }, []);

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
    if (!modal && !deleteTarget && !menu && !editCell) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (editCell) setEditCell(null);
      else if (menu) setMenu(null);
      else if (deleteTarget) setDeleteTarget(null);
      else setModal(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, deleteTarget, menu, editCell]);

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

  useEffect(() => {
    if (!editCell) return undefined;
    function onDown(e) {
      const el = e.target;
      if (el.closest && (el.closest('.ls-cell-menu') || el.closest('.ls-cell-edit'))) return;
      setEditCell(null);
    }
    function onClose() { setEditCell(null); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [editCell]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function addPhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        setForm((f) => {
          const photos = f.photos.concat(url);
          return { ...f, photos, cover: f.cover || url };
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(img) {
    setForm((f) => {
      const photos = f.photos.filter((p) => p !== img);
      const cover = f.cover === img ? (photos[0] || '') : f.cover;
      return { ...f, photos, cover };
    });
  }

  function setCover(img) {
    setForm((f) => (f.photos.indexOf(img) >= 0 ? { ...f, cover: img } : f));
  }

  function toggleAgent(id) {
    setForm((f) => ({
      ...f,
      agentIds: f.agentIds.indexOf(id) >= 0
        ? f.agentIds.filter((a) => a !== id)
        : f.agentIds.concat(id)
    }));
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
      currency: item.currency || 'CNY',
      location: item.location,
      propertyType: item.propertyType || 'apartment',
      unitNumber: item.unitNumber || '',
      beds: String(item.beds ?? ''),
      baths: String(item.baths ?? ''),
      area: String(item.area ?? ''),
      parkingCount: String(item.parking?.count ?? 0),
      parkingType: item.parking?.type || 'none',
      furnishedLevel: item.furnishedLevel || 'none',
      petsAllowed: !!item.petsAllowed,
      photos: (item.photos || []).slice(),
      cover: item.cover || '',
      agentIds: (item.agentIds || []).slice(),
      ownerName: item.ownerName || '',
      ownerPhone: item.ownerPhone || '',
      notes: item.notes || ''
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

  function toggleCellEdit(e, item, field) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom + 200 > window.innerHeight;
    setEditCell((cur) => (cur && cur.item.id === item.id && cur.field === field ? null : {
      item,
      field,
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      openUp
    }));
  }

  async function applyCellEdit(field, value) {
    const { item } = editCell;
    setEditCell(null);
    await updateListing(item.id, { [field]: value });
    refresh();
  }

  function agentPills(item) {
    const ids = item.agentIds || [];
    const names = ids
      .map((id) => (agents.find((a) => a.id === id) || {}).name)
      .filter(Boolean);
    const legacy = names.length ? [] : String(item.agent || '').split(',').map((s) => s.trim()).filter(Boolean);
    const list = names.length ? names : legacy;
    if (!list.length) return <span className="ls-agent-none">—</span>;
    return list.map((name) => (
      <span className="ls-agent-pill" key={name} title={t('ls_agent_linked')}>
        <span className="ls-agent-pill-avatar">{name.charAt(0).toUpperCase()}</span>
        <span className="ls-agent-pill-name">{name}</span>
        <svg className="ls-agent-pill-link" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
      </span>
    ));
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

    const photos = form.photos.length ? form.photos.slice() : [DEFAULT_IMAGE];
    const payload = {
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      price: Number(form.price),
      currency: form.currency,
      location: form.location.trim(),
      propertyType: form.propertyType,
      unitNumber: form.unitNumber.trim(),
      beds: Number(form.beds) || 0,
      baths: Number(form.baths) || 0,
      area: Number(form.area) || 0,
      parking: { count: Number(form.parkingCount) || 0, type: form.parkingType },
      furnishedLevel: form.furnishedLevel,
      petsAllowed: !!form.petsAllowed,
      photos,
      cover: photos.indexOf(form.cover) >= 0 ? form.cover : photos[0],
      agentIds: form.agentIds.slice(),
      agent: agentDisplayNames(form.agentIds),
      ownerName: form.ownerName.trim(),
      ownerPhone: form.ownerPhone.trim(),
      notes: form.notes.trim()
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
                <img className="ls-card-img" src={item.cover} alt={item.title} loading="lazy" />
                <div className="ls-card-badges">
                  <span className={'ls-badge ls-badge-' + item.status}>{t('ls_status_' + item.status)}</span>
                  <span className={'ls-badge ls-badge-' + item.type}>{t('ls_type_' + item.type)}</span>
                </div>
                <div className="ls-card-price">
                  {formatPrice(item.price, item.currency)}
                  {item.type === 'rent' ? <span className="ls-price-unit">{t('ls_unit_month')}</span> : null}
                </div>
              </div>
              <div className="ls-card-body">
                <h2 className="ls-card-title">{item.title}</h2>
                <p className="ls-card-location">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  <span>{item.location}{item.unitNumber ? ' · ' + item.unitNumber : ''}</span>
                </p>
                <div className="ls-card-meta">
                  {item.propertyType ? <span>{t('ls_ptype_' + item.propertyType)}</span> : null}
                  <span>{item.beds} {t('ls_unit_beds')}</span>
                  <span>{item.baths} {t('ls_unit_baths')}</span>
                  <span>{item.area} {t('ls_unit_area')}</span>
                  {item.parking && item.parking.count > 0 ? (
                    <span>{item.parking.count} {t('ls_unit_parking')}</span>
                  ) : null}
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
                      <img className="ls-table-thumb" src={item.cover} alt={item.title} loading="lazy" />
                      <span className="ls-table-title">{item.title}{item.unitNumber ? <small className="ls-table-unit">{item.unitNumber}</small> : null}</span>
                    </div>
                  </td>
                  <td>{item.location}</td>
                  <td>
                    <button type="button" className={'ls-cell-edit ls-badge ls-badge-' + item.status} onClick={(e) => toggleCellEdit(e, item, 'status')}>
                      <span>{t('ls_status_' + item.status)}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </td>
                  <td>
                    <button type="button" className={'ls-cell-edit ls-badge ls-badge-' + item.type} onClick={(e) => toggleCellEdit(e, item, 'type')}>
                      <span>{t('ls_type_' + item.type)}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </td>
                  <td className="ls-table-price">
                    {formatPrice(item.price, item.currency)}
                    {item.type === 'rent' ? <span className="ls-price-unit">{t('ls_unit_month')}</span> : null}
                  </td>
                  <td><span className="ls-cell-icon">{BED_ICON}{item.beds}</span></td>
                  <td><span className="ls-cell-icon">{BATH_ICON}{item.baths}</span></td>
                  <td>{item.area}<span className="ls-area-unit">{t('ls_unit_area')}</span></td>
                  <td>
                    <div className="ls-agent-pills">
                      {agentPills(item)}
                    </div>
                  </td>
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

      {editCell ? (
        <div
          className={'ls-cell-menu' + (editCell.openUp ? ' ls-cell-menu-up' : '')}
          role="menu"
          style={{ top: editCell.top, left: editCell.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {(editCell.field === 'type' ? TYPE_OPTIONS : STATUSES).map((opt) => (
            <button
              key={opt}
              type="button"
              role="menuitemradio"
              aria-checked={editCell.item[editCell.field] === opt}
              className={'ls-cell-menu-item' + (editCell.item[editCell.field] === opt ? ' ls-cell-menu-on' : '')}
              onClick={() => applyCellEdit(editCell.field, opt)}
            >
              <span className={'ls-cell-dot ls-badge-' + opt} />
              <span>{t((editCell.field === 'type' ? 'ls_type_' : 'ls_status_') + opt)}</span>
            </button>
          ))}
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
              <fieldset className="ls-form-section">
                <legend className="ls-form-section-title">{t('ls_section_basic')}</legend>
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

                <SegField
                  label={t('ls_field_type')}
                  options={['sale', 'rent']}
                  value={form.type}
                  onChange={(v) => setField('type', v)}
                  getLabel={(v) => t('ls_type_' + v)}
                />

                <SegField
                  label={t('ls_field_status')}
                  options={STATUSES}
                  value={form.status}
                  onChange={(v) => setField('status', v)}
                  getLabel={(v) => t('ls_status_' + v)}
                />

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
                    <span className="ls-label">{t('ls_field_currency')}</span>
                    <div className="ls-seg ls-seg-sm" role="group" aria-label={t('ls_field_currency')}>
                      {CURRENCIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={'ls-seg-btn' + (form.currency === c ? ' ls-seg-on' : '')}
                          aria-pressed={form.currency === c}
                          onClick={() => setField('currency', c)}
                        >{c}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ls-field ls-field-full">
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

                <div className="ls-field ls-field-full">
                  <span className="ls-label">{t('ls_field_property_type')}</span>
                  <div className="ls-ptype-grid" role="group" aria-label={t('ls_field_property_type')}>
                    {PROPERTY_TYPES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={'ls-ptype-btn' + (form.propertyType === p ? ' ls-ptype-on' : '')}
                        aria-pressed={form.propertyType === p}
                        onClick={() => setField('propertyType', p)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">{PTYPE_ICONS[p]}</svg>
                        <span>{t('ls_ptype_' + p)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ls-field">
                  <label className="ls-label" htmlFor="ls-f-unit">{t('ls_field_unit')}</label>
                  <input
                    id="ls-f-unit"
                    className="ls-input ls-input-sm"
                    value={form.unitNumber}
                    onChange={(e) => setField('unitNumber', e.target.value)}
                    placeholder={t('ls_field_unit_ph')}
                  />
                </div>
              </fieldset>

              <fieldset className="ls-form-section">
                <legend className="ls-form-section-title">{t('ls_section_details')}</legend>
                <div className="ls-form-row ls-form-row-thirds">
                  <div className="ls-field">
                    <label className="ls-label" htmlFor="ls-f-beds">{t('ls_field_beds')}</label>
                    <input
                      id="ls-f-beds"
                      className="ls-input ls-input-sm"
                      value={form.beds}
                      onChange={(e) => setField('beds', e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="ls-field">
                    <label className="ls-label" htmlFor="ls-f-baths">{t('ls_field_baths')}</label>
                    <input
                      id="ls-f-baths"
                      className="ls-input ls-input-sm"
                      value={form.baths}
                      onChange={(e) => setField('baths', e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="ls-field">
                    <label className="ls-label" htmlFor="ls-f-area">{t('ls_field_area')}</label>
                    <input
                      id="ls-f-area"
                      className="ls-input ls-input-sm"
                      value={form.area}
                      onChange={(e) => setField('area', e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="ls-form-row">
                  <div className="ls-field">
                    <label className="ls-label" htmlFor="ls-f-parking-count">{t('ls_field_parking_count')}</label>
                    <input
                      id="ls-f-parking-count"
                      className="ls-input ls-input-sm"
                      value={form.parkingCount}
                      onChange={(e) => setField('parkingCount', e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="ls-field ls-field-grow">
                    <span className="ls-label">{t('ls_field_parking')}</span>
                    <div className="ls-seg" role="group" aria-label={t('ls_field_parking')}>
                      {PARKING_TYPES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={'ls-seg-btn' + (form.parkingType === p ? ' ls-seg-on' : '')}
                          aria-pressed={form.parkingType === p}
                          onClick={() => setField('parkingType', p)}
                        >{t('ls_parking_' + p)}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <SegField
                  label={t('ls_field_furnished')}
                  options={FURNISHED_LEVELS}
                  value={form.furnishedLevel}
                  onChange={(v) => setField('furnishedLevel', v)}
                  getLabel={(v) => t('ls_furn_' + v)}
                />

                <SegField
                  label={t('ls_field_pets')}
                  options={['yes', 'no']}
                  value={form.petsAllowed ? 'yes' : 'no'}
                  onChange={(v) => setField('petsAllowed', v === 'yes')}
                  getLabel={(v) => (v === 'yes' ? t('ls_pets_yes') : t('ls_pets_no'))}
                />
              </fieldset>

              <fieldset className="ls-form-section">
                <legend className="ls-form-section-title">{t('ls_section_photos')}</legend>
                <p className="ls-img-hint">{t('ls_photos_hint')}</p>
                <div className="ls-photo-grid">
                  {form.photos.map((img) => (
                    <div key={img} className={'ls-photo-tile' + (form.cover === img ? ' ls-photo-cover' : '')}>
                      <img src={img} alt="" loading="lazy" />
                      {form.cover === img ? <span className="ls-photo-cover-tag">{t('ls_photos_cover')}</span> : null}
                      <div className="ls-photo-actions">
                        <button
                          type="button"
                          className={'ls-photo-btn' + (form.cover === img ? ' ls-photo-btn-on' : '')}
                          onClick={() => setCover(img)}
                          title={t('ls_photos_set_cover')}
                          aria-label={t('ls_photos_set_cover')}
                          aria-pressed={form.cover === img}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2.5 15 9 22 9.7 16.8 14.3 18.3 21.2 12 17.6 5.7 21.2 7.2 14.3 2 9.7 9 9" /></svg>
                        </button>
                        <button
                          type="button"
                          className="ls-photo-btn ls-photo-btn-danger"
                          onClick={() => removePhoto(img)}
                          title={t('ls_photos_delete')}
                          aria-label={t('ls_photos_delete')}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="ls-photo-add">
                    <input type="file" accept="image/*" multiple onChange={addPhotos} />
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-5-9 8" /></svg>
                    <span>{t('ls_photos_add')}</span>
                  </label>
                </div>
                {form.photos.length === 0 ? <p className="ls-img-hint">{t('ls_photos_empty')}</p> : null}
              </fieldset>

              <fieldset className="ls-form-section">
                <legend className="ls-form-section-title">{t('ls_section_agent')}</legend>
                <div className="ls-field ls-field-full">
                  <div className="ls-label-row">
                    <span className="ls-label">{t('ls_field_agents')}</span>
                    <Link className="ls-link" to="/agents">{t('ls_agents_manage')}</Link>
                  </div>
                  <div className="ls-agent-row" role="group" aria-label={t('ls_field_agents')}>
                    {agents.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={'ls-agent-chip' + (form.agentIds.indexOf(a.id) >= 0 ? ' ls-agent-on' : '')}
                        aria-pressed={form.agentIds.indexOf(a.id) >= 0}
                        onClick={() => toggleAgent(a.id)}
                      >
                        <span className="ls-agent-avatar">{(a.name || '?').trim().slice(0, 1).toUpperCase()}</span>
                        <span>{a.name}</span>
                      </button>
                    ))}
                    {agents.length === 0 ? <p className="ls-img-hint">{t('ls_agents_empty')}</p> : null}
                  </div>
                </div>
              </fieldset>

              <fieldset className="ls-form-section ls-form-private">
                <legend className="ls-form-section-title">
                  {t('ls_section_owner')}
                  <span className="ls-private-tag">{t('ls_private_tag')}</span>
                </legend>
                <div className="ls-form-row">
                  <div className="ls-field">
                    <label className="ls-label" htmlFor="ls-f-owner-name">{t('ls_field_owner_name')}</label>
                    <input
                      id="ls-f-owner-name"
                      className="ls-input"
                      value={form.ownerName}
                      onChange={(e) => setField('ownerName', e.target.value)}
                      placeholder={t('ls_field_owner_name_ph')}
                    />
                  </div>
                  <div className="ls-field">
                    <label className="ls-label" htmlFor="ls-f-owner-phone">{t('ls_field_owner_phone')}</label>
                    <input
                      id="ls-f-owner-phone"
                      className="ls-input"
                      value={form.ownerPhone}
                      onChange={(e) => setField('ownerPhone', e.target.value)}
                      placeholder={t('ls_field_owner_phone_ph')}
                      inputMode="tel"
                    />
                  </div>
                </div>
                <div className="ls-field ls-field-full">
                  <label className="ls-label" htmlFor="ls-f-notes">{t('ls_field_notes')}</label>
                  <textarea
                    id="ls-f-notes"
                    className="ls-input ls-textarea"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder={t('ls_field_notes_ph')}
                  />
                </div>
              </fieldset>

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
