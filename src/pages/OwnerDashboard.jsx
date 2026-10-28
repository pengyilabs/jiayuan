import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { subscribe, listListings, getStats, formatPrice } from '../lib/store.js';
import './OwnerDashboard.css';

const LOCALES = { zh: 'zh-CN', en: 'en-US', fr: 'fr-FR', es: 'es-ES' };

const CHIPS = [
  { id: 'all', labelKey: 'od_filter_all', get: (s) => s.total },
  { id: 'active', labelKey: 'od_status_active', get: (s) => s.active },
  { id: 'pending', labelKey: 'od_status_pending', get: (s) => s.pending },
  { id: 'sold', labelKey: 'od_status_sold', get: (s) => s.sold },
  { id: 'sale', labelKey: 'od_type_sale', get: (s) => s.forSale },
  { id: 'rent', labelKey: 'od_type_rent', get: (s) => s.forRent },
];

const KPI_CARDS = [
  { key: 'od_kpi_for_sale', value: (s) => s.forSale, sub: (s, t) => t('od_kpi_of_total') + ' · ' + shareOf(s.forSale, s.total) + '%' },
  { key: 'od_kpi_for_rent', value: (s) => s.forRent, sub: (s, t) => t('od_kpi_of_total') + ' · ' + shareOf(s.forRent, s.total) + '%' },
  { key: 'od_kpi_total_value', value: (s) => formatPrice(s.totalValue), sub: (s, t) => t('od_kpi_sold_value') + ' · ' + formatPrice(s.soldValue) },
  { key: 'od_kpi_avg_price', value: (s) => formatPrice(s.avgPrice), sub: (s, t) => t('od_kpi_per_listing') },
];

function shareOf(n, total) {
  if (!total) return '0.0';
  return (Math.round((n / total) * 1000) / 10).toFixed(1);
}

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

export default function OwnerDashboard() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [chip, setChip] = useState('all');
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [activeDay, setActiveDay] = useState('');
  const reqRef = useRef(0);

  useEffect(() => {
    const h = setTimeout(() => setQ(search.trim()), 220);
    return () => clearTimeout(h);
  }, [search]);

  const refresh = useCallback(async () => {
    const req = ++reqRef.current;
    const filter = Object.assign({}, chipFilter(chip), q ? { q } : {});
    const [list, s] = await Promise.all([listListings(filter), getStats()]);
    if (req !== reqRef.current) return;
    setItems(list);
    setStats(s);
  }, [chip, q]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => subscribe(refresh), [refresh]);

  useEffect(() => {
    document.title = t('od_page_title');
  }, [t]);

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
    if (view !== 'grid' || days.length === 0) return undefined;
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

  function handleLogout() {
    try {
      sessionStorage.removeItem('pp-role');
    } catch (e) {}
    navigate('/login');
  }

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

  function clearFilters() {
    setChip('all');
    setSearch('');
    setQ('');
  }

  const statusLabel = (status) => t('od_status_' + status);
  const typeLabel = (type) => t('od_type_' + type);
  const priceLabel = (item) => formatPrice(item.price) + (item.type === 'rent' ? t('od_unit_month') : '');
  const specsLabel = (item) =>
    item.beds + ' ' + t('od_unit_beds') + ' · ' + item.baths + ' ' + t('od_unit_baths') + ' · ' + item.area + ' ' + t('od_unit_area');

  return (
    <div className="od-page">
      <aside className="od-sidebar">
        <Link className="od-brand" to="/">
          <span className="od-brand-logo">加</span>
          <span className="od-brand-text">
            <span className="od-brand-name">{t('od_brand_name')}</span>
            <span className="od-brand-mark">{t('od_brand_mark')}</span>
          </span>
        </Link>
        <nav className="od-nav" aria-label={t('od_nav_main')}>
          <div className="od-nav-label">{t('od_nav_main')}</div>
          <Link className="od-nav-link od-nav-active" to="/" aria-current="page">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>{t('od_nav_dashboard')}</span>
          </Link>
          <Link className="od-nav-link" to="/feed">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>{t('od_nav_feed')}</span>
          </Link>
          <Link className="od-nav-link" to="/listings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>{t('od_nav_listings')}</span>
          </Link>
        </nav>
        <div className="od-side-foot">
          <div className="od-user">
            <span className="od-user-avatar">{t('od_user_name').charAt(0)}</span>
            <span className="od-user-text">
              <span className="od-user-name">{t('od_user_name')}</span>
              <span className="od-user-role">{t('od_user_role')}</span>
            </span>
          </div>
          <button type="button" className="od-logout" onClick={handleLogout} title={t('od_logout')} aria-label={t('od_logout')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>{t('od_logout')}</span>
          </button>
        </div>
      </aside>

      <div className="od-main">
        <header className="od-dash-header">
          <div className="od-dash-header-top">
            <div className="od-dash-team">
              <div className="od-dash-team-avatar">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <span className="od-dash-team-name">{t('od_brand_name')}</span>
              <span className="od-dash-team-handle">{t('od_team_handle')}</span>
            </div>
            <div className="od-dash-stats">
              <div className="od-dash-stat">
                <span className="od-dash-stat-value">{stats ? stats.total : '—'}</span>
                <span className="od-dash-stat-label">{t('od_stat_total')}</span>
              </div>
              <div className="od-dash-stat">
                <span className="od-dash-stat-value">{stats ? stats.active : '—'}</span>
                <span className="od-dash-stat-label">{t('od_status_active')}</span>
              </div>
              <div className="od-dash-stat">
                <span className="od-dash-stat-value od-accent">{stats ? stats.pending : '—'}</span>
                <span className="od-dash-stat-label">{t('od_status_pending')}</span>
              </div>
              <div className="od-dash-stat">
                <span className="od-dash-stat-value">{stats ? stats.sold : '—'}</span>
                <span className="od-dash-stat-label">{t('od_status_sold')}</span>
              </div>
            </div>
            <div className="od-dash-actions">
              <div className="od-search">
                <svg className="od-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('od_search_ph')}
                  aria-label={t('od_search_label')}
                />
              </div>
              <LanguageSwitcher />
              <Link className="od-btn od-btn-accent od-btn-sm" to="/listings">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>{t('od_btn_new_listing')}</span>
              </Link>
              <button type="button" className="od-notif-btn" aria-label={t('od_notif_label')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                <span className="od-notif-dot" />
              </button>
            </div>
          </div>
          <div className="od-dash-header-filters">
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
            <div className="od-view-toggle" role="group" aria-label={t('od_view_label')}>
              <button
                type="button"
                className={'od-view-toggle-btn' + (view === 'grid' ? ' od-active' : '')}
                onClick={() => setView('grid')}
                title={t('od_view_grid')}
                aria-label={t('od_view_grid')}
                aria-pressed={view === 'grid'}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              <button
                type="button"
                className={'od-view-toggle-btn' + (view === 'list' ? ' od-active' : '')}
                onClick={() => setView('list')}
                title={t('od_view_list')}
                aria-label={t('od_view_list')}
                aria-pressed={view === 'list'}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
          </div>
        </header>

        <div className="od-content">
          <section className="od-stats-row" aria-label={t('od_kpi_label')}>
            {KPI_CARDS.map((card) => (
              <div className="od-stat-card" key={card.key}>
                <span className="od-stat-card-label">{t(card.key)}</span>
                <span className="od-stat-card-value">{stats ? card.value(stats) : '—'}</span>
                <span className="od-stat-card-sub">{stats ? card.sub(stats, t) : ''}</span>
              </div>
            ))}
          </section>

          <div className="od-section-header">
            <h2>{view === 'grid' ? t('od_section_feed') : t('od_section_table')}</h2>
            <Link className="od-btn od-btn-ghost od-btn-sm" to="/listings">{t('od_btn_view_all')}</Link>
          </div>

          {sorted.length === 0 ? (
            <div className="od-empty">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <h3>{t('od_empty_title')}</h3>
              <p>{t('od_empty_body')}</p>
              <button type="button" className="od-btn od-btn-outline od-btn-sm" onClick={clearFilters}>{t('od_empty_clear')}</button>
            </div>
          ) : view === 'grid' ? (
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
                        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15,4 9,12 15,20"/></svg>
                      </button>
                      <div className="od-day-scroll">
                        {dayItems.map((item) => (
                          <article className="od-feed-card" key={item.id}>
                            <div className="od-card-media">
                              <img src={item.image} alt={item.title} loading="lazy" />
                              <div className="od-card-badges">
                                <span className={'od-badge od-badge-' + item.status}>{statusLabel(item.status)}</span>
                                <span className={'od-badge od-badge-' + item.type}>{typeLabel(item.type)}</span>
                              </div>
                              <div className="od-card-price">
                                {formatPrice(item.price)}
                                {item.type === 'rent' ? <span className="od-price-unit">{t('od_unit_month')}</span> : null}
                              </div>
                            </div>
                            <div className="od-card-body">
                              <h3 className="od-card-title">{item.title}</h3>
                              <div className="od-card-location">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span>{item.location}</span>
                              </div>
                              <div className="od-card-meta">{specsLabel(item)}</div>
                              <div className="od-card-foot">
                                <span className="od-card-agent">{t('od_agent_label')} · {item.agent}</span>
                                <span className="od-card-updated">{t('od_updated')} {formatDayShort(item.updatedAt, lang)}</span>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                      <button type="button" className="od-day-scroll-btn od-next" onClick={(e) => scrollDay(e, 1)} aria-label={t('od_scroll_next')}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9,4 15,12 9,20"/></svg>
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <section className="od-listings-table-view">
              <table className="od-listings-table">
                <thead>
                  <tr>
                    <th>{t('od_th_property')}</th>
                    <th>{t('od_th_price')}</th>
                    <th>{t('od_th_type')}</th>
                    <th>{t('od_th_details')}</th>
                    <th>{t('od_th_status')}</th>
                    <th>{t('od_th_updated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="od-listing-cell">
                          <img className="od-listing-thumb" src={item.image} alt={item.title} loading="lazy" />
                          <div className="od-listing-info">
                            <div className="od-listing-title">{item.title}</div>
                            <div className="od-listing-location">{item.location}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="od-listing-price">{priceLabel(item)}</span></td>
                      <td>{typeLabel(item.type)}</td>
                      <td>{specsLabel(item)}</td>
                      <td><span className={'od-badge od-badge-' + item.status}>{statusLabel(item.status)}</span></td>
                      <td>{formatDayShort(item.updatedAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <footer className="od-foot">{t('od_brand_foot')}</footer>
        </div>
      </div>
    </div>
  );
}
