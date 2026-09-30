/**
 * Raíz de composición: autenticación y repositorios de la aplicación.
 * `@supabase/supabase-js` y los módulos que dependen de ella se cargan con `import()` (F8):
 * en modo demo (`memory`, el valor por defecto) nunca llegan a descargarse, así que el modo
 * demo no paga el peso de un cliente de Supabase que no usa.
 */
import { readConfig } from '../config/env';
import { createMemoryDirectory } from '../data/memory-directory';
import { createMemoryRepositories } from '../data/repositories/memory';
import type { Repositories } from '../data/repositories/types';
import { DEMO_PASSWORD } from '../data/seed/users';
import { createMemoryAuth } from '../features/auth/memory-auth';
import type { AuthService } from '../features/auth/auth-service';

/** Zona horaria de la organización; se actualiza al cargar la configuración. */
const context = { timeZone: 'America/Toronto' };

export const setTimeZone = (timeZone: string): void => {
  context.timeZone = timeZone;
};

export const config = readConfig(import.meta.env);

interface Services {
  auth: AuthService;
  repos: Repositories;
  /** Credenciales de ejemplo del login (solo modo demo). */
  demoHint: string | null;
}

async function createServices(): Promise<Services> {
  const timeZone = (): string => context.timeZone;

  if (config.dataSource === 'supabase' && config.supabase) {
    const [{ createBrowserClient }, { createSupabaseAuth }, { createSupabaseRepositories }] =
      await Promise.all([
        import('../config/supabase'),
        import('../features/auth/supabase-auth'),
        import('../data/repositories/supabase'),
      ]);
    const client = createBrowserClient(config.supabase.url, config.supabase.anonKey);
    return {
      auth: createSupabaseAuth(client),
      repos: createSupabaseRepositories(client, { timeZone }),
      demoHint: null,
    };
  }

  const directory = createMemoryDirectory(sessionStorage);
  const auth = createMemoryAuth(directory);
  return {
    auth,
    repos: createMemoryRepositories({
      directory,
      timeZone,
      currentUserId: () => auth.currentUserId() ?? '',
    }),
    demoHint: `zhuyan / liming / wangfang · ${DEMO_PASSWORD}`,
  };
}

export const { auth, repos, demoHint } = await createServices();
