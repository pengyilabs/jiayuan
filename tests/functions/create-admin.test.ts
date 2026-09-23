// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { passwordIssues } from '../../supabase/functions/_shared/validation.ts';
import {
  CliError,
  createFirstAdmin,
  generatePassword,
  resetMfa,
} from '../../scripts/lib/create-admin.ts';
import type { AdminPorts } from '../../scripts/lib/create-admin.ts';

function ports(overrides: Partial<AdminPorts> = {}): { ports: AdminPorts; log: string[] } {
  const log: string[] = [];
  return {
    log,
    ports: {
      countActiveAdmins: () => Promise.resolve(0),
      createUser: ({ email }) => {
        log.push(`createUser:${email}`);
        return Promise.resolve({ id: 'new-id' });
      },
      setAdminRole: id => {
        log.push(`setAdminRole:${id}`);
        return Promise.resolve();
      },
      deleteUser: id => {
        log.push(`deleteUser:${id}`);
        return Promise.resolve();
      },
      findUserIdByUsername: () => Promise.resolve(null),
      listFactorIds: () => Promise.resolve(['f1', 'f2']),
      deleteFactor: (_u, f) => {
        log.push(`deleteFactor:${f}`);
        return Promise.resolve();
      },
      ...overrides,
    },
  };
}

const input = { email: 'Zhu@HomeDirect.ca', username: 'ZhuYan', fullName: '朱晏' };

describe('create-admin', () => {
  it('crea el administrador con datos normalizados y genera una contraseña válida', async () => {
    const { ports: p, log } = ports();
    const result = await createFirstAdmin(p, input);
    expect(result).toMatchObject({ userId: 'new-id', username: 'zhuyan', generated: true });
    expect(passwordIssues(result.password, 'zhuyan')).toEqual([]);
    expect(log).toEqual(['createUser:zhu@homedirect.ca', 'setAdminRole:new-id']);
  });

  it('acepta una contraseña propia solo si cumple la política', async () => {
    await expect(createFirstAdmin(ports().ports, { ...input, password: 'corta' })).rejects.toThrow(
      /política/,
    );
    const ok = await createFirstAdmin(ports().ports, { ...input, password: 'Correct-Horse-9' });
    expect(ok).toMatchObject({ password: 'Correct-Horse-9', generated: false });
  });

  it('se niega si ya hay un administrador (salvo --force) o el usuario existe', async () => {
    const existing = ports({ countActiveAdmins: () => Promise.resolve(1) });
    await expect(createFirstAdmin(existing.ports, input)).rejects.toThrow(
      /Ya existe un administrador/,
    );
    await expect(
      createFirstAdmin(existing.ports, { ...input, force: true }),
    ).resolves.toBeDefined();
    const dup = ports({ findUserIdByUsername: () => Promise.resolve('x') });
    await expect(createFirstAdmin(dup.ports, input)).rejects.toThrow(/ya existe/);
    expect(dup.log).toEqual([]);
  });

  it('valida correo, usuario y nombre', async () => {
    for (const bad of [{ email: 'x' }, { username: 'a b' }, { fullName: ' ' }]) {
      await expect(createFirstAdmin(ports().ports, { ...input, ...bad })).rejects.toBeInstanceOf(
        CliError,
      );
    }
  });

  it('si falla la asignación del rol elimina el usuario creado', async () => {
    const failing = ports({ setAdminRole: () => Promise.reject(new Error('boom')) });
    await expect(createFirstAdmin(failing.ports, input)).rejects.toThrow('boom');
    expect(failing.log).toContain('deleteUser:new-id');
  });

  it('las contraseñas generadas cumplen la política y no se repiten', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const password = generatePassword();
      expect(passwordIssues(password)).toEqual([]);
      seen.add(password);
    }
    expect(seen.size).toBe(200);
  });

  it('reset-mfa elimina todos los factores del usuario', async () => {
    const { ports: p, log } = ports({ findUserIdByUsername: () => Promise.resolve('u1') });
    expect(await resetMfa(p, ' ZhuYan ')).toBe(2);
    expect(log).toEqual(['deleteFactor:f1', 'deleteFactor:f2']);
    await expect(resetMfa(ports().ports, 'nadie')).rejects.toThrow(/No existe/);
  });
});
