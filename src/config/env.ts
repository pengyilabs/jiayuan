/** Configuración de entorno validada (variables `VITE_*`). */

export type DataSource = 'memory' | 'supabase';

export interface AppConfig {
  dataSource: DataSource;
  supabase?: { url: string; anonKey: string };
}

type RawEnv = Readonly<Record<string, string | undefined>>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * - `VITE_DATA_SOURCE=memory` (por defecto): datos de demostración en memoria, sin backend.
 * - `VITE_DATA_SOURCE=supabase`: requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
 *
 * La clave `anon` es pública por diseño (la seguridad la impone RLS); nunca pongas aquí la
 * clave `service_role`.
 */
export function readConfig(env: RawEnv): AppConfig {
  const source = env.VITE_DATA_SOURCE?.trim() || 'memory';
  if (source !== 'memory' && source !== 'supabase') {
    throw new ConfigError(
      `VITE_DATA_SOURCE debe ser "memory" o "supabase" (recibido: "${source}")`,
    );
  }
  if (source === 'memory') return { dataSource: 'memory' };

  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new ConfigError(
      'Con VITE_DATA_SOURCE=supabase se requieren VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY',
    );
  }
  try {
    new URL(url);
  } catch {
    throw new ConfigError(`VITE_SUPABASE_URL no es una URL válida: "${url}"`);
  }
  if (anonKey.split('.').length === 3 && isServiceRoleKey(anonKey)) {
    throw new ConfigError(
      'VITE_SUPABASE_ANON_KEY contiene una clave service_role: nunca la expongas en el navegador',
    );
  }
  return { dataSource: 'supabase', supabase: { url, anonKey } };
}

/** Detecta una clave JWT con `role: service_role` (error de configuración grave). */
function isServiceRoleKey(key: string): boolean {
  try {
    const payload = JSON.parse(
      atob(key.split('.')[1]?.replaceAll('-', '+').replaceAll('_', '/') ?? ''),
    ) as {
      role?: string;
    };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}
