/** Estadísticas reales del header de Home (F6): sustituyen a los números fijos del prototipo. */
import { getState } from '../../app/state';
import { getById } from '../../core/dom';

export function renderStats(): void {
  const { posts } = getState();
  const set = (id: string, value: number): void => {
    const el = getById(id);
    if (el) el.textContent = String(value);
  };
  set('stat-total', posts.length);
  set('stat-pending', posts.filter(p => p.status === 'pending').length);
  set('stat-approved', posts.filter(p => p.status === 'approved').length);
  set('stat-published', posts.filter(p => p.status === 'published').length);
}
