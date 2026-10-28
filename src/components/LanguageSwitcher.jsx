import { useEffect, useRef, useState } from 'react';
import { useLang, LANG_IDS, LANG_LABELS, LANG_NAMES } from '../lib/i18n.jsx';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className={'lang-switch' + (open ? ' open' : '')} ref={wrapRef}>
      <button
        type="button"
        className="lang-trigger"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Language / 语言"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" /></svg>
        <span>{LANG_LABELS[lang]}</span>
        <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      <div className="lang-menu" role="group" aria-label="Language / 语言">
        {LANG_IDS.map((id) => (
          <button
            type="button"
            key={id}
            className={'lang-option' + (id === lang ? ' active' : '')}
            onClick={() => { setLang(id); setOpen(false); }}
          >
            <span>{LANG_NAMES[id]}</span>
            <svg className="check" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}
