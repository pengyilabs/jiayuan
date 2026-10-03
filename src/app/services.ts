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
import { createMemoryAuth } from '../features/auth/memory-auth';
import type { AuthService } from '../features/auth/auth-service';
import { buildDemoInfo } from '../features/auth/demo';
import type { DemoInfo } from '../features/auth/demo';

/** Zona horaria de la organización; se actualiza al cargar la configuración. */
const context = { timeZone: 'America/Toronto' };

export const setTimeZone = (timeZone: string): void => {
  context.timeZone = timeZone;
};

export const config = readConfig(import.meta.env);

interface Services {
  auth: AuthService;
  repos: Repositories;
  /** Cuentas y contraseña por defecto (solo modo demo; `null` con backend real). */
  demoInfo: DemoInfo | null;
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
      demoInfo: null,
    };
  }

  const directory = createMemoryDirectory(localStorage);
  const auth = createMemoryAuth(directory);
  return {
    auth,
    repos: createMemoryRepositories({
      directory,
      timeZone,
      currentUserId: () => auth.currentUserId() ?? '',
    }),
    demoInfo: buildDemoInfo(),
  };
}

export const { auth, repos, demoInfo } = await createServices();
