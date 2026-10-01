/** Pantallas previas a la aplicación: login, recuperación, contraseña, MFA. */
import { html, setHtml } from '../../core/html';
import type { SafeHtml } from '../../core/html';
import { LANGS, t } from '../../i18n';
import type { Lang } from '../../types/models';
import type { TotpEnrollment } from './auth-service';
import type { DemoInfo } from './demo';

export type AuthScreen =
  | { name: 'loading' }
  | { name: 'login'; error?: string; notice?: string; username?: string }
  | { name: 'forgot'; error?: string }
  | { name: 'forgot-sent' }
  | { name: 'set-password'; flow: 'invite' | 'recovery'; error?: string }
  | { name: 'mfa'; error?: string }
  | { name: 'enroll'; enrollment: TotpEnrollment; error?: string }
  | { name: 'link-error' };

export interface AuthHandlers {
  login(username: string, password: string): Promise<void>;
  forgot(identifier: string): Promise<void>;
  setPassword(password: string, confirmation: string): Promise<void>;
  verify(code: string): Promise<void>;
  goto(screen: 'login' | 'forgot'): void;
  cancel(): void;
  changeLanguage(lang: Lang): void;
}

export interface AuthViewOptions {
  /** Solo modo demo: cuentas por defecto con su rol, que se muestran en el login. */
  demo: DemoInfo | null;
}

const LANG_NAMES: Readonly<Record<Lang, string>> = {
  zh: '简体中文',
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

/** Cuentas por defecto de un despliegue demo, con su rol y qué puede hacer cada una. */
function demoPanel(demo: DemoInfo): SafeHtml {
  return html`<section class="auth-demo-panel" aria-labelledby="auth-demo-title">
    <h2 id="auth-demo-title">${t('auth_demo_title')}</h2>
    <p class="auth-demo-intro">${t('auth_demo_intro')}</p>
    <ul class="auth-demo-list">
      ${demo.accounts.map(
        account => html`<li>
          <button type="button" class="auth-demo-account" data-demo-user="${account.username}">
            <span class="auth-demo-name">
              <code>${account.username}</code> · ${account.fullName}
              <span class="role-pill role-${account.role}">
                ${t(account.role === 'admin' ? 'role_admin' : 'role_agent')}
              </span>
            </span>
            <span class="auth-demo-desc">
              ${t(account.role === 'admin' ? 'auth_demo_admin_desc' : 'auth_demo_agent_desc')}
            </span>
          </button>
        </li>`,
      )}
    </ul>
    <p class="auth-demo-password">${t('auth_demo_password')} <code>${demo.password}</code></p>
  </section>`;
}

const field = (label: string, id: string, input: SafeHtml): SafeHtml =>
  html`<div class="form-group"><label class="form-label" for="${id}">${label}</label>${input}</div>`;

function body(screen: AuthScreen, options: AuthViewOptions): SafeHtml {
  switch (screen.name) {
    case 'loading':
      return html`<div class="auth-spinner" role="status" aria-label="…"></div>`;

    case 'login':
      return html`<h1>${t('auth_login_title')}</h1>
        <p class="auth-hint">${t('auth_login_subtitle')}</p>
        ${screen.notice ? html`<div class="auth-alert auth-alert-info" role="status">${screen.notice}</div>` : ''}
        ${screen.error ? html`<div class="auth-alert" role="alert">${screen.error}</div>` : ''}
        <form data-form="login" novalidate>
          ${field(
            t('auth_username'),
            'auth-username',
            html`<input id="auth-username" name="username" value="${screen.username ?? ''}" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required />`,
          )}
          ${field(
            t('auth_password'),
            'auth-password',
            html`<input id="auth-password" name="password" type="password" autocomplete="current-password" required />`,
          )}
          <button class="btn btn-primary auth-submit" type="submit">${t('auth_signin')}</button>
        </form>
        <button class="auth-link" type="button" data-auth="forgot">${t('auth_forgot')}</button>
        <p class="auth-persist">${t('auth_persist_note')}</p>
        ${options.demo ? demoPanel(options.demo) : ''}`;

    case 'forgot':
      return html`<h1>${t('auth_forgot_title')}</h1>
        <p class="auth-hint">${t('auth_forgot_hint')}</p>
        ${screen.error ? html`<div class="auth-alert" role="alert">${screen.error}</div>` : ''}
        <form data-form="forgot" novalidate>
          ${field(
            t('auth_identifier'),
            'auth-identifier',
            html`<input id="auth-identifier" name="identifier" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required />`,
          )}
          <button class="btn btn-primary auth-submit" type="submit">${t('auth_send_link')}</button>
        </form>
        <button class="auth-link" type="button" data-auth="login">${t('auth_back_login')}</button>`;

    case 'forgot-sent':
      return html`<h1>${t('auth_forgot_title')}</h1>
        <div class="auth-alert auth-alert-info" role="status">${t('auth_forgot_sent')}</div>
        <button class="auth-link" type="button" data-auth="login">${t('auth_back_login')}</button>`;

    case 'set-password':
      return html`<h1>${t('auth_setpw_title')}</h1>
        <p class="auth-hint">
          ${screen.flow === 'invite' ? t('auth_setpw_hint_invite') : t('auth_setpw_hint_recovery')}
        </p>
        ${screen.error ? html`<div class="auth-alert" role="alert">${screen.error}</div>` : ''}
        <form data-form="set-password" novalidate>
          ${field(
            t('auth_new_password'),
            'auth-password',
            html`<input id="auth-password" name="password" type="password" autocomplete="new-password" minlength="12" required />`,
          )}
          ${field(
            t('auth_confirm_password'),
            'auth-confirmation',
            html`<input id="auth-confirmation" name="confirmation" type="password" autocomplete="new-password" required />`,
          )}
          <p class="form-hint">${t('auth_password_rules')}</p>
          <button class="btn btn-primary auth-submit" type="submit">${t('auth_save_password')}</button>
        </form>`;

    case 'mfa':
      return html`<h1>${t('auth_mfa_title')}</h1>
        <p class="auth-hint">${t('auth_mfa_hint')}</p>
        ${screen.error ? html`<div class="auth-alert" role="alert">${screen.error}</div>` : ''}
        <form data-form="verify" novalidate>
          ${field(t('auth_code'), 'auth-code', codeInput())}
          <button class="btn btn-primary auth-submit" type="submit">${t('auth_verify')}</button>
        </form>
        <button class="auth-link" type="button" data-auth="cancel">${t('auth_logout')}</button>`;

    case 'enroll':
      return html`<h1>${t('auth_enroll_title')}</h1>
        <p class="auth-hint">${t('auth_enroll_hint')}</p>
        ${screen.error ? html`<div class="auth-alert" role="alert">${screen.error}</div>` : ''}
        <img class="auth-qr" src="${screen.enrollment.qrCode}" alt="QR" width="180" height="180" />
        <p class="form-hint">${t('auth_enroll_secret')} <code class="auth-secret">${screen.enrollment.secret}</code></p>
        <form data-form="verify" novalidate>
          ${field(t('auth_code'), 'auth-code', codeInput())}
          <button class="btn btn-primary auth-submit" type="submit">${t('auth_verify')}</button>
        </form>
        <button class="auth-link" type="button" data-auth="cancel">${t('auth_logout')}</button>`;

    case 'link-error':
      return html`<h1>${t('auth_link_error_title')}</h1>
        <div class="auth-alert" role="alert">${t('auth_link_error_hint')}</div>
        <button class="btn btn-primary auth-submit" type="button" data-auth="login">${t('auth_back_login')}</button>`;
  }
}

const codeInput = (): SafeHtml =>
  html`<input id="auth-code" name="code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required />`;

/** Dibuja la pantalla y conecta sus eventos. Cada llamada sustituye por completo el contenido. */
export function renderAuthScreen(
  root: HTMLElement,
  screen: AuthScreen,
  lang: Lang,
  handlers: AuthHandlers,
  options: AuthViewOptions,
): void {
  setHtml(
    root,
    html`<div class="auth-shell">
      <div class="auth-card" data-screen="${screen.name}">
        <div class="auth-brand">
          <div class="sidebar-logo">加</div>
          <div><div class="auth-title">${t('brand')}</div><div class="auth-subtitle">HOME DIRECT</div></div>
        </div>
        ${body(screen, options)}
        <label class="auth-lang">
          <span>${t('auth_language')}</span>
          <select data-auth-lang aria-label="${t('auth_language')}">
            ${LANGS.map(l => html`<option value="${l}" ${l === lang ? 'selected' : ''}>${LANG_NAMES[l]}</option>`)}
          </select>
        </label>
      </div>
    </div>`,
  );

  const shell = root.querySelector<HTMLElement>('.auth-shell');
  if (!shell) return;

  shell.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const value = (name: string): string => {
      const v = data.get(name);
      return typeof v === 'string' ? v : '';
    };
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) {
      button.disabled = true;
      if (form.dataset.form === 'login') button.textContent = t('auth_signing_in');
    }
    switch (form.dataset.form) {
      case 'login':
        void handlers.login(value('username'), value('password'));
        break;
      case 'forgot':
        void handlers.forgot(value('identifier'));
        break;
      case 'set-password':
        void handlers.setPassword(value('password'), value('confirmation'));
        break;
      case 'verify':
        void handlers.verify(value('code').trim());
        break;
    }
  });

  shell.addEventListener('click', event => {
    const demoButton = (event.target as HTMLElement).closest<HTMLElement>('[data-demo-user]');
    if (demoButton && options.demo) {
      const form = shell.querySelector<HTMLFormElement>('form[data-form="login"]');
      const user = form?.querySelector<HTMLInputElement>('input[name="username"]');
      const password = form?.querySelector<HTMLInputElement>('input[name="password"]');
      if (user && password) {
        user.value = demoButton.dataset.demoUser ?? '';
        password.value = options.demo.password;
        password.focus();
      }
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-auth]');
    if (!target) return;
    const action = target.dataset.auth;
    if (action === 'forgot' || action === 'login') handlers.goto(action);
    else if (action === 'cancel') handlers.cancel();
  });

  shell.addEventListener('change', event => {
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>('[data-auth-lang]');
    if (select) handlers.changeLanguage(select.value as Lang);
  });

  // Tras un intento fallido se conserva el usuario y el foco pasa a la contraseña.
  const keptUser = screen.name === 'login' && screen.username;
  shell.querySelector<HTMLInputElement>(keptUser ? 'input[name="password"]' : 'input')?.focus();
}
