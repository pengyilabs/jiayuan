import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../lib/i18n.jsx';
import {
  listListings,
  listPosts,
  createPost,
  updatePost,
  deletePost,
  subscribe,
  listAgents,
  getBuilding,
  formatPrice,
  getSettings,
  updateSettings,
  POST_STATUSES,
  listDestinations,
} from '../lib/store.js';
import { generateDrafts, generatePostText, MAX_POSTS_PER_LISTING } from '../lib/generate.js';
import { getRole, getAgentId } from '../lib/session.js';
import TopBar from '../components/TopBar.jsx';
import './AgentFeed.css';

const IMG = '/images/listings/';

const PLATFORMS = [
  { id: 'Facebook', key: 'platform_fb', color: '#1877F2', icon: 'f', tagCls: 'tag-fb' },
  { id: 'wx', key: 'platform_wx', color: '#07C160', icon: 'W', tagCls: 'tag-wx' },
  { id: 'wxch', key: 'platform_wxch', color: '#FF6B2C', icon: 'W', tagCls: 'tag-wxch' },
  { id: 'Instagram', key: 'platform_ig', color: '#E1306C', icon: 'ig', tagCls: 'tag-ig' },
];

const LOCALES = { zh: 'zh-CN', en: 'en-US', fr: 'fr-FR', es: 'es-ES' };

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Week start (0 = Sunday … 6 = Saturday) derived from the locale when the
// runtime exposes Intl week info, Sunday otherwise.
function weekStartFor(lang) {
  try {
    const loc = new Intl.Locale(LOCALES[lang] || 'en-US');
    const info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo;
    if (info && typeof info.firstDay === 'number') return info.firstDay % 7;
  } catch (e) {}
  return 0;
}

// Builds the month grid (array of { iso, day, inMonth }), padded to full weeks.
function monthCells(y, m, weekStart) {
  const cells = [];
  const firstDow = (new Date(y, m, 1).getDay() - weekStart + 7) % 7;
  const prevLast = new Date(y, m, 0).getDate();
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(y, m - 1, prevLast - i);
    cells.push({ iso: localISO(d), day: d.getDate(), inMonth: false });
  }
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: localISO(new Date(y, m, d)), day: d, inMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(y, m + 1, nextDay++);
    cells.push({ iso: localISO(d), day: d.getDate(), inMonth: false });
  }
  return cells;
}

function parseDay(iso) {
  return new Date(String(iso).slice(0, 10) + 'T00:00:00');
}

function formatWeekday(iso, lang) {
  return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { weekday: 'short' }).format(parseDay(iso));
}

function dateGroupLabel(dateStr, lang, t) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  let formatted;
  try {
    formatted = new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(dt);
  } catch (e) {
    formatted = dateStr;
  }
  return dateStr === localISO(new Date()) ? `${t('date_today')} · ${formatted}` : formatted;
}

function PlatformTag({ platform, t }) {
  const p = PLATFORMS.find((x) => x.id === platform);
  return (
    <span
      className={'post-platform-tag ' + (p ? p.tagCls : 'tag-unknown')}
      style={p ? undefined : { background: '#999' }}
    >
      {p ? t(p.key) : platform}
    </span>
  );
}

function statusLabelKey(status) {
  return status === 'planned' ? 'status_planned' : status === 'published' ? 'status_published' : 'status_draft';
}

function StatusBadge({ status, t }) {
  return <span className={'af-status af-status-' + (status || 'draft')}>{t(statusLabelKey(status))}</span>;
}

// Quick status dropdown (feed card + editor). Promoting to planned/published
// fills in today's date when the post has none; moving to published will open
// the destination picker (Step 3).
function StatusSelect({ value, onChange, t, className }) {
  return (
    <select
      className={className || 'af-status-select'}
      aria-label={t('af_status_select_label')}
      value={value || 'draft'}
      onChange={(e) => onChange(e.target.value)}
    >
      {POST_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(statusLabelKey(s))}
        </option>
      ))}
    </select>
  );
}

function EngineBadge({ post, t }) {
  const engine = post.generation && post.generation.engine === 'mimo' ? 'mimo' : 'template';
  return (
    <span className={'af-engine-badge af-engine-' + engine}>
      {t(engine === 'mimo' ? 'af_engine_ai' : 'af_engine_template')}
    </span>
  );
}

function PostMedia({ post }) {
  const cover = (post.images && post.images[0]) || IMG + 'condo1.jpg';
  const isVideo = post.media === 'video';
  const isCarousel = post.media === 'carousel' && (post.images || []).length > 1;
  return (
    <div className="post-img-wrap">
      <img src={cover} alt="" loading="lazy" />
      {isVideo && (
        <div className="post-video-play">
          <div>
            <svg viewBox="0 0 24 24">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </div>
        </div>
      )}
      {isCarousel && (
        <div className="af-stack">
          {(post.images || []).slice(1, 4).map((src, i) => (
            <img key={i} src={src} alt="" loading="lazy" />
          ))}
          <span className="af-stack-count">{post.images.length}</span>
        </div>
      )}
    </div>
  );
}

// Social-feed card (feed view). Drafts render like any other post here — the
// status badge is the only difference (B1).
function PostCard({ post, authorName, t, liked, onToggleLike, onDelete, onOpen, canDelete, onStatusChange }) {
  return (
    <article className="post-card">
      <div className="post-header">
        <div className="post-avatar">HD</div>
        <div className="post-byline">
          <div className="post-author">{authorName || t('brand')}</div>
          <div className="post-meta">{post.date || t('af_no_date')}</div>
        </div>
        <div className="af-post-tags">
          {(post.platforms || []).map((p) => (
            <PlatformTag key={p} platform={p} t={t} />
          ))}
        </div>
      </div>
      <PostMedia post={post} />
      <div className="post-body">
        <div className="post-title">{post.title}</div>
        <div className="post-text">{post.text}</div>
        {post.hashtags ? <div className="post-hashtags">{post.hashtags}</div> : null}
        {post.listingTitle ? (
          <div className="af-post-promo">
            {t('af_promotes')} · {post.listingTitle}
          </div>
        ) : null}
      </div>
      <div className="af-post-badges">
        <StatusBadge status={post.status} t={t} />
        <EngineBadge post={post} t={t} />
        {/* B2: quick status change — same own-post rule as delete. */}
        {canDelete && onStatusChange ? (
          <StatusSelect value={post.status} onChange={(s) => onStatusChange(post, s)} t={t} />
        ) : null}
      </div>
      <div className="post-actions">
        <button type="button" className={'post-action' + (liked ? ' liked' : '')} onClick={() => onToggleLike(post.id)}>
          {liked ? t('liked') : t('like')}
        </button>
        <button type="button" className="post-action" onClick={onOpen}>
          {t('af_post_edit')}
        </button>
        {canDelete ? (
          <button
            type="button"
            className="post-action af-post-delete"
            aria-label={t('ls_card_delete')}
            onClick={() => onDelete(post.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            {t('ls_card_delete')}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PostTile({ post, agentName, t, onOpen }) {
  return (
    <button type="button" className="af-tile" onClick={onOpen}>
      <div className="af-tile-text">{post.text}</div>
      <div className="af-tile-chips">
        {(post.platforms || []).map((p) => (
          <PlatformTag key={p} platform={p} t={t} />
        ))}
      </div>
      <div className="af-tile-foot">
        <span className="af-tile-agent">{agentName}</span>
        <EngineBadge post={post} t={t} />
        <StatusBadge status={post.status} t={t} />
      </div>
    </button>
  );
}

function StepsBar({ step }) {
  return (
    <div className="create-steps">
      {[0, 1, 2].map((i) => (
        <div key={i} className={'create-step' + (i < step ? ' done' : i === step ? ' active' : '')} />
      ))}
    </div>
  );
}

function TplOption({ selected, onSelect, name, desc, wide, children }) {
  return (
    <button
      type="button"
      className={'tpl-card' + (selected ? ' selected' : '')}
      style={wide ? { gridColumn: 'span 2' } : undefined}
      onClick={onSelect}
    >
      <div className="tpl-preview">{children}</div>
      <div className="tpl-label">
        <div className="tpl-label-name">{name}</div>
        <div className="tpl-label-desc">{desc}</div>
      </div>
    </button>
  );
}

function FormatOption({ selected, onSelect, icon, name, desc }) {
  return (
    <button type="button" className={'format-option' + (selected ? ' selected' : '')} onClick={onSelect}>
      <div className="format-icon">{icon}</div>
      <div className="format-name">{name}</div>
      <div className="format-desc">{desc}</div>
    </button>
  );
}

function PickerThumb({ src, selected, onToggle }) {
  return (
    <button type="button" className={'af-picker-thumb' + (selected ? ' selected' : '')} onClick={onToggle}>
      <img src={src} alt="" loading="lazy" />
      {selected && <span className="af-picker-check">✓</span>}
    </button>
  );
}

export default function AgentFeed() {
  const { lang, t } = useLang();

  // M5 roles: agents generate/plan only for their assigned listings;
  // the owner keeps the company-wide view (C4).
  const isAgent = getRole() === 'agent';
  const myId = getAgentId();

  const [listings, setListings] = useState([]);
  const [posts, setPosts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [createState, setCreateState] = useState({
    listingIds: [],
    noListing: false,
    countPerListing: 1,
    platforms: [],
    templateId: undefined,
    templateFormat: 'single',
    date: localISO(new Date()),
  });
  const [batchRunning, setBatchRunning] = useState(false);
  const [genProgress, setGenProgress] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);
  const [editorPost, setEditorPost] = useState(null);
  const [form, setForm] = useState(null);
  // Step 3 publish flow: { post, contentPatch, persistOnCancel, dests, destIds, stage }
  const [publishFlow, setPublishFlow] = useState(null);
  const [picker, setPicker] = useState({ listing: [], building: [] });
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('pp-feed-view') === 'calendar' ? 'calendar' : 'feed';
    } catch (e) {
      return 'feed';
    }
  });
  const [activeDay, setActiveDay] = useState('');
  const [liked, setLiked] = useState(() => new Set());
  const [toast, setToast] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    document.title = `${t('af_heading')} — ${t('brand_mark')}`;
  }, [t]);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      Promise.all([listListings(isAgent ? { agentId: myId } : undefined), listPosts(), listAgents()]).then(
        ([items, ps, ags]) => {
          if (!alive) return;
          setListings(items);
          setAgents(ags);
          // Planner scope: agents see posts on their assigned listings plus
          // their own posts (e.g. brand drafts without a listing).
          if (isAgent) {
            const own = new Set(items.map((l) => l.id));
            setPosts(ps.filter((p) => own.has(p.listingId) || (myId && p.createdByAgentId === myId)));
          } else {
            setPosts(ps);
          }
        }
      );
    };
    refresh();
    const unsub = subscribe(refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, [isAgent, myId]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // Close the month picker on click outside.
  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  // ←/→ jump between months on the calendar (when not typing or in a modal).
  useEffect(() => {
    if (view !== 'calendar') return;
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (pickerOpen || sheetOpen || editorPost || publishFlow || settingsOpen) return;
      if (e.key === 'ArrowLeft') prevMonth();
      else if (e.key === 'ArrowRight') nextMonth();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, pickerOpen, sheetOpen, editorPost, publishFlow, settingsOpen]);

  const today = localISO(new Date());

  const postsByDate = useMemo(() => {
    const map = new Map();
    for (const p of posts) {
      const key = String(p.date || '').slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    }
    return map;
  }, [posts]);

  // Posts without a date can't sit on a day; they surface in a "No date"
  // section/strip. Drafts WITH a date render inline like any other post.
  const undated = useMemo(() => posts.filter((p) => !String(p.date || '').slice(0, 10)), [posts]);

  // Social feed: day groups, newest day first (the original feed look).
  const feedDays = useMemo(() => {
    const map = new Map();
    for (const p of posts) {
      const key = String(p.date || '').slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    }
    const dated = [...map.entries()].filter(([k]) => k).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return { dated, undated: map.get('') || [] };
  }, [posts]);

  const weekStart = useMemo(() => weekStartFor(lang), [lang]);

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { weekday: 'short' });
    const names = [];
    for (let i = 0; i < 7; i++) names.push(fmt.format(new Date(2024, 0, 7 + i))); // Sun..Sat
    return names.slice(weekStart).concat(names.slice(0, weekStart));
  }, [lang, weekStart]);

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { month: 'long', year: 'numeric' }).format(
        new Date(cursor.y, cursor.m, 1)
      );
    } catch (e) {
      return `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;
    }
  }, [lang, cursor]);

  const cells = useMemo(() => monthCells(cursor.y, cursor.m, weekStart), [cursor, weekStart]);

  // Short month names for the month picker grid.
  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { month: 'short' });
    const names = [];
    for (let m = 0; m < 12; m++) names.push(fmt.format(new Date(2024, m, 1)));
    return names;
  }, [lang]);

  function agentName(id) {
    return (agents.find((a) => a.id === id) || {}).name || '';
  }

  function showToast(msg, ms = 2200) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), ms);
  }

  function prevMonth() {
    setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  }

  function nextMonth() {
    setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));
  }

  function goToday() {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  function jumpToDay(key) {
    setActiveDay(key);
    const el = document.getElementById('af-day-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleLike(id) {
    setLiked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function switchView(v) {
    setView(v);
    try {
      localStorage.setItem('pp-feed-view', v);
    } catch (e) {}
  }

  // ── Quick status change (feed card dropdown) ─────────────────────────────

  // B2: status changes apply immediately. Promoting to planned keeps the post
  // in its day slot by assigning today when it has no date.
  // Agents may only change status of their own posts (M5).
  async function changeStatus(post, nextStatus) {
    if (!nextStatus || nextStatus === post.status) return;
    if (isAgent && post.createdByAgentId !== myId) return;
    // B3: promoting to published goes through the destination picker.
    if (nextStatus === 'published') {
      openPublishFlow(post, {}, false);
      return;
    }
    const patch = { status: nextStatus };
    if (nextStatus === 'planned' && !post.date) patch.date = localISO(new Date());
    await updatePost(post.id, patch);
    showToast(t('af_toast_status'));
  }

  // ── Publish flow (B3): "Where to publish?" → share panel ─────────────────

  // Promoting to 'published' first asks where to publish (destinations are the
  // Facebook groups from the destinations data layer), then shows a share
  // panel. Experience only — no real Facebook integration yet.
  async function openPublishFlow(post, contentPatch, persistOnCancel) {
    const dests = await listDestinations();
    setPublishFlow({
      post,
      contentPatch: contentPatch || {},
      persistOnCancel: !!persistOnCancel,
      dests,
      destIds: dests.map((d) => d.id),
      stage: 'pick',
    });
  }

  function togglePublishDest(id) {
    setPublishFlow((f) => ({
      ...f,
      destIds: f.destIds.indexOf(id) >= 0 ? f.destIds.filter((x) => x !== id) : [...f.destIds, id],
    }));
  }

  async function confirmPublish() {
    const f = publishFlow;
    if (!f.destIds.length) {
      showToast(t('af_publish_need_dest'));
      return;
    }
    const patch = Object.assign({}, f.contentPatch, {
      status: 'published',
      destinations: f.destIds.slice(),
      publishedAt: f.post.publishedAt || new Date().toISOString(),
      date: f.contentPatch.date || f.post.date || localISO(new Date()),
    });
    await updatePost(f.post.id, patch);
    setPublishFlow({ ...f, stage: 'share' });
    showToast(t('af_toast_published'));
  }

  // Cancel keeps any content edits (editor flow) but leaves the status as it
  // was — nothing gets published.
  async function cancelPublish() {
    const f = publishFlow;
    if (f.persistOnCancel && Object.keys(f.contentPatch).length) {
      await updatePost(f.post.id, f.contentPatch);
      showToast(t('af_toast_saved'));
    }
    setPublishFlow(null);
  }

  async function copyCaption(post) {
    const caption = [post.title, post.text, post.hashtags].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(caption);
      showToast(t('af_caption_copied'));
    } catch (e) {
      showToast(t('af_caption_copy_failed'));
    }
  }

  // ── Draft editor ─────────────────────────────────────────────────────────

  async function openEditor(post) {
    setEditorPost(post);
    setForm({
      title: post.title || '',
      text: post.text || '',
      hashtags: post.hashtags || '',
      date: post.date || '',
      status: post.status || 'draft',
      platforms: (post.platforms || []).slice(),
      images: (post.images || []).slice(),
    });
    const listing = post.listingId ? listings.find((l) => l.id === post.listingId) : null;
    const listingPhotos = listing ? (listing.photos || []).slice() : [];
    let buildingPhotos = [];
    if (listing && listing.buildingId) {
      const building = await getBuilding(listing.buildingId);
      buildingPhotos = ((building && building.photos) || []).map((p) => p.src).filter(Boolean);
    }
    setPicker({ listing: listingPhotos, building: buildingPhotos });
  }

  function closeEditor() {
    setEditorPost(null);
    setForm(null);
  }

  function toggleFormPlatform(id) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.indexOf(id) >= 0 ? f.platforms.filter((p) => p !== id) : [...f.platforms, id],
    }));
  }

  function toggleImage(src) {
    setForm((f) => ({
      ...f,
      images: f.images.indexOf(src) >= 0 ? f.images.filter((s) => s !== src) : [...f.images, src],
    }));
  }

  function editorPatch() {
    return {
      title: form.title,
      text: form.text,
      hashtags: form.hashtags,
      date: form.date,
      platforms: form.platforms.slice(),
      images: form.images.slice(),
      media: form.images.length > 1 ? 'carousel' : 'single',
      editedText: form.text !== editorPost.text ? true : editorPost.editedText,
    };
  }

  async function saveEditor(nextStatus, toastKey) {
    if (!editorPost || !form) return;
    const patch = editorPatch();
    if (nextStatus) patch.status = nextStatus;
    await updatePost(editorPost.id, patch);
    closeEditor();
    showToast(t(toastKey || 'af_toast_saved'));
  }

  // B2: one Save button + the status selector — planned/published still
  // require a date and at least one network.
  function saveEditorFromForm() {
    const next = form.status || 'draft';
    if (next === 'planned' || next === 'published') {
      if (!form.date) {
        showToast(t('af_need_date'));
        return;
      }
      if (!form.platforms.length) {
        showToast(t('af_need_platform'));
        return;
      }
    }
    const prev = editorPost.status || 'draft';
    // B3: promoting to published opens the destination picker first. Content
    // edits ride along in the patch — they land on confirm, or land without
    // the status change on cancel.
    if (next === 'published' && prev !== 'published') {
      const contentPatch = editorPatch();
      closeEditor();
      openPublishFlow(editorPost, contentPatch, true);
      return;
    }
    const toastKey = next === prev ? 'af_toast_saved' : next === 'draft' ? 'af_toast_unplanned' : 'af_toast_planned';
    saveEditor(next, toastKey);
  }

  async function handleDelete(id) {
    if (!window.confirm(t('af_delete_confirm'))) return;
    await deletePost(id);
    if (editorPost && editorPost.id === id) closeEditor();
    showToast(t('af_toast_deleted'));
  }

  // ── Creation flow (listing → template → platforms + date) ────────────────

  function openCreate() {
    setCreateStep(0);
    setCreateState({
      listingIds: [],
      noListing: false,
      countPerListing: 1,
      platforms: [],
      templateId: undefined,
      templateFormat: 'single',
      date: localISO(new Date()),
    });
    setSheetOpen(true);
  }

  function closeCreate() {
    setSheetOpen(false);
  }

  // Step 1 is a checkbox list: one checked listing keeps the old single-post
  // UX (1×1 run), several checked listings + a per-listing count give the
  // 1×N / M×N batch modes (B7).
  function toggleListingSelect(id) {
    setCreateState((s) => ({
      ...s,
      noListing: false,
      listingIds: s.listingIds.indexOf(id) >= 0 ? s.listingIds.filter((x) => x !== id) : [...s.listingIds, id],
    }));
  }

  function toggleNoListing() {
    setCreateState((s) => ({ ...s, noListing: !s.noListing, listingIds: !s.noListing ? [] : s.listingIds }));
  }

  function setCountPerListing(value) {
    const n = Math.min(MAX_POSTS_PER_LISTING, Math.max(1, Number(value) || 1));
    setCreateState((s) => ({ ...s, countPerListing: n }));
  }

  function togglePlatform(id) {
    setCreateState((s) => ({
      ...s,
      platforms: s.platforms.indexOf(id) === -1 ? [...s.platforms, id] : s.platforms.filter((p) => p !== id),
    }));
  }

  function selectTemplate(id) {
    setCreateState((s) => ({ ...s, templateId: id }));
  }

  function selectFormat(fmt) {
    setCreateState((s) => ({ ...s, templateFormat: fmt }));
  }

  // The logged-in agent when the demo role picker stored one; otherwise the
  // first agent so planner tiles have an author (no auth system this round).
  function currentAgentId() {
    const id = getAgentId();
    if (id) return id;
    return agents[0] ? agents[0].id : '';
  }

  // ── Generation run (B7): 1×1, 1×N and M×N all go through the same facade ──
  async function runGenerate() {
    if (batchRunning) return;
    if (!createState.platforms.length) {
      showToast(t('af_need_platform'));
      return;
    }
    const targets = createState.noListing ? [] : selectedListings;
    if (!targets.length && !createState.noListing) return;
    const count = createState.noListing ? 1 : runCount;
    const date = createState.date || today;
    const hasTemplate = createState.templateId !== undefined && createState.templateId !== null;

    setBatchRunning(true);
    setGenProgress({ done: 0, total: Math.max(1, targets.length * count) });

    let drafts;
    if (targets.length) {
      drafts = await generateDrafts({
        listings: targets,
        countPerListing: count,
        platforms: createState.platforms.slice(),
        date,
        t,
        onProgress: (done, total) => setGenProgress({ done, total }),
      });
    } else {
      // Brand post without a listing — still recorded with provenance.
      const res = await generatePostText(null, { t });
      drafts = [
        {
          listingId: '',
          listingTitle: '',
          title: t('post_new_title'),
          text: res.text,
          hashtags: res.hashtags,
          images: [IMG + 'condo3.jpg'],
          media: 'single',
          date,
          generation: { mode: 'single', engine: res.engine },
        },
      ];
    }

    // ONE record per draft, each carrying the full platforms[] (B3).
    const created = [];
    for (const d of drafts) {
      let media = d.media;
      if (hasTemplate && createState.templateFormat === 'video') media = 'video';
      created.push(
        await createPost({
          listingId: d.listingId,
          listingTitle: d.listingTitle,
          title: d.title,
          text: d.text,
          images: d.images,
          media,
          platforms: createState.platforms.slice(),
          templateId: hasTemplate ? createState.templateId : null,
          hashtags: d.hashtags,
          date: d.date || date,
          createdByAgentId: currentAgentId(),
          generation: d.generation,
          editedText: false,
        })
      );
    }

    setBatchRunning(false);
    setGenProgress(null);
    setSheetOpen(false);

    // Land the planner on the month the drafts were generated into.
    const first = created[0] || null;
    if (first) {
      const d = new Date(String(first.date || date) + 'T00:00:00');
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
    }
    if (created.length === 1) {
      showToast(t('af_toast_draft_created'));
      if (first) openEditor(first);
    } else {
      const mimo = drafts.filter((x) => x.generation.engine === 'mimo').length;
      showToast(
        t('af_batch_result')
          .replace('{n}', String(created.length))
          .replace('{mimo}', String(mimo))
          .replace('{tpl}', String(created.length - mimo)),
        5000
      );
    }
  }

  // ── AI settings (MiMo key/model/endpoint; template fallback without a key) ─
  async function openSettings() {
    const s = await getSettings();
    setSettingsForm({
      enabled: !!(s.llm && s.llm.enabled),
      apiKey: (s.llm && s.llm.apiKey) || '',
      model: (s.llm && s.llm.model) || 'mimo-v2.6-flash',
      baseUrl: (s.llm && s.llm.baseUrl) || 'https://api.xiaomimimo.com/v1',
    });
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    setSettingsForm(null);
  }

  async function saveSettings() {
    await updateSettings({
      llm: {
        provider: 'mimo',
        enabled: !!settingsForm.enabled,
        apiKey: settingsForm.apiKey.trim(),
        model: settingsForm.model.trim() || 'mimo-v2.6-flash',
        baseUrl: settingsForm.baseUrl.trim() || 'https://api.xiaomimimo.com/v1',
      },
    });
    closeSettings();
    showToast(t('af_ai_saved'));
  }

  const selCount = createState.platforms.length;
  const tplSelected = createState.templateId !== undefined && createState.templateId !== null;
  const selectedListings = listings.filter((l) => createState.listingIds.indexOf(l.id) >= 0);
  const runCount = createState.noListing
    ? 1
    : Math.min(MAX_POSTS_PER_LISTING, Math.max(1, Number(createState.countPerListing) || 1));
  const runTotal = createState.noListing ? 1 : selectedListings.length * runCount;

  let sheetTitle = t('select_listing');
  let sheetBody = null;
  let sheetFooter = null;

  if (createStep === 0) {
    sheetTitle = t('select_listing');
    sheetBody = (
      <Fragment>
        <StepsBar step={0} />
        <div className="step-label">{t('step_of_1')}</div>
        <div className="step-title">{t('step_1')}</div>
        {listings.map((l) => (
          <button
            type="button"
            key={l.id}
            className={'listing-option' + (createState.listingIds.indexOf(l.id) >= 0 ? ' selected' : '')}
            onClick={() => toggleListingSelect(l.id)}
          >
            <span className="af-check-box" aria-hidden="true" />
            <img className="listing-thumb" src={l.image} alt="" />
            <div className="listing-info">
              <div className="listing-name">{l.title}</div>
              <div className="listing-detail">
                {l.beds} {t('beds_unit')} {l.baths} {t('baths_unit')} ·{' '}
                {t(l.type === 'rent' ? 'rent_label' : 'sale_label')}
              </div>
              <div className="listing-price">
                {formatPrice(l.price, l.currency)}
                {l.type === 'rent' ? t('per_month') : ''}
              </div>
            </div>
          </button>
        ))}
        <button
          type="button"
          className={'listing-option' + (createState.noListing ? ' selected' : '')}
          onClick={toggleNoListing}
        >
          <span className="af-check-box" aria-hidden="true" />
          <div className="listing-thumb listing-thumb-note">📝</div>
          <div className="listing-info">
            <div className="listing-name">{t('no_listing')}</div>
            <div className="listing-detail">{t('no_listing_desc')}</div>
          </div>
        </button>
        <div className="af-count-row">
          <span className="af-field-label">{t('af_posts_per_property')}</span>
          <input
            type="number"
            className="af-input af-count-input"
            min="1"
            max={String(MAX_POSTS_PER_LISTING)}
            value={createState.noListing ? 1 : createState.countPerListing}
            disabled={createState.noListing}
            onChange={(e) => setCountPerListing(e.target.value)}
          />
        </div>
        {!createState.noListing && selectedListings.length > 0 && (
          <div className="af-run-summary">
            {t('af_run_summary')
              .replace('{props}', String(selectedListings.length))
              .replace('{posts}', String(runCount))
              .replace('{total}', String(runTotal))}
          </div>
        )}
      </Fragment>
    );
    sheetFooter = (
      <Fragment>
        <button type="button" className="btn btn-ghost" onClick={closeCreate}>
          {t('btn_cancel')}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!createState.noListing && createState.listingIds.length === 0}
          onClick={() => setCreateStep(1)}
        >
          {t('btn_next')}
        </button>
      </Fragment>
    );
  } else if (createStep === 1) {
    sheetTitle = t('select_template');
    sheetBody = (
      <Fragment>
        <StepsBar step={1} />
        <div className="step-label">{t('step_of_2')}</div>
        <div className="step-title">{t('select_template')}</div>
        <div className="template-grid">
          <TplOption
            selected={createState.templateId === 1}
            onSelect={() => selectTemplate(1)}
            name={t('tpl_name_a')}
            desc={t('tpl_desc_a')}
          >
            <div className="tpl-design-a">
              <div className="tpl-brand">{t('brand')}</div>
              <div className="tpl-price">{t('hero_price')}</div>
              <div className="tpl-title">{t('hero_title')}</div>
              <img className="tpl-photo" src={IMG + 'condo1.jpg'} alt="" />
            </div>
          </TplOption>
          <TplOption
            selected={createState.templateId === 2}
            onSelect={() => selectTemplate(2)}
            name={t('tpl_name_b')}
            desc={t('tpl_desc_b')}
          >
            <div className="tpl-design-b">
              <img className="tpl-photo" src={IMG + 'villa1.jpg'} alt="" />
              <div className="tpl-info">
                <div className="tpl-badge">{t('for_sale')}</div>
                <div className="tpl-price">{t('tpl_sample_price')}</div>
                <div className="tpl-address">{t('tpl_sample_address')}</div>
              </div>
              <div className="tpl-brand">{t('brand_mark')}</div>
            </div>
          </TplOption>
          <TplOption
            selected={createState.templateId === 3}
            onSelect={() => selectTemplate(3)}
            name={t('tpl_name_c')}
            desc={t('tpl_desc_c')}
          >
            <div className="tpl-design-c">
              <img className="tpl-photo" src={IMG + 'condo1.jpg'} alt="" />
              <div className="tpl-overlay">
                <div className="tpl-brand">{t('brand')}</div>
                <div className="tpl-price">{t('rent_price')}</div>
                <div className="tpl-title">
                  {t('hero_title')} · {t('rent_label')}
                </div>
                <div className="tpl-tag">{t('rent_label')}</div>
              </div>
            </div>
          </TplOption>
          <TplOption
            selected={createState.templateId === 5}
            onSelect={() => selectTemplate(5)}
            name={t('tpl_name_d')}
            desc={t('tpl_desc_d')}
          >
            <div className="tpl-design-d">
              <div className="tpl-left">
                <div className="tpl-brand">{t('brand_mark')}</div>
                <div className="tpl-zh">{t('bi_title')}</div>
                <div className="tpl-en">{t('bi_sub')}</div>
              </div>
              <img className="tpl-photo" src={IMG + 'villa1.jpg'} alt="" />
              <div className="tpl-price">{t('hero_price')}</div>
            </div>
          </TplOption>
          <TplOption
            wide
            selected={createState.templateId === null}
            onSelect={() => selectTemplate(null)}
            name={t('tpl_name_blank')}
            desc={t('tpl_blank_desc')}
          >
            <div className="tpl-blank">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>{t('no_template')}</span>
            </div>
          </TplOption>
        </div>
        {tplSelected && (
          <div className="format-block">
            <div className="step-title format-title">{t('format_title')}</div>
            <div className="format-grid">
              <FormatOption
                selected={createState.templateFormat === 'carousel'}
                onSelect={() => selectFormat('carousel')}
                icon="🖼"
                name={t('format_carousel')}
                desc={t('format_carousel_desc')}
              />
              <FormatOption
                selected={createState.templateFormat === 'single'}
                onSelect={() => selectFormat('single')}
                icon="📷"
                name={t('format_single')}
                desc={t('format_single_desc')}
              />
              <FormatOption
                selected={createState.templateFormat === 'video'}
                onSelect={() => selectFormat('video')}
                icon="▶"
                name={t('format_video')}
                desc={t('format_video_desc')}
              />
            </div>
          </div>
        )}
      </Fragment>
    );
    sheetFooter = (
      <Fragment>
        <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(0)}>
          {t('btn_prev')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setCreateStep(2)}>
          {t('btn_next')}
        </button>
      </Fragment>
    );
  } else {
    sheetTitle = t('select_platform');
    sheetBody = (
      <Fragment>
        <StepsBar step={2} />
        <div className="step-label">{t('step_of_3')}</div>
        <div className="step-title">
          {t('select_platform')}
          {selCount ? ` (${selCount})` : ''}
        </div>
        <div className="platform-grid">
          {PLATFORMS.map((p) => (
            <button
              type="button"
              key={p.id}
              className={'platform-option' + (createState.platforms.indexOf(p.id) >= 0 ? ' selected' : '')}
              onClick={() => togglePlatform(p.id)}
            >
              <div className="platform-icon" style={{ background: p.color }}>
                {p.icon}
              </div>
              <div className="platform-name">{t(p.key)}</div>
            </button>
          ))}
        </div>
        <label className="af-field af-field-date">
          <span className="af-field-label">{t('af_field_date')}</span>
          <input
            type="date"
            className="af-input"
            value={createState.date}
            onChange={(e) => setCreateState((s) => ({ ...s, date: e.target.value }))}
          />
        </label>
        {batchRunning && genProgress && (
          <div className="af-progress">
            <div className="af-progress-bar">
              <div
                className="af-progress-fill"
                style={{ width: Math.round((genProgress.done / Math.max(1, genProgress.total)) * 100) + '%' }}
              />
            </div>
            <div className="af-progress-text">
              {t('af_generating')
                .replace('{done}', String(genProgress.done))
                .replace('{total}', String(genProgress.total))}
            </div>
          </div>
        )}
      </Fragment>
    );
    sheetFooter = (
      <Fragment>
        <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(1)}>
          {t('btn_prev')}
        </button>
        <button type="button" className="btn btn-primary" disabled={!selCount || batchRunning} onClick={runGenerate}>
          {runTotal > 1 ? t('af_generate') : t('af_create_draft')}
        </button>
      </Fragment>
    );
  }

  return (
    <div className="af-page">
      <TopBar />

      <header className="af-header">
        <div className="af-header-bar">
          <div className="af-header-left">
            <span className="af-eyebrow">{t('af_eyebrow')}</span>
            <h1 className="af-title">{t('af_heading')}</h1>
          </div>
          <div className="af-view-toggle" role="group" aria-label={t('af_view_toggle_label')}>
            <button
              type="button"
              className={'af-view-btn' + (view === 'feed' ? ' active' : '')}
              aria-pressed={view === 'feed'}
              onClick={() => switchView('feed')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="14" y2="17" />
              </svg>
              <span>{t('af_view_feed')}</span>
            </button>
            <button
              type="button"
              className={'af-view-btn' + (view === 'calendar' ? ' active' : '')}
              aria-pressed={view === 'calendar'}
              onClick={() => switchView('calendar')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="3" x2="8" y2="7" />
                <line x1="16" y1="3" x2="16" y2="7" />
              </svg>
              <span>{t('af_view_calendar')}</span>
            </button>
          </div>
          <div className="af-header-actions">
            <button type="button" className="af-btn af-btn-ai" onClick={openSettings}>
              <span>{t('af_ai_settings')}</span>
            </button>
            <button type="button" className="af-btn af-btn-accent" onClick={openCreate}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{t('af_create_post')}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="af-feed">
        {posts.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p>{t('feed_empty')}</p>
            <button type="button" className="af-btn af-btn-accent af-empty-btn" onClick={openCreate}>
              {t('af_create_post')}
            </button>
          </div>
        )}

        {view === 'feed' && posts.length > 0 && (
          <div className="af-social-feed">
            <nav className="af-date-rail" aria-label={t('af_date_rail_label')}>
              {feedDays.dated.map(([key]) => (
                <button
                  key={key}
                  type="button"
                  className={
                    'af-date-pill' + (activeDay === key ? ' af-active' : '') + (key === today ? ' af-today' : '')
                  }
                  onClick={() => jumpToDay(key)}
                >
                  <span className="af-dr-weekday">{formatWeekday(key, lang)}</span>
                  <span className="af-dr-day">{parseDay(key).getDate()}</span>
                  <span className="af-dr-dot" />
                </button>
              ))}
            </nav>
            <div className="af-day-rows">
              {feedDays.undated.length > 0 && (
                <section className="af-day-section">
                  <div className="af-day-header">
                    <h2 className="af-day-date">{t('af_no_date')}</h2>
                    <span className="af-day-count">
                      {feedDays.undated.length} {t('posts_unit')}
                    </span>
                  </div>
                  <div className="af-day-posts">
                    {feedDays.undated.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        authorName={agentName(post.createdByAgentId)}
                        t={t}
                        liked={liked.has(post.id)}
                        onToggleLike={toggleLike}
                        onDelete={handleDelete}
                        onOpen={() => openEditor(post)}
                        canDelete={!isAgent || post.createdByAgentId === myId}
                        onStatusChange={changeStatus}
                      />
                    ))}
                  </div>
                </section>
              )}
              {feedDays.dated.map(([key, dayPosts]) => (
                <section className="af-day-section" id={'af-day-' + key} key={key}>
                  <div className="af-day-header">
                    <h2 className="af-day-date">{dateGroupLabel(key, lang, t)}</h2>
                    <span className="af-day-count">
                      {dayPosts.length} {t('posts_unit')}
                    </span>
                  </div>
                  <div className="af-day-posts">
                    {dayPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        authorName={agentName(post.createdByAgentId)}
                        t={t}
                        liked={liked.has(post.id)}
                        onToggleLike={toggleLike}
                        onDelete={handleDelete}
                        onOpen={() => openEditor(post)}
                        canDelete={!isAgent || post.createdByAgentId === myId}
                        onStatusChange={changeStatus}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="af-planner">
            <div className="af-month-nav">
              <button type="button" className="af-nav-btn" aria-label={t('af_prev_month')} onClick={prevMonth}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="af-month-pick-wrap" ref={pickerRef}>
                <button
                  type="button"
                  className="af-month-label"
                  aria-label={t('af_month_picker_label')}
                  aria-expanded={pickerOpen}
                  onClick={() => setPickerOpen((v) => !v)}
                >
                  {monthLabel}
                </button>
                {pickerOpen && (
                  <div className="af-month-picker" role="dialog" aria-label={t('af_month_picker_label')}>
                    <div className="af-mp-year">
                      <button
                        type="button"
                        className="af-nav-btn"
                        aria-label={t('af_prev_year')}
                        onClick={() => setCursor((c) => ({ y: c.y - 1, m: c.m }))}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <span className="af-mp-year-label">{cursor.y}</span>
                      <button
                        type="button"
                        className="af-nav-btn"
                        aria-label={t('af_next_year')}
                        onClick={() => setCursor((c) => ({ y: c.y + 1, m: c.m }))}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                    <div className="af-mp-months">
                      {monthNames.map((name, m) => (
                        <button
                          key={m}
                          type="button"
                          className={'af-mp-month' + (m === cursor.m ? ' active' : '')}
                          onClick={() => {
                            setCursor((c) => ({ y: c.y, m }));
                            setPickerOpen(false);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button type="button" className="af-nav-btn" aria-label={t('af_next_month')} onClick={nextMonth}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button type="button" className="af-btn af-btn-today" onClick={goToday}>
                {t('date_today')}
              </button>
            </div>

            {undated.length > 0 && (
              <div className="af-draft-strip">
                <span className="af-draft-strip-title">{t('af_unscheduled')}</span>
                <div className="af-draft-chips">
                  {undated.map((p) => (
                    <button key={p.id} type="button" className="af-draft-chip" onClick={() => openEditor(p)}>
                      <span className="af-draft-chip-title">{p.title || p.listingTitle || t('af_edit_post')}</span>
                      <span className="af-draft-chip-date">{t('af_no_date')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="af-cal-scroll">
              <div className="af-cal" aria-label={t('af_calendar_label')}>
                <div className="af-cal-weekdays">
                  {weekdayLabels.map((label, i) => (
                    <div key={i} className="af-cal-weekday">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="af-cal-grid">
                  {cells.map((cell) => (
                    <div
                      key={cell.iso}
                      className={
                        'af-cal-cell' + (cell.inMonth ? '' : ' af-other') + (cell.iso === today ? ' af-today' : '')
                      }
                    >
                      <div className="af-cal-daynum">{cell.day}</div>
                      <div className="af-cal-tiles">
                        {(postsByDate.get(cell.iso) || []).map((p) => (
                          <PostTile
                            key={p.id}
                            post={p}
                            agentName={agentName(p.createdByAgentId)}
                            t={t}
                            onOpen={() => openEditor(p)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={'sheet-overlay' + (sheetOpen ? ' open' : '')}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeCreate();
        }}
      >
        <div className="sheet">
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div className="sheet-title">{sheetTitle}</div>
            <button type="button" className="sheet-close" aria-label={t('btn_cancel')} onClick={closeCreate}>
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="sheet-body">{sheetBody}</div>
          <div className="sheet-footer">{sheetFooter}</div>
        </div>
      </div>

      {editorPost && form && (
        <div
          className="sheet-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <div className="sheet-title">{t('af_edit_post')}</div>
                {editorPost.listingTitle ? <div className="af-editor-sub">{editorPost.listingTitle}</div> : null}
              </div>
              <EngineBadge post={editorPost} t={t} />
              <StatusBadge status={editorPost.status} t={t} />
              <button type="button" className="sheet-close" aria-label={t('btn_cancel')} onClick={closeEditor}>
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="sheet-body">
              <label className="af-field">
                <span className="af-field-label">{t('af_field_title')}</span>
                <input
                  type="text"
                  className="af-input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="af-field">
                <span className="af-field-label">{t('af_field_text')}</span>
                <textarea
                  className="af-textarea"
                  rows={6}
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                />
              </label>
              <label className="af-field">
                <span className="af-field-label">{t('af_field_hashtags')}</span>
                <input
                  type="text"
                  className="af-input"
                  value={form.hashtags}
                  onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
                />
              </label>
              {/* B2: status is editable directly — changing it here saves with
                  the rest of the form (own posts only, M5). */}
              {!isAgent || editorPost.createdByAgentId === myId ? (
                <div className="af-field">
                  <span className="af-field-label">{t('af_field_status')}</span>
                  <StatusSelect
                    className="af-input af-status-input"
                    value={form.status}
                    onChange={(status) => setForm((f) => ({ ...f, status }))}
                    t={t}
                  />
                </div>
              ) : null}
              <label className="af-field">
                <span className="af-field-label">{t('af_field_date')}</span>
                <input
                  type="date"
                  className="af-input"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </label>
              <div className="af-field">
                <span className="af-field-label">{t('af_field_platforms')}</span>
                <div className="af-check-row">
                  {PLATFORMS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={'af-check-chip' + (form.platforms.indexOf(p.id) >= 0 ? ' selected' : '')}
                      onClick={() => toggleFormPlatform(p.id)}
                    >
                      <span className="af-chip-icon" style={{ background: p.color }}>
                        {p.icon}
                      </span>
                      {t(p.key)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="af-field">
                <span className="af-field-label">{t('af_field_images')}</span>
                {form.images.length > 0 && (
                  <div className="af-selected-images">
                    {form.images.map((src, i) => (
                      <div className="af-img-thumb" key={src + i}>
                        <img src={src} alt="" loading="lazy" />
                        <button
                          type="button"
                          className="af-img-remove"
                          aria-label={t('ls_card_delete')}
                          onClick={() => toggleImage(src)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {picker.listing.length > 0 && (
                  <div className="af-picker">
                    <div className="af-picker-title">{t('af_images_listing')}</div>
                    <div className="af-picker-grid">
                      {picker.listing.map((src, i) => (
                        <PickerThumb
                          key={src + i}
                          src={src}
                          selected={form.images.indexOf(src) >= 0}
                          onToggle={() => toggleImage(src)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {picker.building.length > 0 && (
                  <div className="af-picker">
                    <div className="af-picker-title">{t('af_images_building')}</div>
                    <div className="af-picker-grid">
                      {picker.building.map((src, i) => (
                        <PickerThumb
                          key={src + i}
                          src={src}
                          selected={form.images.indexOf(src) >= 0}
                          onToggle={() => toggleImage(src)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="sheet-footer">
              {/* M5: agents may only delete posts they created themselves. */}
              {!isAgent || editorPost.createdByAgentId === myId ? (
                <button
                  type="button"
                  className="btn btn-ghost af-btn-delete"
                  onClick={() => handleDelete(editorPost.id)}
                >
                  {t('ls_card_delete')}
                </button>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={saveEditorFromForm}>
                {t('af_save_changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B3: publish flow — "Where to publish?" picker → share panel */}
      {publishFlow && (
        <div
          className="sheet-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelPublish();
          }}
        >
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <div className="sheet-title">
                  {publishFlow.stage === 'pick' ? t('af_publish_title') : t('af_publish_done_title')}
                </div>
                {publishFlow.post.title ? <div className="af-editor-sub">{publishFlow.post.title}</div> : null}
              </div>
              <button type="button" className="sheet-close" aria-label={t('btn_cancel')} onClick={cancelPublish}>
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="sheet-body">
              {publishFlow.stage === 'pick' ? (
                <Fragment>
                  <p className="af-publish-sub">{t('af_publish_sub')}</p>
                  <div className="af-dest-list">
                    {publishFlow.dests.map((d) => (
                      <label
                        key={d.id}
                        className={'af-dest-row' + (publishFlow.destIds.indexOf(d.id) >= 0 ? ' selected' : '')}
                      >
                        <input
                          type="checkbox"
                          checked={publishFlow.destIds.indexOf(d.id) >= 0}
                          onChange={() => togglePublishDest(d.id)}
                        />
                        <span className="af-dest-icon">f</span>
                        <span className="af-dest-info">
                          <span className="af-dest-name">{d.name}</span>
                          <span className="af-dest-meta">
                            {d.platform === 'facebook' ? t('platform_fb') : d.platform}
                            {d.city ? ' · ' + d.city : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Fragment>
              ) : (
                <Fragment>
                  <p className="af-publish-sub">
                    {t('af_publish_done_sub').replace('{n}', String(publishFlow.destIds.length))}
                  </p>
                  <div className="af-share-list">
                    {publishFlow.dests
                      .filter((d) => publishFlow.destIds.indexOf(d.id) >= 0)
                      .map((d) => (
                        <div key={d.id} className="af-share-row">
                          <div className="af-share-dest">
                            <span className="af-dest-icon">f</span>
                            <span className="af-dest-name">{d.name}</span>
                          </div>
                          <div className="af-share-actions">
                            <button
                              type="button"
                              className="af-btn af-btn-ghost-small"
                              onClick={() => copyCaption({ ...publishFlow.post, ...publishFlow.contentPatch })}
                            >
                              {t('af_publish_copy_caption')}
                            </button>
                            {/* Placeholder — real Facebook sharing comes later. */}
                            <button
                              type="button"
                              className="af-btn af-btn-fb"
                              onClick={() => showToast(t('af_share_demo'))}
                            >
                              {t('af_share_fb')}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </Fragment>
              )}
            </div>
            <div className="sheet-footer">
              {publishFlow.stage === 'pick' ? (
                <Fragment>
                  <button type="button" className="btn btn-ghost" onClick={cancelPublish}>
                    {t('btn_cancel')}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={confirmPublish}>
                    {t('af_publish_confirm')}
                  </button>
                </Fragment>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setPublishFlow(null)}>
                  {t('af_publish_done_btn')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {settingsOpen && settingsForm && (
        <div
          className="sheet-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSettings();
          }}
        >
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div className="sheet-title">{t('af_ai_title')}</div>
              <button type="button" className="sheet-close" aria-label={t('btn_cancel')} onClick={closeSettings}>
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="sheet-body">
              <div className="af-field">
                <div className="af-check-row">
                  <button
                    type="button"
                    className={'af-check-chip' + (settingsForm.enabled ? ' selected' : '')}
                    onClick={() => setSettingsForm((f) => ({ ...f, enabled: !f.enabled }))}
                  >
                    {t('af_ai_enabled')}
                  </button>
                </div>
              </div>
              <label className="af-field">
                <span className="af-field-label">{t('af_ai_apikey')}</span>
                <input
                  type="password"
                  className="af-input"
                  autoComplete="off"
                  value={settingsForm.apiKey}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, apiKey: e.target.value }))}
                />
              </label>
              <label className="af-field">
                <span className="af-field-label">{t('af_ai_model')}</span>
                <input
                  type="text"
                  className="af-input"
                  value={settingsForm.model}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, model: e.target.value }))}
                />
              </label>
              <p className="af-ai-warning">{t('af_ai_warning')}</p>
            </div>
            <div className="sheet-footer">
              <button type="button" className="btn btn-ghost" onClick={closeSettings}>
                {t('btn_cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={saveSettings}>
                {t('af_ai_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
    </div>
  );
}
