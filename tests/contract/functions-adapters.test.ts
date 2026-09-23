// @vitest-environment node
/**
 * Adaptadores de las Edge Functions contra Postgres + RLS + PostgREST reales: directorio de
 * perfiles, límites de intentos y comprobación de administrador con MFA (claim `aal` del JWT).
 * Las operaciones contra Supabase Auth (GoTrue) no se cubren aquí: ver docs/F2.md.
 */
import { SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDeps } from '../../supabase/functions/_shared/adapters.ts';
import type { AuthDeps } from '../../supabase/functions/_shared/ports.ts';

const url = process.env.SUPABASE_TEST_URL;
const secret = process.env.SUPABASE_TEST_JWT_SECRET;

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const LIMING = '00000000-0000-4000-8000-0000000000a2';

if (!url || !secret) {
  describe.skip('adaptadores de funciones (defina SUPABASE_TEST_URL para ejecutarlos)', () =>
    undefined);
} else {
  const sign = (claims: Record<string, unknown>, sub?: string): Promise<string> => {
    const jwt = new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h');
    return (sub ? jwt.setSubject(sub) : jwt).sign(new TextEncoder().encode(secret));
  };

  let deps: AuthDeps;
  let serviceKey: string;
  let adminAal1: string;
  let adminAal2: string;
  let limingToken: string;

  const rest = (path: string, init: RequestInit): Promise<Response> =>
    fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

  beforeAll(async () => {
    serviceKey = await sign({ role: 'service_role' });
    adminAal1 = await sign({ role: 'authenticated', aal: 'aal1' }, ADMIN);
    adminAal2 = await sign({ role: 'authenticated', aal: 'aal2' }, ADMIN);
    limingToken = await sign({ role: 'authenticated', aal: 'aal2' }, LIMING);
    deps = createDeps({
      SUPABASE_URL: url,
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      SITE_URL: 'https://app.example.test',
    });
  });

  describe('adaptadores de funciones · supabase', () => {
    it('busca perfiles por usuario (sin distinguir mayúsculas), correo e id', async () => {
      const byUser = await deps.directory.findByUsername('LiMing');
      expect(byUser).toMatchObject({
        id: LIMING,
        username: 'liming',
        role: 'employee',
        active: true,
        confirmed: true,
      });
      expect((await deps.directory.findByEmail('LIMING@homedirect.ca'))?.id).toBe(LIMING);
      expect((await deps.directory.findById(LIMING))?.email).toBe('liming@homedirect.ca');
      expect(await deps.directory.findByUsername('nadie')).toBeNull();
    });

    it('limita los intentos fallidos por usuario y los limpia con un acceso correcto', async () => {
      const key = `it-${Date.now().toString()}`;
      expect(await deps.directory.signInAllowed(key, '198.51.100.9')).toBe(true);
      for (let i = 0; i < 5; i++) await deps.directory.recordAttempt(key, '198.51.100.9', false);
      expect(await deps.directory.signInAllowed(key, '198.51.100.9')).toBe(false);
      expect(await deps.directory.signInAllowed(key.toUpperCase(), null)).toBe(false);
      await deps.directory.recordAttempt(key, '198.51.100.9', true);
      expect(await deps.directory.signInAllowed(key, '198.51.100.9')).toBe(true);
    });

    it('la tabla de intentos no es accesible con credenciales de usuario', async () => {
      const res = await fetch(`${url}/rest/v1/sign_in_attempts?select=*`, {
        headers: { apikey: 'test-anon-key', Authorization: `Bearer ${adminAal2}` },
      });
      expect(res.status).toBe(403);
    });

    it('con MFA obligatorio, un administrador AAL1 no es administrador; con AAL2 sí; un empleado nunca', async () => {
      const setMfa = (value: boolean): Promise<Response> =>
        rest('organization_settings?id=eq.true', {
          method: 'PATCH',
          body: JSON.stringify({ require_admin_mfa: value }),
        });
      expect((await setMfa(true)).ok).toBe(true);
      try {
        expect(await deps.caller.isAdmin(adminAal1)).toBe(false);
        expect(await deps.caller.isAdmin(adminAal2)).toBe(true);
        expect(await deps.caller.isAdmin(limingToken)).toBe(false);
        // Sin sesión AAL2 no se puede asignar el rol de administrador.
        expect(await deps.caller.setRole(adminAal1, LIMING, 'admin')).toBe(false);
      } finally {
        await setMfa(false);
      }
    });

    it('setRole con la identidad del administrador cambia el rol (y la RLS impide hacerlo a un empleado)', async () => {
      expect(await deps.caller.setRole(limingToken, LIMING, 'admin')).toBe(false);
      expect(await deps.caller.setRole(adminAal2, LIMING, 'admin')).toBe(true);
      expect((await deps.directory.findById(LIMING))?.role).toBe('admin');
      expect(await deps.caller.setRole(adminAal2, LIMING, 'employee')).toBe(true);
    });
  });
}
