import { Link, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useLang } from '../lib/i18n.jsx';
import { getRole } from '../lib/session.js';
import './TopBar.css';

export default function TopBar() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // M5 roles: the agent roster is owner-only.
  const isAgent = getRole() === 'agent';

  function handleLogout() {
    try {
      sessionStorage.removeItem('pp-role');
      sessionStorage.removeItem('pp-agent-id');
    } catch (e) {}
    navigate('/login');
  }

  const navClass = (active) => 'tb-nav-link' + (active ? ' tb-nav-active' : '');

  return (
    <header className="tb-header">
      <div className="tb-topbar">
        <Link to="/" className="tb-brand">
          <span className="tb-brand-logo">加</span>
          <span className="tb-brand-name">{t('ls_brand_name')}</span>
        </Link>
        <nav className="tb-nav">
          <Link to="/listings" className={navClass(pathname === '/' || pathname.startsWith('/listings'))}>
            {t('ls_nav_listings')}
          </Link>
          <Link to="/buildings" className={navClass(pathname.startsWith('/buildings'))}>
            {t('ls_nav_buildings')}
          </Link>
          {!isAgent ? (
            <Link to="/agents" className={navClass(pathname.startsWith('/agents'))}>
              {t('ls_nav_agents')}
            </Link>
          ) : null}
          <Link to="/feed" className={navClass(pathname.startsWith('/feed'))}>
            {t('ls_nav_posts')}
          </Link>
        </nav>
        <div className="tb-top-actions">
          <LanguageSwitcher />
          <button type="button" className="tb-btn-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{t('ls_logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
