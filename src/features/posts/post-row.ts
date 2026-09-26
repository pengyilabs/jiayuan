/**
 * Fila de post reutilizable, con sus acciones según el rol y el estado (editar, retirar,
 * marcar publicado, descargar el paquete de publicación). La usan la vista de lista de Home
 * (F0) y el detalle de un listing (F1).
 */
import { getState } from '../../app/state';
import { html, joinHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { t } from '../../i18n';
import type { Post, Profile } from '../../types/models';

export function canEditPost(post: Post, user: Profile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return post.authorId === user.id && (post.status === 'draft' || post.status === 'rejected');
}

export function canWithdrawPost(post: Post, user: Profile | null): boolean {
  return post.authorId === user?.id && post.status === 'pending';
}

export function canMarkPublished(post: Post, user: Profile | null): boolean {
  return user?.role === 'admin' && post.status === 'approved';
}

/** Botones de acción de un post, ya resueltos según el rol del usuario actual. */
export function postRowActions(post: Post): SafeHtml {
  const { currentUser } = getState();
  const buttons: SafeHtml[] = [];

  if (canEditPost(post, currentUser)) {
    buttons.push(
      html`<button class="btn btn-secondary btn-sm" data-action="post:edit" data-id="${post.id}">
        ${t('post_row_edit')}
      </button>`,
    );
  }
  if (canWithdrawPost(post, currentUser)) {
    buttons.push(
      html`<button class="btn btn-ghost btn-sm" data-action="post:withdraw" data-id="${post.id}">
        ${t('post_row_withdraw')}
      </button>`,
    );
  }
  if (canMarkPublished(post, currentUser)) {
    buttons.push(
      html`<button class="btn btn-ghost btn-sm" data-action="post:download-package" data-id="${post.id}">
        ${t('action_download_package')}
      </button>`,
      html`<button class="btn btn-secondary btn-sm" data-action="post:mark-published" data-id="${post.id}">
        ${t('action_mark_published')}
      </button>`,
    );
  }
  return joinHtml(buttons);
}

/** Motivo del rechazo, si lo hay y es visible (para mostrarlo bajo la fila). */
export function postRejectionNote(post: Post): SafeHtml | '' {
  if (post.status !== 'rejected' || !post.rejectionReason) return '';
  return html`<div class="post-row-reason">${post.rejectionReason}</div>`;
}
