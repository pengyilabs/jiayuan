/**
 * Aclaraciones de rol en la interfaz: qué rol tiene la cuenta abierta (insignia en cada
 * encabezado, avatar y sidebar) y qué puede hacer cada rol en cada pantalla. La seguridad real
 * la imponen RLS y las RPC (ver `roles.ts`); esto solo lo hace explícito para quien mira.
 */
import { demoInfo } from '../../app/services';
import { getState } from '../../app/state';
import { qsa } from '../../core/dom';
import { html, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { t } from '../../i18n';
import type { PageId, UserRole } from '../../types/models';

type PageNote =
  { kind: 'admin-only'; textKey: string } | { kind: 'shared'; adminKey: string; agentKey: string };

/** Qué pantallas son exclusivas de un rol y cuáles se comparten (con lo que puede hacer cada uno). */
export const PAGE_NOTES: Readonly<Record<PageId, PageNote>> = {
  dashboard: { kind: 'shared', adminKey: 'note_dashboard_admin', agentKey: 'note_dashboard_agent' },
  listings: { kind: 'shared', adminKey: 'note_listings_admin', agentKey: 'note_listings_agent' },
  templates: { kind: 'shared', adminKey: 'note_templates_admin', agentKey: 'note_templates_agent' },
  approvals: { kind: 'admin-only', textKey: 'note_approvals' },
  settings: { kind: 'admin-only', textKey: 'note_settings' },
};

const roleName = (role: UserRole): string => t(role === 'admin' ? 'role_admin' : 'role_agent');
const rolePill = (role: UserRole): SafeHtml =>
  html`<span class="role-pill role-${role}">${roleName(role)}</span>`;

function renderNote(page: PageId, current: UserRole): SafeHtml {
  const note = PAGE_NOTES[page];
  if (note.kind === 'admin-only') {
    const demo =
      page === 'settings' && demoInfo
        ? html`<p class="role-note-demo">
            ${t('note_demo_settings')
              .replace(
                '{accounts}',
                demoInfo.accounts.map(a => `${a.username} (${roleName(a.role)})`).join(', '),
              )
              .replace('{password}', demoInfo.password)}
          </p>`
        : '';
    return html`<div class="role-note-row">
        <span class="role-pill role-admin">${t('note_only_admin')}</span>
        <p>${t(note.textKey)}</p>
      </div>
      ${demo}`;
  }
  const row = (role: UserRole, key: string): SafeHtml =>
    html`<div class="role-note-row ${role === current ? 'current' : ''}">
      ${rolePill(role)}
      <p>${t(key)}${role === current ? html` <strong>${t('note_you')}</strong>` : ''}</p>
    </div>`;
  return html`<p class="role-note-title">${t('note_shared_title')}</p>
    ${row('admin', note.adminKey)}${row('employee', note.agentKey)}`;
}

export function renderRoleUi(): void {
  const { currentUser } = getState();
  if (!currentUser) return;
  const role = currentUser.role;
  const name = roleName(role);
  const title = t(role === 'admin' ? 'role_badge_admin_title' : 'role_badge_agent_title');

  qsa('[data-role-badge]').forEach(badge => {
    badge.className = `role-badge role-${role}`;
    badge.title = title;
    badge.setAttribute('aria-label', `${t('role_badge_label')}: ${name}`);
    const label = badge.querySelector('.role-badge-label');
    const value = badge.querySelector('.role-badge-name');
    if (label) label.textContent = `${t('role_badge_label')}:`;
    if (value) value.textContent = name;
  });

  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    avatar.className = `user-avatar user-avatar-${role}`;
    avatar.title = `${currentUser.fullName} — ${name}`;
    avatar.setAttribute('aria-label', `${currentUser.fullName} — ${name}`);
  }
  const roleLine = document.getElementById('user-role');
  if (roleLine) {
    roleLine.className = `user-role role-pill role-${role}`;
    roleLine.textContent = name;
  }

  qsa('[data-role-note]').forEach(el => {
    const page = el.dataset.roleNote as PageId;
    el.className = `role-note role-note-${PAGE_NOTES[page].kind}`;
    setHtml(el, renderNote(page, role));
  });
}
