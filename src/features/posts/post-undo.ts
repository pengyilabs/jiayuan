/** Ofrece deshacer la última acción de un post (aprobar/rechazar/marcar publicado…). */
import { repos } from '../../app/services';
import { getState, setState } from '../../app/state';
import { t } from '../../i18n';
import { errorMessage } from '../../ui/errors';
import { showToast } from '../../ui/toast';

async function undo(auditId: number, postId: number): Promise<void> {
  try {
    const restored = await repos.posts.undo(auditId);
    setState(state => ({ posts: state.posts.map(p => (p.id === postId ? restored : p)) }));
    showToast(t('toast_undone'));
  } catch (error) {
    showToast(errorMessage(error), { kind: 'error' });
  }
}

/** Muestra `message` como aviso de éxito, con "Deshacer" si la acción tiene auditoría reciente. */
export async function offerPostUndo(postId: number, message: string): Promise<void> {
  try {
    const entry = await repos.posts.latestAudit(postId);
    if (!entry || entry.undone) {
      showToast(message, { kind: 'success' });
      return;
    }
    showToast(message, {
      kind: 'success',
      durationMs: getState().settings.undoWindowSeconds * 1000,
      undo: () => {
        void undo(entry.id, postId);
      },
    });
  } catch {
    showToast(message, { kind: 'success' });
  }
}
