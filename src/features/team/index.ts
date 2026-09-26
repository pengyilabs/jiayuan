/** Settings → Team: invitar, cambiar rol, desactivar y reenviar invitaciones (solo administradores). */
import { registerActions, registerChangeActions } from '../../app/actions';
import { repos } from '../../app/services';
import { getState, setState, store } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, setHtml } from '../../core/html';
import { t } from '../../i18n';
import type { InviteInput, Lang, Profile, ProfileStatus, UserRole } from '../../types/models';
import { errorMessage } from '../../ui/errors';
import { closeModal, openModal } from '../../ui/modal';
import { showNotice } from '../../ui/toast';

const STATUS_BADGE: Readonly<Record<ProfileStatus, string>> = {
  active: 'badge-success',
  invited: 'badge-warn',
  disabled: 'badge-danger',
};

/** Enlaces de invitación del modo demo (no hay correo): id de usuario → enlace. */
const demoLinks = new Map<string, string>();

const initial = (name: string): string => Array.from(name)[0] ?? '?';

function renderRow(member: Profile, selfId: string | undefined): ReturnType<typeof html> {
  const isSelf = member.id === selfId;
  const demoLink = demoLinks.get(member.id);
  return html`<div class="member-row" data-member="${member.id}">
    <div class="member-avatar">${initial(member.fullName)}</div>
    <div class="member-info">
      <div class="member-name">
        ${member.fullName} ${isSelf ? html`<span class="member-you">(${t('team_you')})</span>` : ''}
      </div>
      <div class="member-email">${member.email} · @${member.username}</div>
      ${
        member.status === 'invited' && demoLink
          ? html`<div class="member-email"><a href="${demoLink}" data-demo-link>${t('team_demo_link')} ${demoLink}</a></div>`
          : ''
      }
    </div>
    <span class="badge ${STATUS_BADGE[member.status]}">${t(`team_status_${member.status}`)}</span>
    ${
      isSelf
        ? html`<span class="badge badge-accent">${t(member.role === 'admin' ? 'role_admin' : 'role_agent')}</span>`
        : html`<select class="member-role" data-change="team:role" data-id="${member.id}" aria-label="${t('team_field_role')}">
            <option value="employee" ${member.role === 'employee' ? 'selected' : ''}>${t('role_agent')}</option>
            <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>${t('role_admin')}</option>
          </select>
          ${
            member.status === 'invited'
              ? html`<button class="btn btn-secondary btn-sm" data-action="team:resend" data-id="${member.id}">${t('team_resend')}</button>`
              : html`<button class="btn btn-secondary btn-sm" data-action="team:toggle" data-id="${member.id}" data-active="${member.active ? 'false' : 'true'}">
                ${member.active ? t('team_deactivate') : t('team_activate')}
              </button>`
          }`
    }
  </div>`;
}

export function renderTeam(): void {
  const list = getById('team-list');
  if (!list) return;
  const { team, currentUser } = getState();
  setHtml(list, joinHtml(team.map(member => renderRow(member, currentUser?.id))));
}

const replaceMember = (updated: Profile): void => {
  setState(state => ({
    team: state.team.some(m => m.id === updated.id)
      ? state.team.map(m => (m.id === updated.id ? updated : m))
      : [...state.team, updated],
  }));
};

/** Ejecuta una acción sobre un miembro y refresca la lista (también al fallar, para revertir controles). */
async function run(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    showNotice(errorMessage(error));
    renderTeam();
  }
}

function showInviteMessage(
  id: 'invite-error' | 'invite-result',
  content: ReturnType<typeof html> | string | null,
): void {
  const box = getById(id);
  if (!box) return;
  box.hidden = content === null;
  if (content === null) box.textContent = '';
  else if (typeof content === 'string') box.textContent = content;
  else setHtml(box, content);
}

const readInvite = (): InviteInput => {
  const value = (id: string): string => (getById<HTMLInputElement>(id)?.value ?? '').trim();
  return {
    email: value('invite-email'),
    username: value('invite-username'),
    fullName: value('invite-name'),
    role: (value('invite-role') === 'admin' ? 'admin' : 'employee') satisfies UserRole,
    locale: getState().lang satisfies Lang,
  };
};

async function sendInvite(): Promise<void> {
  const button = getById<HTMLButtonElement>('invite-send');
  const input = readInvite();
  showInviteMessage('invite-error', null);
  showInviteMessage('invite-result', null);
  if (!input.email || !input.username || !input.fullName) {
    showInviteMessage('invite-error', t('err_auth_required'));
    return;
  }
  if (button) button.disabled = true;
  try {
    const { profile, devLink } = await repos.profiles.invite(input);
    replaceMember(profile);
    if (devLink) {
      demoLinks.set(profile.id, devLink);
      renderTeam();
      showInviteMessage(
        'invite-result',
        html`${t('team_demo_link')} <a href="${devLink}">${devLink}</a>`,
      );
    } else {
      showNotice(`${t('team_invite_sent')} ${profile.email}`);
      closeModal('modal-invite');
    }
  } catch (error) {
    showInviteMessage('invite-error', errorMessage(error));
  } finally {
    if (button) button.disabled = false;
  }
}

export function initTeam(): void {
  registerActions({
    'team:invite-open': () => {
      ['invite-email', 'invite-username', 'invite-name'].forEach(id => {
        const field = getById<HTMLInputElement>(id);
        if (field) field.value = '';
      });
      showInviteMessage('invite-error', null);
      showInviteMessage('invite-result', null);
      openModal('modal-invite');
      getById('invite-email')?.focus();
    },
    'team:invite-send': () => {
      void sendInvite();
    },
    'team:resend': el => {
      const id = el.dataset.id ?? '';
      void run(async () => {
        const { devLink } = await repos.profiles.resendInvite(id);
        if (devLink) {
          demoLinks.set(id, devLink);
          renderTeam();
        }
        showNotice(t('team_resent'));
      });
    },
    'team:toggle': el => {
      const id = el.dataset.id ?? '';
      const active = el.dataset.active === 'true';
      void run(async () => {
        replaceMember(await repos.profiles.setActive(id, active));
        showNotice(t(active ? 'team_activated' : 'team_deactivated'));
      });
    },
  });

  registerChangeActions({
    'team:role': el => {
      const id = el.dataset.id ?? '';
      const role = (el as HTMLSelectElement).value === 'admin' ? 'admin' : 'employee';
      void run(async () => {
        replaceMember(await repos.profiles.setRole(id, role));
        showNotice(t('team_role_changed'));
      });
    },
  });

  store.watch(s => s.team, renderTeam);
  store.watch(s => s.lang, renderTeam);
  store.watch(s => s.currentUser, renderTeam);
  renderTeam();
}
