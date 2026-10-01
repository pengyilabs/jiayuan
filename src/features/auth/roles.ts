/** Permisos de interfaz por rol. La seguridad real la imponen RLS y las RPC en la base de datos. */
import type { PageId, UserRole } from '../../types/models';

const PAGE_ROLES: Readonly<Record<PageId, readonly UserRole[]>> = {
  dashboard: ['employee', 'admin'],
  listings: ['employee', 'admin'],
  templates: ['employee', 'admin'],
  approvals: ['admin'],
  settings: ['admin'],
  // El técnico (F11) SOLO tiene esta pantalla — ni siquiera Home; ver docs/ROLES.md.
  ops: ['technician'],
};

export const canAccess = (role: UserRole, page: PageId): boolean => PAGE_ROLES[page].includes(role);

/** A dónde entra cada rol al iniciar sesión (y a dónde lo devuelve el guard si pide otra ruta). */
export const HOME_PAGE_FOR_ROLE: Readonly<Record<UserRole, PageId>> = {
  admin: 'dashboard',
  employee: 'dashboard',
  technician: 'ops',
};

/** Marca el `<body>` con el rol; el CSS oculta lo marcado con `data-role-only="admin"`. */
export function applyRoleToDocument(role: UserRole): void {
  document.body.dataset.role = role;
}
