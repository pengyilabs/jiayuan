// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleSignIn } from '../../supabase/functions/_shared/sign-in.ts';
import { ORIGIN, createFake, post, record } from './fakes';

const body = async (res: Response): Promise<Record<string, unknown>> =>
  (await res.json()) as Record<string, unknown>;

describe('sign-in', () => {
  it('devuelve la sesión con usuario y contraseña correctos (usuario sin distinguir mayúsculas)', async () => {
    const fake = createFake();
    const res = await handleSignIn(
      post({ username: ' LiMing ', password: 'Correct-Horse-9' }),
      fake.deps,
    );
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ access_token: 'access', refresh_token: 'refresh' });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(fake.attempts).toEqual([{ key: 'liming', ip: null, success: true }]);
  });

  it('también acepta el correo como identificador', async () => {
    const fake = createFake();
    const res = await handleSignIn(
      post({ username: 'liming@example.test', password: 'Correct-Horse-9' }),
      fake.deps,
    );
    expect(res.status).toBe(200);
  });

  it('usuario inexistente y contraseña incorrecta dan exactamente el mismo error', async () => {
    const fake = createFake();
    const unknown = await handleSignIn(post({ username: 'nadie', password: 'x' }), fake.deps);
    const wrong = await handleSignIn(post({ username: 'liming', password: 'mala' }), fake.deps);
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    const [unknownBody, wrongBody] = [await body(unknown), await body(wrong)];
    expect(unknownBody).toEqual(wrongBody);
    expect(wrongBody).toEqual({ error: { code: 'invalid_credentials' } });
  });

  it('bloquea tras 5 fallos y no llega a comprobar la contraseña', async () => {
    const fake = createFake();
    for (let i = 0; i < 5; i++)
      await handleSignIn(post({ username: 'liming', password: 'mala' }), fake.deps);
    const res = await handleSignIn(
      post({ username: 'liming', password: 'Correct-Horse-9' }),
      fake.deps,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('900');
  });

  it('registra la IP del cliente', async () => {
    const fake = createFake();
    await handleSignIn(
      post({ username: 'x', password: 'y' }, { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }),
      fake.deps,
    );
    expect(fake.attempts[0]?.ip).toBe('203.0.113.7');
  });

  it('una cuenta desactivada con la contraseña correcta no recibe sesión y se revoca el token', async () => {
    const fake = createFake([record({ active: false })]);
    const res = await handleSignIn(
      post({ username: 'liming', password: 'Correct-Horse-9' }),
      fake.deps,
    );
    expect(res.status).toBe(403);
    expect(await body(res)).toEqual({ error: { code: 'account_disabled' } });
    expect(fake.calls).toContain('revokeSession');
  });

  it('un usuario bloqueado en Auth (ban) se informa como cuenta desactivada', async () => {
    const fake = createFake();
    fake.overrides.signIn = { ok: false, reason: 'banned' };
    expect(
      (await handleSignIn(post({ username: 'liming', password: 'x' }), fake.deps)).status,
    ).toBe(403);
  });

  it('un usuario con invitación pendiente no puede entrar', async () => {
    const fake = createFake([record({ confirmed: false })]);
    fake.overrides.signIn = { ok: false, reason: 'unconfirmed' };
    const res = await handleSignIn(post({ username: 'liming', password: 'x' }), fake.deps);
    expect(res.status).toBe(401);
  });

  it('un fallo de Auth es 502 y no cuenta como intento fallido', async () => {
    const fake = createFake();
    fake.overrides.signIn = { ok: false, reason: 'error' };
    expect(
      (await handleSignIn(post({ username: 'liming', password: 'x' }), fake.deps)).status,
    ).toBe(502);
    expect(fake.attempts).toHaveLength(0);
  });

  it('valida el cuerpo y el método', async () => {
    const fake = createFake();
    expect((await handleSignIn(post('no es json'), fake.deps)).status).toBe(400);
    expect((await handleSignIn(post({ username: 'a' }), fake.deps)).status).toBe(400);
    expect(
      (await handleSignIn(post({ username: 'a', password: 'x'.repeat(200) }), fake.deps)).status,
    ).toBe(400);
    expect((await handleSignIn(post({ username: 5, password: 'x' }), fake.deps)).status).toBe(400);
    const get = new Request('https://x.test', { method: 'GET' });
    expect((await handleSignIn(get, fake.deps)).status).toBe(405);
  });

  it('CORS: solo refleja orígenes autorizados y responde al preflight', async () => {
    const fake = createFake();
    const allowed = post({ username: 'x', password: 'y' }, { origin: ORIGIN });
    expect(
      (await handleSignIn(allowed, fake.deps)).headers.get('access-control-allow-origin'),
    ).toBe(ORIGIN);
    const foreign = post({ username: 'x', password: 'y' }, { origin: 'https://evil.test' });
    expect(
      (await handleSignIn(foreign, fake.deps)).headers.get('access-control-allow-origin'),
    ).toBeNull();

    const preflight = new Request('https://x.test', {
      method: 'OPTIONS',
      headers: { origin: ORIGIN },
    });
    const res = await handleSignIn(preflight, fake.deps);
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('un error inesperado devuelve 500 sin filtrar detalles', async () => {
    const fake = createFake();
    fake.deps.directory.findByUsername = () => Promise.reject(new Error('conexión secreta'));
    const res = await handleSignIn(post({ username: 'liming', password: 'x' }), fake.deps);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await body(res))).not.toContain('secreta');
  });
});
