// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { passwordIssues } from '../../supabase/functions/_shared/validation.ts';
import { CliError, createTechnician } from '../../scripts/lib/create-technician.ts';
import type { TechnicianPorts } from '../../scripts/lib/create-technician.ts';

function ports(overrides: Partial<TechnicianPorts> = {}): {
  ports: TechnicianPorts;
  log: string[];
} {
  const log: string[] = [];
  return {
    log,
    ports: {
      countTechnicians: () => Promise.resolve(0),
      createUser: ({ email }) => {
        log.push(`createUser:${email}`);
        return Promise.resolve({ id: 'tech-id' });
      },
      setTechnicianRole: id => {
        log.push(`setTechnicianRole:${id}`);
        return Promise.resolve();
      },
      deleteUser: id => {
        log.push(`deleteUser:${id}`);
        return Promise.resolve();
      },
      findUserIdByUsername: () => Promise.resolve(null),
      ...overrides,
    },
  };
}

const input = { email: 'Tech@HomeDirect.ca', username: 'RootTech', fullName: 'Técnico' };

describe('create-technician', () => {
  it('crea la cuenta con datos normalizados y una contraseña generada que cumple la política', async () => {
    const { ports: p, log } = ports();
    const result = await createTechnician(p, input);
    expect(result).toMatchObject({ userId: 'tech-id', username: 'roottech' });
    expect(passwordIssues(result.password, 'roottech')).toEqual([]);
    expect(result.password.length).toBeGreaterThanOrEqual(24);
    expect(log).toEqual(['createUser:tech@homedirect.ca', 'setTechnicianRole:tech-id']);
  });

  it('nunca acepta una contraseña propia: no existe ese parámetro en absoluto', () => {
    // A diferencia de create-admin, CreateTechnicianInput no tiene un campo `password` —
    // si algún día se añadiera por error, este test de tipos dejaría de compilar.
    type Keys = keyof Parameters<typeof createTechnician>[1];
    const keys: Keys[] = ['email', 'username', 'fullName', 'locale'];
    expect(keys).not.toContain('password');
  });

  it('las contraseñas generadas no se repiten entre llamadas', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = await createTechnician(ports().ports, input);
      seen.add(result.password);
    }
    expect(seen.size).toBe(50);
  });

  it('se niega si ya existe un técnico — no admite --force', async () => {
    const existing = ports({ countTechnicians: () => Promise.resolve(1) });
    await expect(createTechnician(existing.ports, input)).rejects.toThrow(/única/);
    expect(existing.log).toEqual([]);
  });

  it('se niega si el usuario ya existe', async () => {
    const dup = ports({ findUserIdByUsername: () => Promise.resolve('x') });
    await expect(createTechnician(dup.ports, input)).rejects.toThrow(/ya existe/);
    expect(dup.log).toEqual([]);
  });

  it('valida correo, usuario y nombre', async () => {
    for (const bad of [{ email: 'x' }, { username: 'a b' }, { fullName: ' ' }]) {
      await expect(createTechnician(ports().ports, { ...input, ...bad })).rejects.toBeInstanceOf(
        CliError,
      );
    }
  });

  it('si falla la asignación del rol elimina el usuario creado', async () => {
    const failing = ports({ setTechnicianRole: () => Promise.reject(new Error('boom')) });
    await expect(createTechnician(failing.ports, input)).rejects.toThrow('boom');
    expect(failing.log).toContain('deleteUser:tech-id');
  });
});
