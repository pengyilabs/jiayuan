/** Pestaña "Plataformas": tarjetas de cuentas conectadas y disponibles. */
import { getState } from '../../app/state';
import { getById } from '../../core/dom';
import { html, joinHtml, raw, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { localize, t } from '../../i18n';
import type { Lang, Platform } from '../../types/models';
import { PLATFORM_BADGE_ICONS } from '../../ui/icons/platform-icons';
import {
  platformDescription,
  platformDisplayName,
  postTypeName,
} from '../platforms/platform-format';

function renderPlatformCard(platform: Platform, connected: boolean, lang: Lang): SafeHtml {
  const statusBadge = connected
    ? html`<span class="badge badge-success"
        ><span class="badge-dot"></span> ${t('status_connected', '已关联')}</span
      >`
    : html`<span class="badge badge-disconnected"
        ><span class="badge-dot badge-dot-disconnected"></span>
        ${t('status_not_connected', '未连接')}</span
      >`;
  const accountInfo =
    connected && platform.account
      ? html`<div class="platform-card-account">${platform.account}</div>`
      : '';
  const postTypeTags = platform.postTypes.map(
    type =>
      html`<span class="platform-post-tag ${connected ? 'active' : ''}"
        >${postTypeName(type, lang)}</span
      >`,
  );
  const note = platform.note
    ? html`<div
        style="padding:8px 16px 14px;font-size:var(--text-xs);color:var(--muted);line-height:1.5;background:var(--surface-warm);border-top:1px solid var(--border-soft)"
      >
        💡
        ${localize(platform.note, lang)}
      </div>`
    : '';

  return html`<div
    class="platform-card ${connected ? 'platform-card-connected' : 'platform-card-disconnected'}"
  >
    <div class="platform-card-header">
      <div class="platform-card-icon" style="background:${platform.color}">
        ${raw(PLATFORM_BADGE_ICONS[platform.id])}
      </div>
      <div class="platform-card-info">
        <div class="platform-card-name">${platformDisplayName(platform, lang)}</div>
        <div class="platform-card-desc">${platformDescription(platform, lang)}</div>
      </div>
      <div class="platform-card-status">${statusBadge}${accountInfo}</div>
    </div>
    <div class="platform-card-body">
      <div class="platform-post-types">${postTypeTags}</div>
    </div>
    ${note}
  </div>`;
}

function renderSection(title: string, platforms: Platform[], connected: boolean, lang: Lang) {
  if (platforms.length === 0) return '';
  return html`<div class="platform-section">
    <div class="platform-section-header">
      <span class="platform-section-title">${title}</span>
      <span class="platform-section-count">${platforms.length}</span>
    </div>
    <div class="platform-cards-grid">
      ${platforms.map(p => renderPlatformCard(p, connected, lang))}
    </div>
  </div>`;
}

export function renderPlatformCards(): void {
  const container = getById('platform-cards-container');
  if (!container) return;
  const { platforms, lang } = getState();

  setHtml(
    container,
    joinHtml([
      renderSection(
        t('platforms_connected', '已连接平台'),
        platforms.filter(p => p.connected),
        true,
        lang,
      ),
      renderSection(
        t('platforms_available', '可连接平台'),
        platforms.filter(p => !p.connected),
        false,
        lang,
      ),
    ]),
  );
}
