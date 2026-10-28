import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import './Login.css';

export default function LoginPage() {
  const { t } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t('login_page_title');
  }, [t]);

  function pickRole(role, path) {
    try { sessionStorage.setItem('pp-role', role); } catch (e) {}
    navigate(path);
  }

  return (
    <div className="login-page">
      <div className="shell">
        <aside className="brand-panel">
          <img className="brand-photo" src="/images/listings/villa1.jpg" alt="" />
          <div className="brand-veil"></div>
          <div className="brand-top">
            <div className="brand-logo">加</div>
            <h1 className="brand-name">{t('brand_name')}</h1>
            <div className="brand-sub">HOME DIRECT</div>
          </div>
          <p className="brand-tagline">{t('brand_tagline')}</p>
          <div className="brand-foot">{t('brand_foot')}</div>
        </aside>

        <main className="login-panel">
          <div className="login-card">
            <div className="lang-row">
              <LanguageSwitcher />
            </div>

            <span className="login-eyebrow">{t('eyebrow')}</span>
            <h2 className="login-title">{t('title')}</h2>
            <p className="login-sub">{t('sub')}</p>

            <div className="roles">
              <a className="role-card" href="/" onClick={(e) => { e.preventDefault(); pickRole('owner', '/'); }}>
                <span className="role-icon">
                  <svg viewBox="0 0 24 24"><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-7h6v7" /></svg>
                </span>
                <span className="role-body">
                  <span className="role-name">Owner</span>
                  <span className="role-desc">{t('owner_desc')}</span>
                </span>
                <span className="role-side">
                  <span className="role-tag">{t('tag_desktop')}</span>
                  <span className="role-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg></span>
                </span>
              </a>

              <a className="role-card" href="/feed" onClick={(e) => { e.preventDefault(); pickRole('agent', '/feed'); }}>
                <span className="role-icon">
                  <svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="10.5" y1="18.5" x2="13.5" y2="18.5" /></svg>
                </span>
                <span className="role-body">
                  <span className="role-name">Agent</span>
                  <span className="role-desc">{t('agent_desc')}</span>
                </span>
                <span className="role-side">
                  <span className="role-tag">{t('tag_mobile')}</span>
                  <span className="role-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg></span>
                </span>
              </a>
            </div>

            <p className="login-note">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              <span>{t('note')}</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
