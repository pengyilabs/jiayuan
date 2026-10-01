/**
 * Panel de operaciones (F11): la única pantalla del técnico. Cuentas (reutiliza exactamente lo
 * que ya usa Settings → Team), ajustes de la organización (nuevos: antes no tenían ninguna
 * pantalla) y estado del sistema — todo para administrar la herramienta sin tocar el código.
 */
import { registerActions, registerChangeActions } from '../../app/actions';
import { config, repos } from '../../app/services';
import { getState, setState, store } from '../../app/state';
import { getById, qsa } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import { t } from '../../i18n';
import type { OrganizationSettings, Profile, ProfileStatus } from '../../types/models';
import { errorMessage } from '../../ui/errors';
import { showNotice } from '../../ui/toast';

const STATUS_BADGE: Readonly<Record<ProfileStatus, string>> = {
  active: 'badge-success',
  invited: 'badge-warn',
  disabled: 'badge-danger',
};
const ROLE_LABEL_KEY = {
  admin: 'role_admin',
  employee: 'role_agent',
  technician: 'role_technician',
} as const;

function accountRow(member: Profile, selfId: string | undefined): ReturnType<typeof html> {
  const isSelf = member.id === selfId;
  const isTechnician = member.role === 'technician';
  return html`<tr data-account="${member.id}">
    <td>
      <div class="ops-account-name">
        ${member.fullName} ${isSelf ? html`<span class="member-you">(${t('team_you')})</span>` : ''}
      </div>
      <div class="ops-account-email">${member.email} · @${member.username}</div>
    </td>
    <td>
      ${
        isTechnician || isSelf
          ? html`<span class="role-pill role-${member.role}">${t(ROLE_LABEL_KEY[member.role])}</span>`
          : html`<select class="member-role" data-change="ops:role" data-id="${member.id}" aria-label="${t('team_field_role')}">
            <option value="employee" ${member.role === 'employee' ? 'selected' : ''}>${t('role_agent')}</option>
            <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>${t('role_admin')}</option>
          </select>`
      }
    </td>
    <td><span class="badge ${STATUS_BADGE[member.status]}">${t(`team_status_${member.status}`)}</span></td>
    <td>
      ${
        isTechnician
          ? html`<span class="form-hint">${t('ops_single_account')}</span>`
          : member.status === 'invited'
            ? html`<button class="btn btn-secondary btn-sm" data-action="team:resend" data-id="${member.id}">${t('team_resend')}</button>`
            : html`<button
              class="btn btn-secondary btn-sm"
              data-action="ops:toggle"
              data-id="${member.id}"
              data-active="${member.active ? 'false' : 'true'}"
              ${isSelf ? 'disabled' : ''}
            >
              ${member.active ? t('team_deactivate') : t('team_activate')}
            </button>`
      }
    </td>
  </tr>`;
}

function renderAccounts(): void {
  const container = getById('ops-accounts-list');
  if (!container) return;
  const { team, currentUser } = getState();
  setHtml(
    container,
    html`<table class="ops-table">
      <thead>
        <tr>
          <th>${t('ops_col_account')}</th>
          <th>${t('team_field_role')}</th>
          <th>${t('ops_col_status')}</th>
          <th>${t('ops_col_actions')}</th>
        </tr>
      </thead>
      <tbody>
        ${joinHtml(team.map(member => accountRow(member, currentUser?.id)))}
      </tbody>
    </table>`,
  );
}

function fillSettingsForm(settings: OrganizationSettings): void {
  const tz = getById<HTMLInputElement>('ops-timezone');
  const undo = getById<HTMLInputElement>('ops-undo-window');
  const retention = getById<HTMLInputElement>('ops-retention');
  const mfa = getById<HTMLSelectElement>('ops-mfa');
  if (tz) tz.value = settings.timezone;
  if (undo) undo.value = String(settings.undoWindowSeconds);
  if (retention) retention.value = String(settings.deletedRetentionDays);
  if (mfa) mfa.value = String(settings.requireAdminMfa);
}

async function loadSettingsForm(): Promise<void> {
  try {
    fillSettingsForm(await repos.catalog.settings());
  } catch (error) {
    showNotice(errorMessage(error));
  }
}

function showSettingsError(message: string | null): void {
  const box = getById('ops-settings-error');
  if (!box) return;
  box.hidden = message === null;
  box.textContent = message ?? '';
}

async function saveSettings(): Promise<void> {
  showSettingsError(null);
  getById('ops-settings-saved')?.setAttribute('hidden', '');
  const tz = getById<HTMLInputElement>('ops-timezone')?.value.trim() ?? '';
  const undo = Number(getById<HTMLInputElement>('ops-undo-window')?.value);
  const retention = Number(getById<HTMLInputElement>('ops-retention')?.value);
  const mfa = getById<HTMLSelectElement>('ops-mfa')?.value === 'true';

  if (tz === '') {
    showSettingsError(t('ops_err_timezone'));
    return;
  }
  try {
    // Falla rápido y claro si la zona horaria no es una IANA válida, antes de llamar al backend.
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    showSettingsError(t('ops_err_timezone'));
    return;
  }
  if (!Number.isFinite(undo) || undo < 0 || undo > 120) {
    showSettingsError(t('ops_err_undo'));
    return;
  }
  if (!Number.isFinite(retention) || retention < 1 || retention > 365) {
    showSettingsError(t('ops_err_retention'));
    return;
  }

  const button = document.querySelector<HTMLButtonElement>('[data-action="ops:save-settings"]');
  if (button) button.disabled = true;
  try {
    await repos.catalog.updateSettings({
      timezone: tz,
      undoWindowSeconds: undo,
      deletedRetentionDays: retention,
      requireAdminMfa: mfa,
    });
    getById('ops-settings-saved')?.removeAttribute('hidden');
    showNotice(t('ops_settings_saved'));
  } catch (error) {
    showSettingsError(errorMessage(error));
  } finally {
    if (button) button.disabled = false;
  }
}

function renderSystem(): void {
  const grid = getById('ops-system-grid');
  if (!grid) return;
  const { listings, posts, templates, team, platforms } = getState();
  const rows: [string, string][] = [
    [t('ops_sys_data_source'), config.dataSource],
    [t('ops_sys_accounts'), String(team.length)],
    [t('ops_sys_listings'), String(listings.length)],
    [t('ops_sys_posts'), String(posts.length)],
    [t('ops_sys_templates'), String(templates.length)],
    [t('ops_sys_platforms'), String(platforms.length)],
    [t('ops_sys_build'), (import.meta.env['VITE_BUILD_SHA'] as string | undefined) ?? 'dev'],
  ];
  setHtml(
    grid,
    joinHtml(
      rows.map(
        ([label, value]) =>
          html`<div class="ops-stat"><span class="ops-stat-label">${label}</span><span class="ops-stat-value">${value}</span></div>`,
      ),
    ),
  );
}

function renderOps(): void {
  renderAccounts();
  renderSystem();
}

export function initOps(): void {
  registerActions({
    'ops:tab': el => {
      qsa('#ops-tabs .settings-tab').forEach(tab => tab.classList.remove('active'));
      qsa('#page-ops .settings-tab-panel').forEach(panel => panel.classList.remove('active'));
      el.classList.add('active');
      getById(`ops-panel-${el.dataset.tab ?? ''}`)?.classList.add('active');
      if (el.dataset.tab === 'settings') void loadSettingsForm();
    },
    'ops:toggle': el => {
      const id = el.dataset.id ?? '';
      const active = el.dataset.active === 'true';
      void (async () => {
        try {
          const updated = await repos.profiles.setActive(id, active);
          setState(state => ({ team: state.team.map(m => (m.id === updated.id ? updated : m)) }));
          showNotice(t(active ? 'team_activated' : 'team_deactivated'));
        } catch (error) {
          showNotice(errorMessage(error));
        }
      })();
    },
  });

  getById('ops-settings-form')?.addEventListener('submit', e => {
    e.preventDefault();
    void saveSettings();
  });

  registerChangeActions({
    'ops:role': el => {
      const target = el as HTMLSelectElement;
      const id = target.dataset.id ?? '';
      const role = target.value === 'admin' ? 'admin' : 'employee';
      void (async () => {
        try {
          const updated = await repos.profiles.setRole(id, role);
          setState(state => ({ team: state.team.map(m => (m.id === updated.id ? updated : m)) }));
          showNotice(t('team_role_changed'));
        } catch (error) {
          showNotice(errorMessage(error));
          renderAccounts();
        }
      })();
    },
  });

  store.watch(s => s.team, renderOps);
  store.watch(s => s.lang, renderOps);
  store.watch(
    s => s.page,
    page => {
      if (page === 'ops') renderOps();
    },
  );
  renderOps();
}
