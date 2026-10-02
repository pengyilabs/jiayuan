/**
 * Panel de notificaciones del encabezado: lista, marcar (todas) como leídas. El control existe
 * por duplicado (topbar genérico + encabezado de Home, oculto uno u otro según la página, F7)
 * así que todo aquí opera sobre "todas las instancias en el DOM" en vez de un único id.
 */
import { registerActions } from '../../app/actions';
import { repos } from '../../app/services';
import { getState, setState, store } from '../../app/state';
import { qsa, targetElement } from '../../core/dom';
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

function closeAllDropdowns(exceptSwitch?: Element | null): void {
  qsa('.notif-switch').forEach(switcher => {
    if (switcher === exceptSwitch) return;
    switcher.querySelector('.notif-dropdown')?.classList.remove('open');
    switcher.querySelector('.notif-btn')?.classList.remove('open');
  });
}

function toggleDropdown(button: HTMLElement): void {
  const switcher = button.closest('.notif-switch');
  const dropdown = switcher?.querySelector('.notif-dropdown');
  const isOpen = dropdown?.classList.contains('open') ?? false;
  closeAllDropdowns();
  if (!isOpen) {
    dropdown?.classList.add('open');
    button.classList.add('open');
  }
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
  const { notifications } = getState();
  const hasUnread = notifications.some(n => n.readAt === null);
  const body =
    notifications.length === 0
      ? html`<p class="form-hint" style="padding:var(--space-4)">${t('notif_empty')}</p>`
      : joinHtml(notifications.map(renderRow));

  qsa('.notif-list').forEach(list => {
    setHtml(list, body);
  });
  qsa('.notif-dot').forEach(dot => {
    dot.hidden = !hasUnread;
  });
}

export function initNotifications(): void {
  registerActions({
    'notif:toggle': el => {
      toggleDropdown(el);
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
    const target = targetElement(event);
    const insideOpenSwitch = qsa('.notif-switch').find(
      s => s.querySelector('.notif-dropdown.open') && s.contains(target),
    );
    if (!insideOpenSwitch) closeAllDropdowns();
  });

  store.watch(s => s.notifications, renderPanel);
  store.watch(s => s.lang, renderPanel);
  renderPanel();
}
