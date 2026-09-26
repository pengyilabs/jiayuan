/** Permisos de interfaz por rol. La seguridad real la imponen RLS y las RPC en la base de datos. */
import type { PageId, UserRole } from '../../types/models';

const PAGE_ROLES: Readonly<Record<PageId, readonly UserRole[]>> = {
  dashboard: ['employee', 'admin'],
  listings: ['employee', 'admin'],
  templates: ['employee', 'admin'],
  approvals: ['admin'],
  settings: ['admin'],
};

export const canAccess = (role: UserRole, page: PageId): boolean => PAGE_ROLES[page].includes(role);

/** Marca el `<body>` con el rol; el CSS oculta lo marcado con `data-role-only="admin"`. */
export function applyRoleToDocument(role: UserRole): void {
  document.body.dataset.role = role;
}
