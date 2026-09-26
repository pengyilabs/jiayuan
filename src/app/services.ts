/** Raíz de composición: autenticación y repositorios de la aplicación. */
import { readConfig } from '../config/env';
import { createBrowserClient } from '../config/supabase';
import { createMemoryDirectory } from '../data/memory-directory';
import { createMemoryRepositories } from '../data/repositories/memory';
import { createSupabaseRepositories } from '../data/repositories/supabase';
import type { Repositories } from '../data/repositories/types';
import { DEMO_PASSWORD } from '../data/seed/users';
import { createMemoryAuth } from '../features/auth/memory-auth';
import { createSupabaseAuth } from '../features/auth/supabase-auth';
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

function createServices(): Services {
  const timeZone = (): string => context.timeZone;

  if (config.dataSource === 'supabase' && config.supabase) {
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

export const { auth, repos, demoHint } = createServices();
