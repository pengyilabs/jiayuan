import { registerActions } from '../app/actions';
import { qs } from '../core/dom';

export function initSidebar(): void {
  registerActions({
    'sidebar:toggle': () => {
      qs('.sidebar')?.classList.toggle('collapsed');
    },
  });
}
