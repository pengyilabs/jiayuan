import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../lib/i18n.jsx';
import TopBar from '../components/TopBar.jsx';
import { subscribe, listAgents, createAgent, updateAgent, deleteAgent } from '../lib/store.js';
import './Agents.css';

const EMPTY_FORM = { name: '', phone: '', email: '' };

export default function Agents() {
  const { t } = useLang();

  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const refresh = useCallback(async () => {
    setItems(await listAgents());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => subscribe(refresh), [refresh]);
  useEffect(() => { document.title = t('ag_page_title'); }, [t]);

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

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setModal({ mode: 'add' });
  }

  function openEdit(item) {
    setForm({ name: item.name, phone: item.phone || '', email: item.email || '' });
    setErrors({});
    setModal({ mode: 'edit', id: item.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t('ag_err_name');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim()
    };
    if (modal.mode === 'add') await createAgent(payload);
    else await updateAgent(modal.id, payload);
    setModal(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteAgent(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="ag-page">
      <TopBar />

      <header className="ag-header">
        <div className="ag-header-bar">
          <div className="ag-header-left">
            <span className="ag-eyebrow">{t('ag_eyebrow')}</span>
            <h1 className="ag-title">{t('ag_heading')}</h1>
          </div>
          <button type="button" className="ag-btn ag-btn-accent" onClick={openAdd}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            <span>{t('ag_add_agent')}</span>
          </button>
        </div>
        <p className="ag-subheading">{t('ag_subheading')}</p>
      </header>

      <section className="ag-grid">
        {items.map((item) => (
          <article className="ag-card" key={item.id}>
            <div className="ag-card-top">
              <span className="ag-avatar">{(item.name || '?').trim().slice(0, 1).toUpperCase()}</span>
              <div className="ag-card-id">
                <h2 className="ag-card-name">{item.name}</h2>
                <div className="ag-card-actions">
                  <button type="button" className="ag-btn ag-btn-outline ag-btn-sm" onClick={() => openEdit(item)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    <span>{t('ag_edit')}</span>
                  </button>
                  <button type="button" className="ag-btn ag-btn-outline ag-btn-sm" onClick={() => setDeleteTarget(item)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                    <span>{t('ag_delete')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="ag-card-contact">
              {item.phone ? (
                <a className="ag-contact-row" href={'tel:' + item.phone.replace(/\s/g, '')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
                  <span>{item.phone}</span>
                </a>
              ) : null}
              {item.email ? (
                <a className="ag-contact-row" href={'mailto:' + item.email}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                  <span>{item.email}</span>
                </a>
              ) : null}
              {!item.phone && !item.email ? (
                <p className="ag-contact-empty">{t('ag_no_contact')}</p>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <footer className="ag-foot">{t('ls_brand_foot')}</footer>

      {modal ? (
        <div className="ag-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="ag-modal" role="dialog" aria-modal="true" aria-label={modal.mode === 'add' ? t('ag_modal_add_title') : t('ag_modal_edit_title')}>
            <div className="ag-modal-head">
              <h2 className="ag-modal-title">{modal.mode === 'add' ? t('ag_modal_add_title') : t('ag_modal_edit_title')}</h2>
              <button type="button" className="ag-icon-btn" onClick={() => setModal(null)} aria-label={t('ag_btn_cancel')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
              </button>
            </div>
            <form className="ag-form" onSubmit={handleSubmit} noValidate>
              <div className="ag-field">
                <label className="ag-label" htmlFor="ag-f-name">{t('ag_field_name')}<span className="ag-req">*</span></label>
                <input
                  id="ag-f-name"
                  className={'ag-input' + (errors.name ? ' ag-input-invalid' : '')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('ag_field_name_ph')}
                />
                {errors.name ? <p className="ag-error">{errors.name}</p> : null}
              </div>
              <div className="ag-field">
                <label className="ag-label" htmlFor="ag-f-phone">{t('ag_field_phone')}</label>
                <input
                  id="ag-f-phone"
                  className="ag-input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t('ag_field_phone_ph')}
                  inputMode="tel"
                />
              </div>
              <div className="ag-field">
                <label className="ag-label" htmlFor="ag-f-email">{t('ag_field_email')}</label>
                <input
                  id="ag-f-email"
                  className="ag-input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder={t('ag_field_email_ph')}
                  inputMode="email"
                />
              </div>
              <div className="ag-modal-actions">
                <button type="button" className="ag-btn ag-btn-outline" onClick={() => setModal(null)}>{t('ag_btn_cancel')}</button>
                <button type="submit" className="ag-btn ag-btn-accent">{t('ag_btn_save')}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="ag-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="ag-modal ag-confirm" role="alertdialog" aria-modal="true" aria-label={t('ag_delete_title')}>
            <h2 className="ag-modal-title">{t('ag_delete_title')}</h2>
            <p className="ag-confirm-body">{t('ag_delete_body')}</p>
            <p className="ag-confirm-target">{deleteTarget.name}</p>
            <div className="ag-modal-actions">
              <button type="button" className="ag-btn ag-btn-outline" onClick={() => setDeleteTarget(null)}>{t('ag_delete_cancel')}</button>
              <button type="button" className="ag-btn ag-btn-danger" onClick={confirmDelete}>{t('ag_delete_confirm')}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
