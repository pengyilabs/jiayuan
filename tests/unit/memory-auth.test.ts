import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDirectory } from '../../src/data/memory-directory';
import { createMemoryRepositories } from '../../src/data/repositories/memory';
import { ADMIN_ID, DEMO_PASSWORD } from '../../src/data/seed/users';
import { AuthError } from '../../src/features/auth/auth-service';
import { SESSION_TTL_MS, createMemoryAuth } from '../../src/features/auth/memory-auth';

const code = async (promise: Promise<unknown>): Promise<string> =>
  promise.then(
    () => 'ok',
    (error: unknown) => (error instanceof AuthError ? error.code : 'other'),
  );

describe('autenticación en memoria (modo demo)', () => {
  let directory = createMemoryDirectory();
  let auth = createMemoryAuth(directory, sessionStorage);

  afterEach(() => {
    localStorage.clear();
  });

  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    directory = createMemoryDirectory();
    auth = createMemoryAuth(directory, sessionStorage);
  });

  it('inicia sesión con usuario (sin distinguir mayúsculas) o correo, y persiste la sesión', async () => {
    expect(await code(auth.signIn(' ZhuYan ', DEMO_PASSWORD))).toBe('ok');
    expect(auth.currentUserId()).toBe(ADMIN_ID);
    expect(await createMemoryAuth(directory, sessionStorage).init()).toMatchObject({
      signedIn: true,
    });

    await auth.signOut();
    expect(auth.currentUserId()).toBeNull();
    expect(await code(auth.signIn('zhuyan@homedirect.ca', DEMO_PASSWORD))).toBe('ok');
  });

  it('la sesión sobrevive al cierre de la pestaña (localStorage) hasta que caduca a los 7 días', async () => {
    // Otra "pestaña": mismo localStorage, instancias nuevas, y sessionStorage vacío.
    localStorage.clear();
    const first = createMemoryAuth(directory, localStorage);
    await first.signIn('liming', DEMO_PASSWORD);

    sessionStorage.clear(); // cerrar la pestaña borra sessionStorage, no localStorage
    const reopened = createMemoryAuth(directory, localStorage);
    expect((await reopened.init()).signedIn).toBe(true);

    vi.useFakeTimers({ now: Date.now() + SESSION_TTL_MS + 1000 });
    try {
      const expired = createMemoryAuth(directory, localStorage);
      expect((await expired.init()).signedIn).toBe(false);
      expect(localStorage.getItem('proppulse.demo.session')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cerrar sesión borra la sesión persistida', async () => {
    localStorage.clear();
    const a = createMemoryAuth(directory, localStorage);
    await a.signIn('liming', DEMO_PASSWORD);
    await a.signOut();
    expect((await createMemoryAuth(directory, localStorage).init()).signedIn).toBe(false);
  });

  it('rechaza credenciales incorrectas con el mismo error y bloquea tras 5 fallos', async () => {
    expect(await code(auth.signIn('nadie', 'x'))).toBe('invalid_credentials');
    expect(await code(auth.signIn('liming', 'mala'))).toBe('invalid_credentials');
    for (let i = 0; i < 3; i++) await code(auth.signIn('liming', 'mala'));
    expect(await code(auth.signIn('liming', 'mala'))).toBe('invalid_credentials'); // 5.º fallo
    expect(await code(auth.signIn('liming', DEMO_PASSWORD))).toBe('too_many_attempts');
  });

  it('una cuenta desactivada no entra; una invitación pendiente tampoco', async () => {
    const repos = createMemoryRepositories({ directory, currentUserId: () => ADMIN_ID });
    await repos.profiles.setActive('00000000-0000-4000-8000-0000000000a3', false);
    expect(await code(auth.signIn('wangfang', DEMO_PASSWORD))).toBe('account_disabled');

    await repos.profiles.invite({
      email: 'n@example.test',
      username: 'nuevo',
      fullName: 'Nuevo',
      role: 'employee',
      locale: 'en',
    });
    expect(await code(auth.signIn('nuevo', DEMO_PASSWORD))).toBe('invalid_credentials');
  });

  it('flujo de invitación: enlace → definir contraseña → sesión iniciada', async () => {
    const repos = createMemoryRepositories({ directory, currentUserId: () => ADMIN_ID });
    const { profile, devLink } = await repos.profiles.invite({
      email: 'nuevo@example.test',
      username: 'nuevo',
      fullName: 'Nuevo',
      role: 'employee',
      locale: 'fr',
    });
    expect(profile.status).toBe('invited');
    if (!devLink) throw new Error('el modo demo debe devolver el enlace');

    window.history.replaceState(null, '', devLink);
    const init = await auth.init();
    expect(init).toEqual({ signedIn: true, flow: 'invite', linkError: false });

    expect(await code(auth.setPassword('corta'))).toBe('password_weak');
    expect(await code(auth.setPassword('Contraseña-Segura-1'))).toBe('ok');
    expect(auth.currentUserId()).toBe(profile.id);

    // El enlace es de un solo uso y el usuario ya puede iniciar sesión.
    expect((await createMemoryAuth(directory, sessionStorage).init()).linkError).toBe(true);
    await auth.signOut();
    expect(await code(auth.signIn('nuevo', 'Contraseña-Segura-1'))).toBe('ok');
    expect((await repos.profiles.list()).find(p => p.id === profile.id)?.status).toBe('active');
  });

  it('un enlace de invitación inválido se informa como error de enlace', async () => {
    window.history.replaceState(null, '', '/accept-invite?invite=inventado');
    expect(await auth.init()).toEqual({ signedIn: false, flow: 'invite', linkError: true });
  });

  it('las invitaciones validan usuario y correo duplicados y el formato', async () => {
    const repos = createMemoryRepositories({ directory, currentUserId: () => ADMIN_ID });
    const base = { fullName: 'X', role: 'employee', locale: 'en' } as const;
    const codeOf = (input: { email: string; username: string }): Promise<string | undefined> =>
      repos.profiles.invite({ ...base, ...input }).then(
        () => undefined,
        (e: { code?: string }) => e.code,
      );
    expect(await codeOf({ email: 'a@b.co', username: 'LIMING' })).toBe('username_taken');
    expect(await codeOf({ email: 'Liming@HomeDirect.ca', username: 'otro' })).toBe('email_taken');
    expect(await codeOf({ email: 'mal', username: 'otro' })).toBe('invalid_email');
    expect(await codeOf({ email: 'a@b.co', username: 'o' })).toBe('invalid_username');
  });
});
