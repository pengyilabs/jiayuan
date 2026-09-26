import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setState } from '../../src/app/state';
import type { Repositories } from '../../src/data/repositories/types';
import { AuthError } from '../../src/features/auth/auth-service';
import type { Assurance, AuthInit, AuthService } from '../../src/features/auth/auth-service';
import { SIGN_OUT_REASON_KEY, runAuthGate } from '../../src/features/auth/gate';
import type { Profile } from '../../src/types/models';

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'u1',
  username: 'zhuyan',
  fullName: '朱晏',
  email: 'z@example.test',
  role: 'admin',
  locale: 'en',
  active: true,
  status: 'active',
  lastSignInAt: null,
  ...overrides,
});

interface Setup {
  init?: Partial<AuthInit>;
  signedIn?: boolean;
  aal?: Assurance;
  factorId?: string | null;
  profile?: Profile | null;
  requireMfa?: boolean;
}

function build(setup: Setup = {}) {
  const state = {
    userId: setup.signedIn ? 'u1' : (null as string | null),
    aal: setup.aal ?? 'aal2',
  };
  const calls: string[] = [];
  const auth: AuthService = {
    init: () =>
      Promise.resolve({
        signedIn: state.userId !== null,
        flow: null,
        linkError: false,
        ...setup.init,
      }),
    currentUserId: () => state.userId,
    signIn(username, password) {
      calls.push(`signIn:${username}`);
      if (password !== 'Correct-Horse-9')
        return Promise.reject(new AuthError('invalid_credentials'));
      state.userId = 'u1';
      return Promise.resolve();
    },
    signOut() {
      calls.push('signOut');
      state.userId = null;
      return Promise.resolve();
    },
    setPassword(password) {
      calls.push(`setPassword:${password}`);
      state.userId = 'u1';
      return Promise.resolve();
    },
    requestPasswordReset(identifier) {
      calls.push(`reset:${identifier}`);
      return Promise.resolve();
    },
    onSignedOut: () => () => undefined,
    mfa: {
      assurance: () => Promise.resolve({ current: state.aal, next: 'aal2' }),
      verifiedFactorId: () => Promise.resolve(setup.factorId ?? null),
      enroll: () =>
        Promise.resolve({
          factorId: 'f-new',
          qrCode: 'data:image/svg+xml;utf-8,<svg/>',
          secret: 'JBSWY3DPEHPK3PXP',
        }),
      verify(factorId, code) {
        calls.push(`verify:${factorId}:${code}`);
        if (code !== '123456') return Promise.reject(new AuthError('code_invalid'));
        state.aal = 'aal2';
        return Promise.resolve();
      },
    },
  };
  const repos = {
    profiles: {
      current: () => Promise.resolve(setup.profile === undefined ? profile() : setup.profile),
    },
    catalog: {
      settings: () =>
        Promise.resolve({
          name: 'x',
          timezone: 'UTC',
          undoWindowSeconds: 8,
          deletedRetentionDays: 30,
          requireAdminMfa: setup.requireMfa ?? false,
        }),
    },
  } as unknown as Repositories;
  return { auth, repos, calls, state };
}

const root = (): HTMLElement => document.getElementById('root') as HTMLElement;
const screenName = (): string | undefined =>
  root().querySelector<HTMLElement>('.auth-card')?.dataset.screen;
const text = (): string => root().textContent ?? '';

function submit(form: string, values: Record<string, string>): void {
  const el = root().querySelector<HTMLFormElement>(`form[data-form="${form}"]`);
  if (!el) throw new Error(`No hay formulario ${form} (pantalla: ${String(screenName())})`);
  for (const [name, value] of Object.entries(values)) {
    (el.querySelector(`[name="${name}"]`) as HTMLInputElement).value = value;
  }
  el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
const click = (selector: string): void => {
  root().querySelector<HTMLElement>(selector)?.click();
};
const waitForScreen = (name: string): Promise<void> =>
  vi.waitFor(() => {
    expect(screenName()).toBe(name);
  });

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  setState({ lang: 'en' });
});

describe('puerta de acceso', () => {
  it('sin sesión muestra el login; un error de credenciales se muestra y permite reintentar', async () => {
    const { auth, repos } = build();
    const gate = runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('login');

    submit('login', { username: 'zhuyan', password: 'incorrecta' });
    await vi.waitFor(() => {
      expect(text()).toContain('Incorrect username or password.');
    });
    expect(screenName()).toBe('login');

    submit('login', { username: 'zhuyan', password: 'Correct-Horse-9' });
    await expect(gate).resolves.toMatchObject({ username: 'zhuyan' });
  });

  it('valida campos vacíos sin llamar al servidor y muestra las credenciales demo', async () => {
    const { auth, repos, calls } = build();
    void runAuthGate(root(), { auth, repos, demoHint: 'zhuyan · demo' });
    await waitForScreen('login');
    expect(text()).toContain('zhuyan · demo');
    submit('login', { username: '', password: '' });
    await vi.waitFor(() => {
      expect(text()).toContain('Please fill in all fields.');
    });
    expect(calls).toEqual([]);
  });

  it('con sesión válida entra directamente (empleado: sin MFA aunque la organización lo exija)', async () => {
    const { auth, repos } = build({
      signedIn: true,
      aal: 'aal1',
      requireMfa: true,
      profile: profile({ role: 'employee' }),
    });
    await expect(runAuthGate(root(), { auth, repos, demoHint: null })).resolves.toMatchObject({
      role: 'employee',
    });
  });

  it('administrador sin TOTP: fuerza el alta, rechaza un código incorrecto y entra con el correcto', async () => {
    const { auth, repos, calls } = build({ signedIn: true, aal: 'aal1', requireMfa: true });
    const gate = runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('enroll');
    expect(text()).toContain('JBSWY3DPEHPK3PXP');
    expect(root().querySelector('img.auth-qr')?.getAttribute('src')).toContain(
      'data:image/svg+xml',
    );

    submit('verify', { code: '000000' });
    await vi.waitFor(() => {
      expect(text()).toContain('Incorrect code. Try again.');
    });
    submit('verify', { code: '12ab' });
    await vi.waitFor(() => {
      expect(calls.filter(c => c.startsWith('verify')).length).toBe(1);
    });

    submit('verify', { code: '123456' });
    await expect(gate).resolves.toMatchObject({ role: 'admin' });
    expect(calls).toContain('verify:f-new:123456');
  });

  it('administrador con TOTP ya configurado: pide el código (AAL2) en cada inicio de sesión', async () => {
    const { auth, repos } = build({
      signedIn: true,
      aal: 'aal1',
      requireMfa: true,
      factorId: 'f-1',
    });
    const gate = runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('mfa');
    submit('verify', { code: '123456' });
    await expect(gate).resolves.toBeDefined();
  });

  it('sin exigencia de MFA (modo demo) el administrador entra con AAL1', async () => {
    const { auth, repos } = build({ signedIn: true, aal: 'aal1', requireMfa: false });
    await expect(runAuthGate(root(), { auth, repos, demoHint: null })).resolves.toBeDefined();
  });

  it('una cuenta desactivada o sin perfil no entra y se cierra la sesión', async () => {
    for (const [p, message] of [
      [profile({ active: false }), 'deactivated'],
      [null, 'no access'],
    ] as const) {
      document.body.innerHTML = '<div id="root"></div>';
      const { auth, repos, calls } = build({ signedIn: true, profile: p });
      void runAuthGate(root(), { auth, repos, demoHint: null });
      await waitForScreen('login');
      expect(text().toLowerCase()).toContain(message);
      expect(calls).toContain('signOut');
    }
  });

  it('invitación: define la contraseña (con validaciones) y entra', async () => {
    const { auth, repos, calls } = build({ signedIn: true, init: { flow: 'invite' } });
    window.history.replaceState(null, '', '/accept-invite');
    const gate = runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('set-password');
    expect(text()).toContain('Welcome!');

    submit('set-password', { password: 'Correct-Horse-9', confirmation: 'Otra-Distinta-9' });
    await vi.waitFor(() => {
      expect(text()).toContain("The passwords don't match.");
    });
    submit('set-password', { password: 'corta', confirmation: 'corta' });
    await vi.waitFor(() => {
      expect(text()).toContain('does not meet the requirements');
    });
    expect(calls).toEqual([]);

    submit('set-password', { password: 'Correct-Horse-9', confirmation: 'Correct-Horse-9' });
    await expect(gate).resolves.toBeDefined();
    expect(calls).toEqual(['setPassword:Correct-Horse-9']);
    expect(window.location.pathname).toBe('/'); // sale de la URL del enlace
  });

  it('enlace caducado: muestra el error y permite volver al login', async () => {
    const { auth, repos } = build({ init: { flow: 'invite', linkError: true } });
    void runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('link-error');
    click('[data-auth="login"]');
    await waitForScreen('login');
  });

  it('recuperación de contraseña: respuesta genérica y sin llamar antes de tiempo', async () => {
    const { auth, repos, calls } = build();
    void runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('login');
    click('[data-auth="forgot"]');
    await waitForScreen('forgot');
    submit('forgot', { identifier: 'liming' });
    await waitForScreen('forgot-sent');
    expect(calls).toEqual(['reset:liming']);
    expect(text()).toContain('If the account exists');
  });

  it('avisa cuando la sesión anterior caducó por inactividad', async () => {
    sessionStorage.setItem(SIGN_OUT_REASON_KEY, 'idle');
    const { auth, repos } = build();
    void runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('login');
    expect(text()).toContain('inactivity');
  });

  it('cambiar de idioma traduce la pantalla', async () => {
    const { auth, repos } = build();
    void runAuthGate(root(), { auth, repos, demoHint: null });
    await waitForScreen('login');
    const select = root().querySelector<HTMLSelectElement>('[data-auth-lang]');
    if (!select) throw new Error('sin selector de idioma');
    select.value = 'fr';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(text()).toContain('Mot de passe');
  });
});
