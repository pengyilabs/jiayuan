// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleInviteUser } from '../../supabase/functions/_shared/invite-user.ts';
import { handleRequestReset } from '../../supabase/functions/_shared/request-reset.ts';
import { handleSyncUserAccess } from '../../supabase/functions/_shared/sync-user-access.ts';
import { ORIGIN, createFake, post, record } from './fakes';

const admin = { authorization: 'Bearer admin-jwt' };
const valid = {
  email: 'Nuevo@Example.test',
  username: 'Nuevo',
  fullName: ' Nuevo Agente ',
  role: 'employee',
  locale: 'fr',
};
const code = async (res: Response): Promise<unknown> =>
  ((await res.json()) as { error?: { code: string } }).error?.code;

describe('invite-user', () => {
  it('exige sesión y rol de administrador', async () => {
    const fake = createFake();
    expect((await handleInviteUser(post(valid), fake.deps)).status).toBe(401);
    const employee = await handleInviteUser(
      post(valid, { authorization: 'Bearer employee-jwt' }),
      fake.deps,
    );
    expect(employee.status).toBe(403);
    expect(fake.calls).toHaveLength(0);
  });

  it('invita normalizando datos y apuntando al enlace de aceptación', async () => {
    const fake = createFake();
    const res = await handleInviteUser(post(valid, admin), fake.deps);
    expect(res.status).toBe(201);
    expect(fake.calls).toEqual([`invite:nuevo@example.test:${ORIGIN}/accept-invite`]);
    const { user } = (await res.json()) as { user: Record<string, string> };
    expect(user).toMatchObject({
      email: 'nuevo@example.test',
      username: 'nuevo',
      fullName: 'Nuevo Agente',
      role: 'employee',
    });
  });

  it('un rol de administrador se asigna con la identidad de quien invita', async () => {
    const fake = createFake();
    const res = await handleInviteUser(post({ ...valid, role: 'admin' }, admin), fake.deps);
    expect(res.status).toBe(201);
    expect(fake.calls.some(c => c.startsWith('setRole:') && c.endsWith(':admin'))).toBe(true);
  });

  it('si falla la asignación de rol se revierte la invitación', async () => {
    const fake = createFake();
    fake.overrides.setRoleOk = false;
    const res = await handleInviteUser(post({ ...valid, role: 'admin' }, admin), fake.deps);
    expect(res.status).toBe(500);
    expect(await code(res)).toBe('role_assignment_failed');
    expect(fake.calls.some(c => c.startsWith('deleteUser:'))).toBe(true);
    expect(fake.users).toHaveLength(1);
  });

  it('rechaza usuarios y correos ya usados', async () => {
    const fake = createFake();
    const dupUser = await handleInviteUser(
      post({ ...valid, username: 'LIMING' }, admin),
      fake.deps,
    );
    expect([dupUser.status, await code(dupUser)]).toEqual([409, 'username_taken']);
    const dupMail = await handleInviteUser(
      post({ ...valid, email: 'liming@example.test' }, admin),
      fake.deps,
    );
    expect([dupMail.status, await code(dupMail)]).toEqual([409, 'email_taken']);
    expect(fake.calls).toHaveLength(0);
  });

  it('detecta la carrera de nombres de usuario (el trigger añadió un sufijo) y revierte', async () => {
    const fake = createFake();
    fake.overrides.renameOnCreate = 'nuevo1';
    const res = await handleInviteUser(post(valid, admin), fake.deps);
    expect([res.status, await code(res)]).toEqual([409, 'username_taken']);
    expect(fake.calls.some(c => c.startsWith('deleteUser:'))).toBe(true);
  });

  it('valida los campos', async () => {
    const fake = createFake();
    const bad = async (patch: Record<string, unknown>): Promise<[number, unknown]> => {
      const res = await handleInviteUser(post({ ...valid, ...patch }, admin), fake.deps);
      return [res.status, await code(res)];
    };
    expect(await bad({ email: 'no-es-correo' })).toEqual([400, 'invalid_email']);
    expect(await bad({ username: 'a b' })).toEqual([400, 'invalid_username']);
    expect(await bad({ username: 'ab' })).toEqual([400, 'invalid_username']);
    expect(await bad({ role: 'superadmin' })).toEqual([400, 'invalid_request']);
    expect(await bad({ locale: 'de' })).toEqual([400, 'invalid_request']);
    expect(await bad({ fullName: '   ' })).toEqual([400, 'invalid_request']);
    expect(fake.calls).toHaveLength(0);
  });

  it('reenvía solo invitaciones pendientes', async () => {
    const pending = record({
      id: '00000000-0000-4000-8000-0000000000b1',
      email: 'p@example.test',
      username: 'pend',
      confirmed: false,
    });
    const fake = createFake([record(), pending]);
    const ok = await handleInviteUser(
      post({ action: 'resend', userId: pending.id }, admin),
      fake.deps,
    );
    expect(ok.status).toBe(200);
    expect(fake.calls).toEqual([`invite:p@example.test:${ORIGIN}/accept-invite`]);

    const accepted = await handleInviteUser(
      post({ action: 'resend', userId: record().id }, admin),
      fake.deps,
    );
    expect([accepted.status, await code(accepted)]).toEqual([409, 'already_accepted']);
    const missing = await handleInviteUser(
      post({ action: 'resend', userId: '00000000-0000-4000-8000-00000000ffff' }, admin),
      fake.deps,
    );
    expect(missing.status).toBe(404);
    expect(
      (await handleInviteUser(post({ action: 'resend', userId: 'x' }, admin), fake.deps)).status,
    ).toBe(400);
  });
});

describe('sync-user-access', () => {
  it('bloquea o desbloquea según profiles.active (no según lo que envíe el cliente)', async () => {
    const off = record({ active: false });
    const fake = createFake([off]);
    const res = await handleSyncUserAccess(
      post({ userId: off.id, banned: false }, admin),
      fake.deps,
    );
    expect(await res.json()).toEqual({ ok: true, banned: true });
    expect(fake.banned.has(off.id)).toBe(true);

    off.active = true;
    await handleSyncUserAccess(post({ userId: off.id }, admin), fake.deps);
    expect(fake.banned.has(off.id)).toBe(false);
  });

  it('solo administradores; usuario inexistente → 404', async () => {
    const fake = createFake();
    const id = record().id;
    expect((await handleSyncUserAccess(post({ userId: id }), fake.deps)).status).toBe(401);
    expect(
      (await handleSyncUserAccess(post({ userId: id }, { authorization: 'Bearer x' }), fake.deps))
        .status,
    ).toBe(403);
    expect(
      (
        await handleSyncUserAccess(
          post({ userId: '00000000-0000-4000-8000-00000000ffff' }, admin),
          fake.deps,
        )
      ).status,
    ).toBe(404);
  });
});

describe('request-password-reset', () => {
  it('responde igual exista o no la cuenta y solo envía el correo si procede', async () => {
    const fake = createFake([
      record(),
      record({
        id: '00000000-0000-4000-8000-0000000000c1',
        email: 'off@example.test',
        username: 'off',
        active: false,
      }),
      record({
        id: '00000000-0000-4000-8000-0000000000c2',
        email: 'p@example.test',
        username: 'pend',
        confirmed: false,
      }),
    ]);
    const results: unknown[] = [];
    for (const identifier of ['liming', 'LIMING@example.test', 'nadie', 'off', 'pend']) {
      const res = await handleRequestReset(post({ identifier }), fake.deps);
      results.push([res.status, await res.json()]);
    }
    expect(new Set(results.map(r => JSON.stringify(r))).size).toBe(1);
    expect(fake.calls).toEqual([
      `recovery:liming@example.test:${ORIGIN}/reset-password`,
      `recovery:liming@example.test:${ORIGIN}/reset-password`,
    ]);
  });

  it('limita las solicitudes por cuenta', async () => {
    const fake = createFake();
    for (let i = 0; i < 5; i++) await handleRequestReset(post({ identifier: 'liming' }), fake.deps);
    const res = await handleRequestReset(post({ identifier: 'liming' }), fake.deps);
    expect(res.status).toBe(429);
    expect(fake.calls).toHaveLength(5);
  });
});
