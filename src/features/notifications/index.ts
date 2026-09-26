/** Panel de notificaciones del topbar: lista, marcar (todas) como leídas. */
import { registerActions } from '../../app/actions';
import { repos } from '../../app/services';
import { getState, setState, store } from '../../app/state';
import { getById, qs, targetElement } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { t } from '../../i18n';
import { errorMessage } from '../../ui/errors';
import { showToast } from '../../ui/toast';
import type { Notification, NotificationType } from '../../types/models';

const TYPE_LABEL_KEY: Readonly<Record<NotificationType, string>> = {
  post_pending: 'notif_type_pending',
  post_approved: 'notif_type_approved',
  post_rejected: 'notif_type_rejected',
  post_published: 'notif_type_published',
};

function toggleDropdown(force?: boolean): void {
  getById('notif-dropdown')?.classList.toggle('open', force);
  getById('notif-btn')?.classList.toggle('open', force);
}

function notificationMessage(n: Notification): string {
  const prefix = t(TYPE_LABEL_KEY[n.type]);
  const reason = n.type === 'post_rejected' && n.reason ? ` — ${n.reason}` : '';
  return `${prefix} ${n.title}${reason}`;
}

function renderRow(n: Notification): SafeHtml {
  return html`<button
    type="button"
    class="notif-item ${n.readAt === null ? 'unread' : ''}"
    data-action="notif:mark-read"
    data-id="${n.id}"
  >
    <span class="notif-item-message">${notificationMessage(n)}</span>
    <span class="notif-item-date">${new Date(n.createdAt).toLocaleDateString()}</span>
  </button>`;
}

function renderPanel(): void {
  const list = getById('notif-list');
  const dot = getById('notif-dot');
  if (!list) return;
  const { notifications } = getState();

  setHtml(
    list,
    notifications.length === 0
      ? html`<p class="form-hint" style="padding:var(--space-4)">${t('notif_empty')}</p>`
      : joinHtml(notifications.map(renderRow)),
  );
  if (dot) dot.hidden = !notifications.some(n => n.readAt === null);
}

export function initNotifications(): void {
  registerActions({
    'notif:toggle': () => {
      toggleDropdown();
    },
    'notif:mark-read': el => {
      const id = Number(el.dataset.id);
      setState(state => ({
        notifications: state.notifications.map(n =>
          n.id === id && n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      }));
      repos.notifications.markRead(id).catch((error: unknown) => {
        showToast(errorMessage(error), { kind: 'error' });
      });
    },
    'notif:mark-all-read': () => {
      setState(state => ({
        notifications: state.notifications.map(n =>
          n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      }));
      repos.notifications.markAllRead().catch((error: unknown) => {
        showToast(errorMessage(error), { kind: 'error' });
      });
    },
  });

  document.addEventListener('click', event => {
    const switcher = qs('.notif-switch');
    if (switcher && !switcher.contains(targetElement(event))) toggleDropdown(false);
  });

  store.watch(s => s.notifications, renderPanel);
  store.watch(s => s.lang, renderPanel);
  renderPanel();
}
