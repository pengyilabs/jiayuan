/**
 * "Directorio" de usuarios del modo demo (sin backend): perfiles, contraseñas e invitaciones.
 * Lo comparten el servicio de autenticación en memoria y los repositorios en memoria.
 */
import type { Tables } from '../types/db';
import { DEMO_PASSWORD, demoUsersSeed } from './seed/users';

const EPOCH = '2026-08-01T00:00:00.000Z';

export interface MemoryDirectory {
  profiles: Tables<'profiles'>[];
  /** Contraseñas en claro: solo para la demo; el backend real nunca las guarda así. */
  passwords: Map<string, string>;
  /** token de invitación → id de usuario. */
  invites: Map<string, string>;
}

const STORAGE_KEY = 'proppulse.demo.directory';

interface Persisted {
  profiles: Tables<'profiles'>[];
  passwords: [string, string][];
  invites: [string, string][];
}

/**
 * Crea el directorio con los usuarios demo. Si se indica `storage`, lo recupera al recargar la
 * página y lo guarda al abandonarla (las invitaciones por enlace atraviesan una navegación).
 */
export function createMemoryDirectory(storage?: Storage): MemoryDirectory {
  const directory = seedDirectory();
  if (!storage) return directory;

  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved) as Persisted;
      directory.profiles.splice(0, directory.profiles.length, ...data.profiles);
      directory.passwords = new Map(data.passwords);
      directory.invites = new Map(data.invites);
    }
  } catch {
    // datos corruptos: se parte de la semilla
  }

  const save = (): void => {
    const data: Persisted = {
      profiles: directory.profiles,
      passwords: [...directory.passwords],
      invites: [...directory.invites],
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  };
  window.addEventListener('pagehide', save);
  return directory;
}

function seedDirectory(): MemoryDirectory {
  return {
    profiles: demoUsersSeed.map(u => ({
      id: u.id,
      username: u.username,
      full_name: u.fullName,
      email: u.email,
      role: u.role,
      locale: u.locale,
      avatar_url: null,
      active: true,
      invited_at: null,
      confirmed_at: EPOCH,
      last_sign_in_at: null,
      created_at: EPOCH,
      updated_at: EPOCH,
    })),
    passwords: new Map(demoUsersSeed.map(u => [u.id, DEMO_PASSWORD])),
    invites: new Map(),
  };
}
