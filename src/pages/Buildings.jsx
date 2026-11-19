import { Fragment, useCallback, useEffect, useState } from 'react';
import { useLang } from '../lib/i18n.jsx';
import TopBar from '../components/TopBar.jsx';
import {
  subscribe,
  listBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  listListings,
  formatPrice,
  AMENITIES,
} from '../lib/store.js';
import { getRole } from '../lib/session.js';
import './Buildings.css';

const EMPTY_FORM = {
  name: '',
  city: '',
  country: 'CR',
  address: '',
  amenities: [],
  notes: '',
  photos: [],
};

export default function Buildings() {
  const { t } = useLang();

  // M5 roles: buildings are owner-managed (Q3); agents browse read-only.
  const isAgent = getRole() === 'agent';

  const [items, setItems] = useState([]);
  const [unitsMap, setUnitsMap] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detail, setDetail] = useState(null);

  const refresh = useCallback(async () => {
    const blds = await listBuildings();
    const map = {};
    await Promise.all(
      blds.map(async (b) => {
        map[b.id] = await listListings({ buildingId: b.id });
      })
    );
    setItems(blds);
    setUnitsMap(map);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => subscribe(refresh), [refresh]);
  useEffect(() => {
    document.title = t('bg_page_title');
  }, [t]);

  useEffect(() => {
    if (!modal && !deleteTarget && !detail) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (detail) setDetail(null);
      else if (deleteTarget) setDeleteTarget(null);
      else setModal(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, deleteTarget, detail]);

  function countryLabel(country) {
    return country === 'CR' ? t('bg_country_CR') : country === 'CA' ? t('bg_country_CA') : '';
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, amenities: [], photos: [] });
    setErrors({});
    setModal({ mode: 'add' });
  }

  function openEdit(item) {
    setForm({
      name: item.name,
      city: item.city || '',
      country: item.country === 'CR' || item.country === 'CA' ? item.country : '',
      address: item.address || '',
      amenities: (item.amenities || []).slice(),
      notes: item.notes || '',
      photos: (item.photos || []).map((p) => ({ src: p.src, label: p.label || '' })),
    });
    setErrors({});
    setModal({ mode: 'edit', id: item.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t('bg_err_name');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      country: form.country,
      address: form.address.trim(),
      amenities: form.amenities.slice(),
      notes: form.notes.trim(),
      photos: form.photos.map((p) => ({ src: p.src, label: p.label.trim() })),
    };
    if (modal.mode === 'add') await createBuilding(payload);
    else await updateBuilding(modal.id, payload);
    setModal(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteBuilding(deleteTarget.id);
    setDeleteTarget(null);
    setDetail(null);
  }

  function toggleAmenity(key) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.indexOf(key) >= 0 ? f.amenities.filter((a) => a !== key) : f.amenities.concat(key),
    }));
  }

  function addPhotos(e) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((f) => ({ ...f, photos: f.photos.concat({ src: String(reader.result), label: '' }) }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function setPhotoLabel(index, label) {
    setForm((f) => ({ ...f, photos: f.photos.map((p, i) => (i === index ? { ...p, label } : p)) }));
  }

  function removePhoto(index) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  }

  return (
    <div className="bg-page">
      <TopBar />

      <header className="bg-header">
        <div className="bg-header-bar">
          <div className="bg-header-left">
            <span className="bg-eyebrow">{t('bg_eyebrow')}</span>
            <h1 className="bg-title">{t('bg_heading')}</h1>
          </div>
          {!isAgent ? (
            <button type="button" className="bg-btn bg-btn-accent" onClick={openAdd}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{t('bg_add_building')}</span>
            </button>
          ) : null}
        </div>
        <p className="bg-subheading">{t('bg_subheading')}</p>
      </header>

      <section className="bg-grid">
        {items.map((item) => {
          const unitList = unitsMap[item.id] || [];
          const cover = item.photos && item.photos.length ? item.photos[0].src : '';
          return (
            <article className="bg-card" key={item.id}>
              <button type="button" className="bg-card-media" onClick={() => setDetail(item.id)} aria-label={item.name}>
                {cover ? (
                  <img src={cover} alt={item.name} loading="lazy" />
                ) : (
                  <div className="bg-card-media-empty">{t('bg_no_photos')}</div>
                )}
              </button>
              <div className="bg-card-body">
                <h2 className="bg-card-name">{item.name}</h2>
                <p className="bg-card-loc">
                  {item.city}
                  {item.country ? ' · ' + countryLabel(item.country) : ''}
                </p>
                <div className="bg-chips">
                  {(item.amenities || []).map((a) => (
                    <span className="bg-chip" key={a}>
                      {t('bg_amenity_' + a)}
                    </span>
                  ))}
                </div>
                <div className="bg-card-foot">
                  <button type="button" className="bg-btn bg-btn-outline bg-btn-sm" onClick={() => setDetail(item.id)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="17" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <span>
                      {unitList.length} {t('bg_units')}
                    </span>
                  </button>
                  {!isAgent ? (
                    <div className="bg-card-actions">
                      <button type="button" className="bg-btn bg-btn-outline bg-btn-sm" onClick={() => openEdit(item)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                        <span>{t('bg_edit')}</span>
                      </button>
                      <button
                        type="button"
                        className="bg-btn bg-btn-outline bg-btn-sm"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                        <span>{t('bg_delete')}</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {items.length === 0 ? (
        <div className="bg-empty">
          <h2 className="bg-empty-title">{t('bg_empty_title')}</h2>
          <p className="bg-empty-body">{t('bg_empty_body')}</p>
        </div>
      ) : null}

      <footer className="bg-foot">{t('ls_brand_foot')}</footer>

      {detail
        ? (() => {
            const b = items.find((x) => x.id === detail) || null;
            if (!b) return null;
            const unitList = unitsMap[b.id] || [];
            return (
              <div
                className="bg-overlay"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setDetail(null);
                }}
              >
                <div className="bg-modal bg-modal-wide" role="dialog" aria-modal="true" aria-label={b.name}>
                  <div className="bg-modal-head">
                    <h2 className="bg-modal-title">{b.name}</h2>
                    <button
                      type="button"
                      className="bg-icon-btn"
                      onClick={() => setDetail(null)}
                      aria-label={t('bg_btn_cancel')}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="bg-detail">
                    <p className="bg-detail-loc">
                      {b.city}
                      {b.country ? ' · ' + countryLabel(b.country) : ''}
                      {b.address ? ' · ' + b.address : ''}
                    </p>
                    {b.notes ? <p className="bg-detail-notes">{b.notes}</p> : null}
                    {(b.amenities || []).length ? (
                      <div className="bg-chips">
                        {b.amenities.map((a) => (
                          <span className="bg-chip" key={a}>
                            {t('bg_amenity_' + a)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <h3 className="bg-detail-sub">{t('bg_gallery_title')}</h3>
                    {b.photos && b.photos.length ? (
                      <div className="bg-gallery">
                        {b.photos.map((p) => (
                          <figure className="bg-gallery-item" key={p.src}>
                            <img src={p.src} alt={p.label || b.name} loading="lazy" />
                            {p.label ? <figcaption className="bg-gallery-label">{p.label}</figcaption> : null}
                          </figure>
                        ))}
                      </div>
                    ) : (
                      <p className="bg-detail-empty">{t('bg_photos_empty')}</p>
                    )}

                    <h3 className="bg-detail-sub">{t('bg_units_title')}</h3>
                    {unitList.length ? (
                      <ul className="bg-units">
                        {unitList.map((u) => (
                          <li className="bg-unit-row" key={u.id}>
                            <img className="bg-unit-thumb" src={u.cover} alt={u.title} loading="lazy" />
                            <div className="bg-unit-id">
                              <span className="bg-unit-title">{u.title}</span>
                              {u.unitNumber ? <span className="bg-unit-no">{u.unitNumber}</span> : null}
                            </div>
                            <span className={'bg-badge bg-badge-' + u.status}>{t('ls_status_' + u.status)}</span>
                            <span className="bg-unit-price">{formatPrice(u.price, u.currency)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="bg-detail-empty">{t('bg_no_units_detail')}</p>
                    )}
                  </div>
                  <div className="bg-modal-actions">
                    <button type="button" className="bg-btn bg-btn-outline" onClick={() => setDetail(null)}>
                      {t('bg_btn_cancel')}
                    </button>
                    {!isAgent ? (
                      <Fragment>
                        <button
                          type="button"
                          className="bg-btn bg-btn-outline"
                          onClick={() => {
                            setDetail(null);
                            openEdit(b);
                          }}
                        >
                          {t('bg_edit')}
                        </button>
                        <button type="button" className="bg-btn bg-btn-danger" onClick={() => setDeleteTarget(b)}>
                          {t('bg_delete')}
                        </button>
                      </Fragment>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })()
        : null}

      {modal ? (
        <div
          className="bg-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className="bg-modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal.mode === 'add' ? t('bg_modal_add_title') : t('bg_modal_edit_title')}
          >
            <div className="bg-modal-head">
              <h2 className="bg-modal-title">
                {modal.mode === 'add' ? t('bg_modal_add_title') : t('bg_modal_edit_title')}
              </h2>
              <button
                type="button"
                className="bg-icon-btn"
                onClick={() => setModal(null)}
                aria-label={t('bg_btn_cancel')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <form className="bg-form" onSubmit={handleSubmit} noValidate>
              <div className="bg-field">
                <label className="bg-label" htmlFor="bg-f-name">
                  {t('bg_field_name')}
                  <span className="bg-req">*</span>
                </label>
                <input
                  id="bg-f-name"
                  className={'bg-input' + (errors.name ? ' bg-input-invalid' : '')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('bg_field_name_ph')}
                />
                {errors.name ? <p className="bg-error">{errors.name}</p> : null}
              </div>
              <div className="bg-form-row">
                <div className="bg-field">
                  <label className="bg-label" htmlFor="bg-f-city">
                    {t('bg_field_city')}
                  </label>
                  <input
                    id="bg-f-city"
                    className="bg-input"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder={t('bg_field_city_ph')}
                  />
                </div>
                <div className="bg-field">
                  <label className="bg-label" htmlFor="bg-f-country">
                    {t('bg_field_country')}
                  </label>
                  <select
                    id="bg-f-country"
                    className="bg-input"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  >
                    <option value="CR">{t('bg_country_CR')}</option>
                    <option value="CA">{t('bg_country_CA')}</option>
                    <option value="">{t('bg_country_other')}</option>
                  </select>
                </div>
              </div>
              <div className="bg-field">
                <label className="bg-label" htmlFor="bg-f-address">
                  {t('bg_field_address')}
                </label>
                <input
                  id="bg-f-address"
                  className="bg-input"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder={t('bg_field_address_ph')}
                />
              </div>
              <div className="bg-field">
                <span className="bg-label">{t('bg_field_amenities')}</span>
                <div className="bg-amenity-row" role="group" aria-label={t('bg_field_amenities')}>
                  {AMENITIES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={'bg-amenity-chip' + (form.amenities.indexOf(a) >= 0 ? ' bg-amenity-on' : '')}
                      aria-pressed={form.amenities.indexOf(a) >= 0}
                      onClick={() => toggleAmenity(a)}
                    >
                      {t('bg_amenity_' + a)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-field">
                <label className="bg-label" htmlFor="bg-f-notes">
                  {t('bg_field_notes')}
                </label>
                <textarea
                  id="bg-f-notes"
                  className="bg-input bg-textarea"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t('bg_field_notes_ph')}
                />
              </div>
              <div className="bg-field">
                <span className="bg-label">{t('bg_field_photos')}</span>
                <p className="bg-hint">{t('bg_photos_hint')}</p>
                <div className="bg-photo-list">
                  {form.photos.map((p, i) => (
                    <div className="bg-photo-row" key={p.src + i}>
                      <img className="bg-photo-thumb" src={p.src} alt="" loading="lazy" />
                      <input
                        className="bg-input"
                        value={p.label}
                        onChange={(e) => setPhotoLabel(i, e.target.value)}
                        placeholder={t('bg_photos_label_ph')}
                        aria-label={t('bg_photos_label')}
                      />
                      <button
                        type="button"
                        className="bg-photo-remove"
                        onClick={() => removePhoto(i)}
                        title={t('bg_photos_remove')}
                        aria-label={t('bg_photos_remove')}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <line x1="6" y1="6" x2="18" y2="18" />
                          <line x1="18" y1="6" x2="6" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <label className="bg-photo-add">
                  <input type="file" accept="image/*" multiple onChange={addPhotos} />
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="11" r="2" />
                    <path d="M21 16l-5-5-9 8" />
                  </svg>
                  <span>{t('bg_photos_add')}</span>
                </label>
                {form.photos.length === 0 ? <p className="bg-hint">{t('bg_photos_empty')}</p> : null}
              </div>
              <div className="bg-modal-actions">
                <button type="button" className="bg-btn bg-btn-outline" onClick={() => setModal(null)}>
                  {t('bg_btn_cancel')}
                </button>
                <button type="submit" className="bg-btn bg-btn-accent">
                  {t('bg_btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="bg-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="bg-modal bg-confirm" role="alertdialog" aria-modal="true" aria-label={t('bg_delete_title')}>
            <h2 className="bg-modal-title">{t('bg_delete_title')}</h2>
            <p className="bg-confirm-body">{t('bg_delete_body')}</p>
            <p className="bg-confirm-target">{deleteTarget.name}</p>
            <div className="bg-modal-actions">
              <button type="button" className="bg-btn bg-btn-outline" onClick={() => setDeleteTarget(null)}>
                {t('bg_delete_cancel')}
              </button>
              <button type="button" className="bg-btn bg-btn-danger" onClick={confirmDelete}>
                {t('bg_delete_confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
