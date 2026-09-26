import { approvalListingName, pendingApprovals } from '../../app/selectors';
import { getState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, setHtml } from '../../core/html';
import { dict, t } from '../../i18n';
import { findPlatform, platformDisplayName } from '../platforms/platform-format';

export function renderApprovals(): void {
  const list = getById('approvals-list');
  if (!list) return;
  const { posts, listings, platforms, lang } = getState();
  const approvals = pendingApprovals(posts, listings);
  const labels = dict();

  const count = getById('pending-count');
  if (count) count.textContent = `${String(approvals.length)} ${t('pending_approvals_label')}`;
  const badge = getById('approval-badge');
  if (badge) badge.textContent = String(approvals.length);

  setHtml(
    list,
    html`${approvals.map(a => {
      const platform = findPlatform(platforms, a.platformId);
      return html` <div class="approval-card" data-od-id="approval-${a.id}">
        <div class="approval-header">
          <div>
            <strong>${a.title}</strong>
            <div class="approval-meta">${a.author} · ${a.date}</div>
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <span class="badge badge-neutral"
              >${platform ? platformDisplayName(platform, lang) : a.platformId}</span
            >
            <span class="badge badge-accent">${a.lang}</span>
          </div>
        </div>
        <div style="font-size:var(--text-sm);color:var(--muted);margin-bottom:var(--space-3)">
          ${labels.form_select_listing}: ${approvalListingName(a, lang)}
        </div>
        <div class="approval-actions">
          <button class="btn btn-primary btn-sm" data-action="approval:approve" data-id="${a.id}">
            ${labels.approve}
          </button>
          <button class="btn btn-danger btn-sm" data-action="approval:reject-open" data-id="${a.id}">
            ${labels.reject}
          </button>
          <button class="btn btn-ghost btn-sm">${labels.view_all}</button>
        </div>
      </div>`;
    })}`,
  );
}
