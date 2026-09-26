// @vitest-environment node
import { ADMIN_ID } from '../../src/data/seed/users';
import { createMemoryRepositories } from '../../src/data/repositories/memory';
import type { Repositories } from '../../src/data/repositories/types';
import { defineRepositoryContract } from './repositories.contract';

// Un único almacén en memoria compartido; cada llamada actúa "como" un usuario distinto.
let actor = ADMIN_ID;
const shared = createMemoryRepositories({ currentUserId: () => actor });

/** Envuelve el repositorio para que cada operación se ejecute con la identidad indicada. */
function actingAs<T extends object>(target: T, userId: string): T {
  return new Proxy(target, {
    get(obj, key) {
      const value = Reflect.get(obj, key) as unknown;
      if (typeof value === 'function') {
        return (...args: unknown[]): unknown => {
          actor = userId;
          return (value as (...a: unknown[]) => unknown).apply(obj, args);
        };
      }
      if (value && typeof value === 'object') return actingAs(value, userId);
      return value;
    },
  });
}

defineRepositoryContract('memoria', userId => actingAs<Repositories>(shared, userId));
