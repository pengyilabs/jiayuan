import { registerActions } from '../../app/actions';
import { repos } from '../../app/services';
import { setState, store } from '../../app/state';
import { getById } from '../../core/dom';
import { t } from '../../i18n';
import { armDangerButton, showDialog } from '../../ui/dialog';
import { errorMessage } from '../../ui/errors';
import { withButtonLoading } from '../../ui/loading';
import { closeModal, onModalClose, openModal } from '../../ui/modal';
import { showToast } from '../../ui/toast';
import { offerPostUndo } from '../posts/post-undo';
import { renderApprovals } from './approvals-view';

let pendingRejectId: number | null = null;
let disarmReject: (() => void) | null = null;

/** Aprobar es una acción permanente (nivel "danger"): diálogo reforzado + aviso con Deshacer. */
async function approve(id: number, button: HTMLElement | null): Promise<void> {
  const confirmed = await showDialog({
    level: 'danger',
    title: t('dialog_approve_title'),
    message: t('dialog_approve_message'),
    confirmLabel: t('approve'),
  });
  if (!confirmed) return;

  try {
    const updated = await withButtonLoading(button, () => repos.posts.approve(id));
    setState(state => ({ posts: state.posts.map(p => (p.id === id ? updated : p)) }));
    void offerPostUndo(id, t('toast_post_approved'));
  } catch (error) {
    showToast(errorMessage(error), { kind: 'error' });
  }
}

function showRejectError(message: string | null): void {
  const box = getById('reject-error');
  if (!box) return;
  box.hidden = message === null;
  box.textContent = message ?? '';
}

/** Abre el modal de rechazo y arma su botón de confirmación (fricción deliberada). */
function openReject(id: number): void {
  pendingRejectId = id;
  showRejectError(null);
  const textarea = getById<HTMLTextAreaElement>('reject-reason');
  if (textarea) textarea.value = '';

  const confirmBtn = getById<HTMLButtonElement>('reject-confirm');
  if (confirmBtn) {
    disarmReject?.();
    disarmReject = armDangerButton(confirmBtn);
  }
  openModal('modal-reject');
  textarea?.focus();
}

async function confirmReject(button: HTMLElement | null): Promise<void> {
  const id = pendingRejectId;
  if (id === null) return;

  const reason = getById<HTMLTextAreaElement>('reject-reason')?.value.trim() ?? '';
  if (!reason) {
    showRejectError(t('err_reject_reason_required'));
    getById<HTMLTextAreaElement>('reject-reason')?.focus();
    return;
  }

  try {
    const updated = await withButtonLoading(button, () => repos.posts.reject(id, reason));
    setState(state => ({ posts: state.posts.map(p => (p.id === id ? updated : p)) }));
    closeModal('modal-reject');
    void offerPostUndo(id, t('toast_post_rejected'));
  } catch (error) {
    showRejectError(errorMessage(error));
  }
}

export function initApprovals(): void {
  registerActions({
    'approval:approve': el => {
      void approve(Number(el.dataset.id), el);
    },
    'approval:reject-open': el => {
      openReject(Number(el.dataset.id));
    },
    'approval:reject-confirm': el => {
      void confirmReject(el);
    },
  });

  onModalClose('modal-reject', () => {
    disarmReject?.();
    disarmReject = null;
    pendingRejectId = null;
  });

  store.watch(s => s.lang, renderApprovals);
  store.watch(s => s.posts, renderApprovals);
  store.watch(s => s.listings, renderApprovals);
  store.watch(s => s.platforms, renderApprovals);
  renderApprovals();
}
